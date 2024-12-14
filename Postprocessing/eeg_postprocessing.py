import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import signal
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(dotenv_path='C:/Users/meora/OneDrive/Documents/RSCA/RSCAsurvey/packages/express-backend/.env')

class EEGPostProcessor:
    def __init__(self, database_name='test'):
        """
        Initialize MongoDB connection
        
        :param database_name: Name of the database to use, with a default fallback
        """
        try:
            mongo_uri = os.getenv('MONGO_CONNECTION_STRING', 'mongodb://localhost:27017/')            
            self.client = MongoClient(mongo_uri)
            database_name = os.getenv('MONGO_DATABASE', database_name)
            self.db = self.client[database_name]
            
            # Collections
            self.eeg_recordings = self.db['eegrecordings']
            self.questions = self.db['questions']
            
            print(f"Successfully connected to MongoDB database: {database_name}")
        except Exception as e:
            print(f"Error connecting to MongoDB: {e}")
            sys.exit(1)

    def fetch_session_recordings(self, session_id=None):
        """
        Fetch EEG recordings for a specific session or all sessions
        
        :param session_id: Optional session ID to filter recordings
        :return: List of EEG recording documents
        """
        try:
            # If no session_id is provided, fetch all recordings
            query = {} if session_id is None else {"sessionId": str(session_id)}
            
            # Print debug information
            print(f"Searching for recordings with query: {query}")
            
            # Fetch recordings
            recordings = list(self.eeg_recordings.find(query))
            
            # Print additional debug info
            print(f"Total recordings found: {len(recordings)}")
            
            if not recordings:
                print("No recordings found. Checking database contents:")
                # Print all existing documents to understand the collection state
                all_docs = list(self.eeg_recordings.find())
                print(f"Total documents in collection: {len(all_docs)}")
                for doc in all_docs:
                    print(f"Existing document sessionId: {doc.get('sessionId')}")
            
            return recordings
        except Exception as e:
            print(f"Error fetching recordings: {e}")
            return []

    def load_eeg_data(self, file_path):
        """
        Load EEG data from CSV file
        
        :param file_path: Path to the CSV file
        :return: Pandas DataFrame with EEG data
        """
        try:
            df = pd.read_csv(file_path)
            return df
        except Exception as e:
            print(f"Error reading EEG file {file_path}: {e}")
            return None

    def preprocess_signal(self, signal_data, sampling_rate=250):
        """
        Basic EEG signal preprocessing
        - Bandpass filter (1-50 Hz)
        - Remove DC offset
        
        :param signal_data: Raw signal data
        :param sampling_rate: Sampling rate of the signal
        :return: Preprocessed signal
        """
        # Design bandpass filter
        nyquist = 0.5 * sampling_rate
        low = 1 / nyquist
        high = 50 / nyquist
        b, a = signal.butter(4, [low, high], btype='band')
        
        # Apply filter
        processed_signal = signal.filtfilt(b, a, signal_data)
        
        # Remove DC offset
        processed_signal -= np.mean(processed_signal)
        
        return processed_signal

    def analyze_power_spectrum(self, signal_data, sampling_rate=250):
        """
        Compute power spectral density
        
        :param signal_data: Preprocessed signal
        :param sampling_rate: Sampling rate of the signal
        :return: Frequency and power spectrum
        """
        f, Pxx = signal.welch(signal_data, fs=sampling_rate)
        return f, Pxx

    def visualize_recording(self, recordings, output_dir='Postprocessing/eeg_analysis_plots'):
        """
        Generate visualizations for EEG recordings
        
        :param recordings: List of EEG recording documents
        :param output_dir: Directory to save output images
        """
        os.makedirs(output_dir, exist_ok=True)
        
        if not recordings:
            print("No recordings provided to visualize.")
            return
        
        for recording in recordings:
            # Print full recording details for debugging
            print(f"Processing recording: {recording}")
            
            # Verify file path exists
            file_path = recording.get('filePath')
            if not file_path or not os.path.exists(file_path):
                print(f"File path invalid or does not exist: {file_path}")
                continue
            
            # Load data
            data = self.load_eeg_data(file_path)
            if data is None:
                continue
            
            # Get associated question details
            try:
                question = self.questions.find_one({"id": recording['questionId']})
            except Exception as e:
                print(f"Could not find question for ID {recording['questionId']}: {e}")
                question = {"text": "Unknown Question"}
            
            # Create figure with multiple subplots
            fig, axs = plt.subplots(2, 2, figsize=(15, 10))
            fig.suptitle(f"EEG Analysis: {question.get('text', 'Unknown Question')}")
            
            # Raw Signal Plot
            channel_columns = [col for col in data.columns if col.startswith('Channel')]
            for channel in channel_columns:
                preprocessed_signal = self.preprocess_signal(data[channel])
                
                # Time domain plot
                axs[0, 0].plot(data['Timestamp'], preprocessed_signal, label=channel)
                axs[0, 0].set_title('Raw Signal')
                axs[0, 0].set_xlabel('Time')
                axs[0, 0].set_ylabel('Amplitude')
                axs[0, 0].legend()
                
                # Power spectrum
                f, Pxx = self.analyze_power_spectrum(preprocessed_signal)
                axs[0, 1].semilogy(f, Pxx, label=channel)
                axs[0, 1].set_title('Power Spectral Density')
                axs[0, 1].set_xlabel('Frequency [Hz]')
                axs[0, 1].set_ylabel('Power/Frequency')
                axs[0, 1].legend()
            
            # Heatmap of signal correlation
            correlation_matrix = data[channel_columns].corr()
            sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', ax=axs[1, 0])
            axs[1, 0].set_title('Channel Correlation')
            
            # Basic statistics
            channel_stats = data[channel_columns].describe()
            axs[1, 1].axis('off')
            axs[1, 1].table(
                cellText=channel_stats.round(2).values, 
                colLabels=channel_stats.columns, 
                rowLabels=channel_stats.index, 
                loc='center'
            )
            
            plt.tight_layout()
            
            # Save figure
            output_filename = os.path.join(
                output_dir, 
                f'eeg_analysis_{recording["sessionId"]}_{recording["questionId"]}.png'
            )
            plt.savefig(output_filename)
            plt.close()
            
            print(f"Analysis saved for session {recording['sessionId']}, question {recording['questionId']}")

def main():
    processor = EEGPostProcessor()
    
    # Option to process a specific session or all sessions
    session_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Fetch recordings
    recordings = processor.fetch_session_recordings(session_id)
    
    if not recordings:
        print("No EEG recordings found.")
        sys.exit(0)
    
    # Process and visualize
    processor.visualize_recording(recordings)

if __name__ == "__main__":
    main()