from pylsl import StreamInlet, resolve_byprop
import csv
import time

# Resolve EEG stream
streams = resolve_byprop('type', 'EEG', timeout=2)
if streams:
    print("EEG stream found.")
    inlet = StreamInlet(streams[0])

    # Open a CSV file to record EEG data
    with open('eeg_data.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Timestamp", "Channel 1", "Channel 2", "Channel 3", "Channel 4"])  # Adjust columns as needed

        print("Recording EEG data...")
        start_time = time.time()
        while True:
            sample, timestamp = inlet.pull_sample()
            writer.writerow([timestamp] + sample)

            # Stop recording after a set time (optional safeguard)
            if time.time() - start_time > 120:  # 120 seconds max as a safeguard
                break

else:
    print("No EEG stream found. Ensure your EEG device is connected and streaming.")
