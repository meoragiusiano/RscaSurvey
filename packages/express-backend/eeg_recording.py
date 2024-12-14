from pylsl import StreamInlet, resolve_byprop
import csv
import time
import sys

def record_eeg(output_file):
    # Resolve EEG stream
    streams = resolve_byprop('type', 'EEG', timeout=2)
    if not streams:
        print("No EEG stream found. Ensure your EEG device is connected and streaming.")
        sys.exit(1)

    print("EEG stream found. Starting recording...")
    inlet = StreamInlet(streams[0])

    # Open CSV file for recording
    with open(output_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Timestamp", "Channel 1", "Channel 2", "Channel 3", "Channel 4", "Channel 5"]) 

        print(f"Recording to {output_file}")
        start_time = time.time()
        try:
            while True:
                sample, timestamp = inlet.pull_sample()
                writer.writerow([timestamp] + sample)

                # Stop recording after a set time
                if time.time() - start_time > 120:  # 2 minutes max
                    break
        except KeyboardInterrupt:
            print("Recording manually stopped.")
        finally:
            print("EEG recording complete.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please provide an output file path.")
        sys.exit(1)
    
    output_file = sys.argv[1]
    record_eeg(output_file)