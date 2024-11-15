import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

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
    timeSpent: Number
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
      { 
        id: 1, 
        text: "What is 15 + 27?", 
        type: "number"
      },
      { 
        id: 2, 
        text: "Name three European capitals.", 
        type: "text"
      },
      {
        id: 3,
        text: "The earth is round.",
        type: "likert",
        options: [
          "Strongly Disagree",
          "Disagree",
          "Neutral",
          "Agree",
          "Strongly Agree"
        ]
      },
      {
        id: 4,
        text: "Which of these is a primary color?",
        type: "multiple-choice",
        options: [
          "Green",
          "Red",
          "Purple",
          "Orange"
        ],
        correctAnswer: "Red"
      },
      { 
        id: 5, 
        text: "What color is formed by mixing blue and yellow?", 
        type: "text"
      }
    ];

    await Question.insertMany(defaultQuestions);
    console.log('Default questions initialized');
  }
};

initializeQuestions().catch(console.error);

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