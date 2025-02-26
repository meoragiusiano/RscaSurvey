import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defaultQuestions } from './questions.js';

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
  section: String,
  subsection: String,
  text: String,
  type: {
    type: String,
    enum: ['text', 'number', 'likert', 'multiple-choice', 'multiple-select', 'boolean', 'parsons-problem'], 
  },
  options: [String],
  definitions: Map,
  // Additional fields for Parsons Problem
  correctOrder: [String],  // Array of correct code snippet identifiers or content
  providedSnippets: [String], // Array of snippets to display to the user
});


const backgroundProfileSchema = new mongoose.Schema({
  age: Number,
  ethnicity: [String],
  gender: String,
  transgender: String,
  firstGenStudent: Boolean,
  csStudent: Boolean,
  major: String,
  timeSpentOnQuestions: Map, // stores questionId -> timeSpent
  eegRecordings: [{
    questionId: Number,
    recordingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EEGRecording'
    }
  }],
  // Check for duplicates
  profileHash: {
    type: String,
    unique: true
  }
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
  backgroundProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BackgroundProfile'
  },
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

const eegRecordingSchema = new mongoose.Schema({
  sessionId: String,
  questionId: Number,
  filePath: String,
  recordedAt: Date
});

const Question = mongoose.model('Question', questionSchema);
const Response = mongoose.model('Response', responseSchema);
const BackgroundProfile = mongoose.model('BackgroundProfile', backgroundProfileSchema);
const EEGRecording = mongoose.model('EEGRecording', eegRecordingSchema);

// Initialize default questions if none exist
const initializeQuestions = async () => {
  const count = await Question.countDocuments();
  if (count === 0) {
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

// Helper function to generate profile hash
const generateProfileHash = (profile) => {
  const sortedEthnicity = [...profile.ethnicity].sort().join('|');
  return `${profile.age}-${sortedEthnicity}-${profile.gender}-${profile.transgender}-${profile.firstGenStudent}-${profile.csStudent}-${profile.major}`;
};

// EEG Recording Management
let recordingProcess = null;

app.post('/api/sessions/:sessionId/questions/:questionId/start-eeg', async (req, res) => {
  try {
    const { sessionId, questionId } = req.params;
    console.log(`Starting EEG for Question: ${questionId}`);


    if (recordingProcess) {
      recordingProcess.kill();
      recordingProcess = null;
    }

    const timestamp = Date.now();
    const filename = `eeg_${sessionId}_${questionId}_${timestamp}.csv`;
    const filepath = path.join(EEG_RECORDINGS_DIR, filename);

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
    console.log(`Stopping EEG for Question: ${questionId}`);

    if (!recordingProcess) {
      return res.status(400).json({ message: 'No EEG recording in progress.' });
    }

    recordingProcess.kill();
    recordingProcess = null;

    const files = fs.readdirSync(EEG_RECORDINGS_DIR)
      .filter(f => f.startsWith(`eeg_${sessionId}_${questionId}_`))
      .sort((a, b) => fs.statSync(path.join(EEG_RECORDINGS_DIR, b)).mtime.getTime() - 
                      fs.statSync(path.join(EEG_RECORDINGS_DIR, a)).mtime.getTime());

    if (files.length === 0) {
      return res.status(404).json({ message: 'No EEG recording found.' });
    }

    const filepath = path.join(EEG_RECORDINGS_DIR, files[0]);

    const eegRecording = new EEGRecording({
      sessionId,
      questionId: parseInt(questionId),
      filePath: filepath,
      recordedAt: new Date()
    });
    await eegRecording.save();

    // Update background profile if it's a demographic question
    const question = await Question.findOne({ id: parseInt(questionId) });
    if (question && question.section === 'demographic') {
      const session = await Response.findOne({ sessionId });
      if (session && session.backgroundProfile) {
        const backgroundProfile = await BackgroundProfile.findById(session.backgroundProfile);
        if (backgroundProfile) {
          backgroundProfile.eegRecordings.push({
            questionId: parseInt(questionId),
            recordingId: eegRecording._id
          });
          await backgroundProfile.save();
        }
      }
    } else {
      const session = await Response.findOne({ sessionId });
      if (session) {
        const answerIndex = session.answers.findIndex(a => a.questionId === parseInt(questionId));
        if (answerIndex >= 0) {
          session.answers[answerIndex].eegRecordingId = eegRecording._id;
        }
        await session.save();
      }
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

// API Endpoints
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

    const question = await Question.findOne({ id: questionId });
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.section === 'demographic') {
      // Get or create background profile
      let backgroundProfile = await BackgroundProfile.findById(session.backgroundProfile);
      
      if (!backgroundProfile) {
        backgroundProfile = new BackgroundProfile({
          timeSpentOnQuestions: new Map(),
          eegRecordings: []
        });
      }

      // Update the appropriate field based on the question
      switch (question.text) {
        case "What is your age?":
          backgroundProfile.age = answer;
          break;
        case "What is your race/ethnicity? Check all that apply.":
          backgroundProfile.ethnicity = answer;
          break;
        case "What is your gender?":
          backgroundProfile.gender = answer;
          break;
        case "Do you identify as transgender?":
          backgroundProfile.transgender = answer;
          break;
        case "Are you a first-generation college student?":
          backgroundProfile.firstGenStudent = answer;
          break;
        case "Are you a Computer Science major?":
          backgroundProfile.csStudent = answer;
          break;
        case "If you stated that you are not a Computer Science major, please indicate your major":
          backgroundProfile.major = answer;
          break;
      }

      backgroundProfile.timeSpentOnQuestions.set(questionId.toString(), timeSpent);

      // Generate and set profile hash
      if (backgroundProfile.age && backgroundProfile.ethnicity && backgroundProfile.gender) {
        backgroundProfile.profileHash = generateProfileHash(backgroundProfile);
      }

      try {
        // Try to save the profile (might fail if duplicate)
        await backgroundProfile.save();
      } catch (error) {
        if (error.code === 11000) { // Duplicate key error
          // Find existing profile with same hash
          const existingProfile = await BackgroundProfile.findOne({
            profileHash: backgroundProfile.profileHash
          });
          backgroundProfile = existingProfile;
        } else {
          throw error;
        }
      }

      // Update session with background profile reference
      session.backgroundProfile = backgroundProfile._id;
    } else {
      // Handle regular question
      const answerIndex = session.answers.findIndex(a => a.questionId === questionId);
      if (answerIndex >= 0) {
        session.answers[answerIndex] = { questionId, answer, timeSpent };
      } else {
        session.answers.push({ questionId, answer, timeSpent });
      }
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
    const session = await Response.findOne({ sessionId: req.params.sessionId })
      .populate('backgroundProfile');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ message: 'Error fetching session' });
  }
});

app.get('/api/background-profiles/stats', async (req, res) => {
  try {
    const stats = await BackgroundProfile.aggregate([
      {
        $group: {
          _id: null,
          uniqueProfiles: { $sum: 1 },
          averageAge: { $avg: '$age' },
          genderDistribution: {
            $push: '$gender'
          },
          majorDistribution: {
            $push: '$major'
          }
        }
      }
    ]);

    res.json(stats[0]);
  } catch (error) {
    console.error('Error getting background profile stats:', error);
    res.status(500).json({ message: 'Error getting statistics' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});