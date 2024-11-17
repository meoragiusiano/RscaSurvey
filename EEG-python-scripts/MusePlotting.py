from pylsl import StreamInlet, resolve_byprop
import numpy as np
from scipy.signal import butter, lfilter
import matplotlib.pyplot as plt
import csv
import time

# Resolve EEG stream by type
streams = resolve_byprop('type', 'EEG', timeout=2)
if streams:
    print("Muse EEG stream found.")
    inlet = StreamInlet(streams[0])
else:
    print("No EEG stream found. Ensure Muse is connected and streaming via BlueMuse.")
    exit()

fs = 256  
buffer_size = 256 * 5 
channels = ["Channel 1", "Channel 2", "Channel 3", "Channel 4"]


BANDS = {
    "Delta": (1, 4),
    "Theta": (4, 8),
    "Alpha": (8, 13),
    "Beta": (13, 30)
}


def bandpass_filter(data, lowcut, highcut, fs, order=4):
    nyquist = 0.5 * fs
    low = lowcut / nyquist
    high = highcut / nyquist
    b, a = butter(order, [low, high], btype='band')
    y = lfilter(b, a, data)
    # print(f"Applying {lowcut}-{highcut} Hz filter: input={data} output={y}") 
    return y


raw_buffers = {channel: np.full(buffer_size, np.nan) for channel in channels}
filtered_buffers = {band: {channel: np.full(buffer_size, np.nan) for channel in channels} for band in BANDS}


fig, axes = plt.subplots(8, 1, figsize=(10, 15), sharex=True)
plt.ion()  

raw_lines = [axes[i].plot([], [])[0] for i in range(4)]  
filtered_lines = {band: [axes[i + 4].plot([], [])[0] for i in range(4)] for band in BANDS} 

for i, ax in enumerate(axes[:4]):
    ax.set_title(f"Raw EEG {channels[i]}")
    ax.set_ylim([-200, 200])

for i, (band, _) in enumerate(BANDS.items()):
    for j in range(4):
        axes[i + 4].set_title(f"{band} Band - {channels[j]}")
        axes[i + 4].set_ylim([-100, 100])

axes[-1].set_xlabel("Time (samples)")

# Prepare to save data to CSV every 20 seconds
save_interval = 20  
last_save_time = time.time()

print("Starting real-time EEG streaming...")
try:
    while True:
        sample, timestamp = inlet.pull_sample()
        
        print("Sample received:", sample)
        
        for i, channel in enumerate(channels):
            raw_buffers[channel] = np.roll(raw_buffers[channel], -1)
            raw_buffers[channel][-1] = sample[i]  
            
            raw_lines[i].set_data(np.arange(buffer_size), raw_buffers[channel])
            axes[i].set_xlim(0, buffer_size)

        for band, (low, high) in BANDS.items():
            for i, channel in enumerate(channels):
                filtered_sample = bandpass_filter([sample[i]], low, high, fs)[0]
                filtered_buffers[band][channel] = np.roll(filtered_buffers[band][channel], -1)
                filtered_buffers[band][channel][-1] = filtered_sample  
                

                filtered_lines[band][i].set_data(np.arange(buffer_size), filtered_buffers[band][channel])
                axes[i + 4].set_xlim(0, buffer_size)

        if time.time() - last_save_time >= save_interval:
            with open('eeg_data_live.csv', 'a', newline='') as csvfile:
                writer = csv.writer(csvfile)
                header = ["Timestamp"] + channels + [f"{band} - {ch}" for band in BANDS for ch in channels]
                

                if csvfile.tell() == 0:
                    writer.writerow(header)
                

                row = [timestamp] + sample 
                for band in BANDS:
                    row.extend([filtered_buffers[band][ch][-1] for ch in channels])  
                writer.writerow(row)
                print("Data saved to eeg_data_live.csv")
            last_save_time = time.time()  

        
        plt.pause(0.01)  

except KeyboardInterrupt:
    print("Real-time plotting stopped.")
finally:
    plt.ioff()
    plt.show()
