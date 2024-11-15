import React, { useState, useEffect, useCallback } from 'react';
import { Play, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const QuestionInterface = () => {
  const [currentState, setCurrentState] = useState('ready');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  
  const QUESTION_TIME_LIMIT = 60000;

  // Fetch questions on component mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${API_URL}/questions`);
        setQuestions(response.data);
      } catch (err) {
        setError('Failed to load questions. Please try again later.');
        console.error('Error fetching questions:', err);
      }
    };

    fetchQuestions();
  }, []);

  const moveToNextQuestion = useCallback(async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    } else {
      try {
        await axios.post(`${API_URL}/sessions/${sessionId}/complete`);
        setCurrentState('completed');
      } catch (err) {
        setError('Failed to complete session. Please try again.');
        console.error('Error completing session:', err);
      }
    }
  }, [currentQuestionIndex, questions.length, sessionId]);

  useEffect(() => {
    let timeoutId;
    
    if (currentState === 'answering') {
      timeoutId = setTimeout(() => {
        console.log('Time limit reached, moving to next question');
        moveToNextQuestion();
      }, QUESTION_TIME_LIMIT);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentState, moveToNextQuestion]);

  const startQuestionnaire = async () => {
    try {
      const response = await axios.post(`${API_URL}/sessions`);
      setSessionId(response.data.sessionId);
      setCurrentState('answering');
      setQuestionStartTime(Date.now());
    } catch (err) {
      setError('Failed to start session. Please try again.');
      console.error('Error starting session:', err);
    }
  };

  const handleAnswer = async (answer) => {
    const currentTime = Date.now();
    const timeSpent = currentTime - questionStartTime;
    
    if (timeSpent <= QUESTION_TIME_LIMIT) {
      try {
        const currentQuestion = questions[currentQuestionIndex];
        await axios.post(`${API_URL}/sessions/${sessionId}/answers`, {
          questionId: currentQuestion.id,
          answer,
          timeSpent
        });

        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: {
            answer,
            timeSpent
          }
        }));
      } catch (err) {
        setError('Failed to save answer. Please try again.');
        console.error('Error saving answer:', err);
      }
    }
  };

  const handleNextClick = () => {
    const currentTime = Date.now();
    const timeSpent = currentTime - questionStartTime;
    
    if (timeSpent <= QUESTION_TIME_LIMIT) {
      moveToNextQuestion();
    }
  };

  const resetQuestionnaire = () => {
    setCurrentState('ready');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setQuestionStartTime(null);
    setSessionId(null);
    setError(null);
  };

  const renderQuestionInput = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion.id]?.answer || '';

    switch (currentQuestion.type) {
      case 'text':
      case 'number':
        return (
          <input
            type={currentQuestion.type}
            value={currentAnswer}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'likert':
        return (
          <div className="flex flex-col space-y-3">
            {currentQuestion.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="likert"
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="w-4 h-4 text-blue-500"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'multiple-choice':
        return (
          <div className="flex flex-col space-y-3">
            {currentQuestion.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="multiple-choice"
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="w-4 h-4 text-blue-500"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <button 
            onClick={resetQuestionnaire}
            className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Belonging Beyond Boundaries Study</h2>

          {currentState === 'ready' && (
            <div className="text-center py-8 space-y-4">
              <p className="text-gray-600">
                Welcome to our study. Please make sure you're in a quiet environment 
                and your EEG device is properly connected before starting.
              </p>
              <button 
                onClick={startQuestionnaire}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 mx-auto"
              >
                <Play className="w-4 h-4" />
                Begin Questionnaire
              </button>
            </div>
          )}

          {currentState === 'answering' && questions.length > 0 && (
            <div className="space-y-6">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {questions[currentQuestionIndex].text}
                </h3>
                
                {renderQuestionInput()}
                
                <div className="flex justify-end">
                  <button 
                    onClick={handleNextClick}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Complete'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentState === 'completed' && (
            <div className="text-center py-8 space-y-4">
              <h3 className="text-lg font-medium">Thank you for participating!</h3>
              <p className="text-gray-600">Your responses have been recorded.</p>
              <button 
                onClick={resetQuestionnaire}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Start New Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionInterface;