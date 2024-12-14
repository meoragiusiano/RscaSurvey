import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const { MONGO_CONNECTION_STRING } = process.env;
mongoose.connect(MONGO_CONNECTION_STRING)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const questionSchema = new mongoose.Schema({
  id: Number,
  text: String,
  type: {
    type: String,
    enum: ['text', 'number', 'likert', 'multiple-choice']
  },
  options: [String],
  correctAnswer: String
});

const eegRecordingSchema = new mongoose.Schema({
  sessionId: String,
  questionId: Number,
  filePath: String,
  recordedAt: Date
});

const responseSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  answers: [{
    questionId: Number,
    answer: mongoose.Schema.Types.Mixed,
    timeSpent: Number,
    eegRecordingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EEGRecording'
    }
  }],
  completed: {
    type: Boolean,
    default: false
  }
});

const Question = mongoose.model('Question', questionSchema);
const Response = mongoose.model('Response', responseSchema);
const EEGRecording = mongoose.model('EEGRecording', eegRecordingSchema);

// Initialize default questions if none exist
const initializeQuestions = async () => {
  const count = await Question.countDocuments();
  if (count === 0) {
    const defaultQuestions = [
      { id: 1, text: "What is 15 + 27?", type: "number" },
      { id: 2, text: "Name three European capitals.", type: "text" },
      { 
        id: 3, text: "The earth is round.", type: "likert",
        options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
      },
      { 
        id: 4, text: "Which of these is a primary color?", type: "multiple-choice",
        options: ["Green", "Red", "Purple", "Orange"],
        correctAnswer: "Red"
      },
      { id: 5, text: "What color is formed by mixing blue and yellow?", type: "text" }
    ];

    await Question.insertMany(defaultQuestions);
    console.log('Default questions initialized');
  }
};

initializeQuestions().catch(console.error);

// Ensure EEG recordings directory exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EEG_RECORDINGS_DIR = path.join(__dirname, '../../eeg_recordings');
if (!fs.existsSync(EEG_RECORDINGS_DIR)) {
  fs.mkdirSync(EEG_RECORDINGS_DIR);
}

// EEG Recording Management
let recordingProcess = null;

app.post('/api/sessions/:sessionId/questions/:questionId/start-eeg', async (req, res) => {
  try {
    const { sessionId, questionId } = req.params;
    
    // Stop any existing recording
    if (recordingProcess) {
      recordingProcess.kill();
      recordingProcess = null;
    }

    // Generate a unique filename for this EEG recording
    const timestamp = Date.now();
    const filename = `eeg_${sessionId}_${questionId}_${timestamp}.csv`;
    const filepath = path.join(EEG_RECORDINGS_DIR, filename);

    // Start Python recording script with filepath argument
    recordingProcess = spawn('python', ['./eeg_recording.py', filepath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    recordingProcess.stdout.on('data', (data) => {
      console.log(`EEG Recording stdout: ${data}`);
    });

    recordingProcess.stderr.on('data', (data) => {
      console.error(`EEG Recording stderr: ${data}`);
    });

    recordingProcess.on('error', (error) => {
      console.error('Failed to start EEG recording:', error);
      res.status(500).json({ message: 'Failed to start EEG recording' });
    });

    res.status(200).json({ message: 'EEG recording started successfully.' });

  } catch (error) {
    console.error('Error starting EEG recording:', error);
    res.status(500).json({ message: 'Error starting EEG recording' });
  }
});

app.post('/api/sessions/:sessionId/questions/:questionId/stop-eeg', async (req, res) => {
  try {
    const { sessionId, questionId } = req.params;

    if (!recordingProcess) {
      return res.status(400).json({ message: 'No EEG recording in progress.' });
    }

    // Kill the recording process
    recordingProcess.kill();
    recordingProcess = null;

    // Find the most recently created EEG recording file
    const files = fs.readdirSync(EEG_RECORDINGS_DIR)
      .filter(f => f.startsWith(`eeg_${sessionId}_${questionId}_`))
      .sort((a, b) => fs.statSync(path.join(EEG_RECORDINGS_DIR, b)).mtime.getTime() - 
                      fs.statSync(path.join(EEG_RECORDINGS_DIR, a)).mtime.getTime());

    if (files.length === 0) {
      return res.status(404).json({ message: 'No EEG recording found.' });
    }

    const filepath = path.join(EEG_RECORDINGS_DIR, files[0]);

    // Save recording metadata to database
    const eegRecording = new EEGRecording({
      sessionId,
      questionId: parseInt(questionId),
      filePath: filepath,
      recordedAt: new Date()
    });
    await eegRecording.save();

    // Update the session's answer with EEG recording reference
    const session = await Response.findOne({ sessionId });
    if (session) {
      const answerIndex = session.answers.findIndex(a => a.questionId === parseInt(questionId));
      if (answerIndex >= 0) {
        session.answers[answerIndex].eegRecordingId = eegRecording._id;
      } else {
        session.answers.push({ 
          questionId: parseInt(questionId), 
          eegRecordingId: eegRecording._id 
        });
      }
      await session.save();
    }

    res.status(200).json({ 
      message: 'EEG recording stopped and metadata saved.',
      recordingId: eegRecording._id
    });

  } catch (error) {
    console.error('Error stopping EEG recording:', error);
    res.status(500).json({ message: 'Error stopping EEG recording' });
  }
});

// Existing API Endpoints (kept the same as before)
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find().sort('id');
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const session = new Response({
      sessionId: new mongoose.Types.ObjectId().toString(),
      startTime: new Date(),
      answers: []
    });
    const newSession = await session.save();
    res.status(201).json({ sessionId: newSession.sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(400).json({ message: 'Error creating session' });
  }
});

app.post('/api/sessions/:sessionId/answers', async (req, res) => {
  try {
    const { questionId, answer, timeSpent } = req.body;
    const session = await Response.findOne({ sessionId: req.params.sessionId });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const answerIndex = session.answers.findIndex(a => a.questionId === questionId);
    if (answerIndex >= 0) {
      session.answers[answerIndex] = { questionId, answer, timeSpent };
    } else {
      session.answers.push({ questionId, answer, timeSpent });
    }

    await session.save();
    res.json(session);
  } catch (error) {
    console.error('Error saving answer:', error);
    res.status(400).json({ message: 'Error saving answer' });
  }
});

app.post('/api/sessions/:sessionId/complete', async (req, res) => {
  try {
    const session = await Response.findOne({ sessionId: req.params.sessionId });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.completed = true;
    session.endTime = new Date();
    await session.save();

    res.json(session);
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(400).json({ message: 'Error completing session' });
  }
});

app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const session = await Response.findOne({ sessionId: req.params.sessionId });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ message: 'Error fetching session' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});