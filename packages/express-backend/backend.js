import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { exec } from 'child_process'; // For running Python script
import fs from 'fs'; // For reading EEG data

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
    eegData: String // Store EEG data as a string (CSV content)
  }],
  completed: {
    type: Boolean,
    default: false
  }
});

const Question = mongoose.model('Question', questionSchema);
const Response = mongoose.model('Response', responseSchema);

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

// EEG Recording Management
let recordingProcess = null;

app.post('/api/sessions/:sessionId/questions/:questionId/start-eeg', (req, res) => {
  try {
    if (recordingProcess) {
      console.log('Attempting to stop the current recording process before starting a new one.');
      recordingProcess.kill();
      recordingProcess = null;  // Reset to allow a new recording process
    }

    console.log(`Starting EEG recording for session ${req.params.sessionId}, question ${req.params.questionId}`);
    recordingProcess = exec('python ./eeg_recording.py', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting EEG recording: ${error.message}`);
        if (!res.headersSent) {
          return res.status(500).json({ message: 'Failed to start EEG recording', error: error.message });
        }
      }

      if (stdout) {
        console.log(`Python script stdout: ${stdout}`);
      }
      if (stderr) {
        console.warn(`Python script stderr (non-critical): ${stderr}`);
      }

      if (!res.headersSent) {
        res.status(200).json({ message: 'EEG recording started successfully.' });
      }
    });
  } catch (error) {
    console.error('Error starting EEG recording:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error starting EEG recording.' });
    }
  }
});


// EEG Stop
app.post('/api/sessions/:sessionId/questions/:questionId/stop-eeg', async (req, res) => {
  try {
    if (!recordingProcess) {
      console.log('No EEG recording in progress to stop.');
      return res.status(400).json({ message: 'No EEG recording in progress.' });
    }

    // Stop the recording process
    recordingProcess.kill();
    recordingProcess = null;  // Reset the recording process
    console.log(`EEG recording stopped for session ${req.params.sessionId}, question ${req.params.questionId}`);

    // Read EEG data from the CSV file
    const eegData = fs.readFileSync('eeg_data.csv', 'utf8');
    const { sessionId, questionId } = req.params;

    // Find the session and add the EEG data to the corresponding answer
    const session = await Response.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const answer = session.answers.find(a => a.questionId === parseInt(questionId));
    if (answer) {
      answer.eegData = eegData;  // Attach EEG data to the answer
    } else {
      session.answers.push({ questionId, eegData });
    }

    await session.save();
    res.status(200).json({ message: 'EEG recording stopped and data saved.' });
  } catch (error) {
    console.error('Error stopping EEG recording:', error);
    res.status(500).json({ message: 'Error stopping EEG recording.' });
  }
});

// Other API Endpoints
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
