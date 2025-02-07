import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, ChevronRight, AlertCircle } from 'lucide-react';
import axios from 'axios';
import ParsonsProblem from './ParsonsProblem';

const API_URL = 'http://localhost:8000/api';

const QuestionInterface = () => {
  const [currentState, setCurrentState] = useState('ready');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const QUESTION_TIME_LIMIT = 60000; // 60 seconds
  const timerRef = useRef(null);

  // Fetch questions on component mount
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/questions`);
        setQuestions(response.data);
      } catch (err) {
        setError('Failed to load questions. Please check your connection.');
        console.error('Error fetching questions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const startTimer = useCallback(() => {
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(QUESTION_TIME_LIMIT - elapsed, 0);
      
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        moveToNextQuestion();
      }
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const startEEGRecording = async (sessionId, questionId) => {
    try {
      await axios.post(`${API_URL}/sessions/${sessionId}/questions/${questionId}/start-eeg`);
      console.log(`EEG recording started for question ${questionId}`);
    } catch (err) {
      setError('Failed to start EEG recording.');
      console.error('Error starting EEG recording:', err);
    }
  };

  const stopEEGRecording = async (sessionId, questionId) => {
    try {
      await axios.post(`${API_URL}/sessions/${sessionId}/questions/${questionId}/stop-eeg`);
      console.log(`EEG recording stopped for question ${questionId}`);
    } catch (err) {
      setError('Failed to stop EEG recording.');
      console.error('Error stopping EEG recording:', err);
    }
  };

  const moveToNextQuestion = useCallback(async () => {
    const currentQuestion = questions[currentQuestionIndex];
  
    try {
      stopTimer();
      
      // Stop EEG recording for the current question
      await stopEEGRecording(sessionId, currentQuestion.id);
  
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setQuestionStartTime(Date.now());
  
        // Start EEG recording for the next question
        await startEEGRecording(sessionId, questions[currentQuestionIndex + 1].id);
        startTimer();
      } else {
        // Complete the session when there are no more questions
        await axios.post(`${API_URL}/sessions/${sessionId}/complete`);
        setCurrentState('completed');
      }
    } catch (err) {
      setError('Failed to move to the next question. Please try again.');
      console.error('Error moving to the next question:', err);
    }
  }, [currentQuestionIndex, questions, sessionId, stopTimer, startTimer]);

  const startQuestionnaire = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/sessions`);
      setSessionId(response.data.sessionId);
      setCurrentState('answering');
      setQuestionStartTime(Date.now());

      // Start EEG recording for the first question
      await startEEGRecording(response.data.sessionId, questions[0].id);
      startTimer();
    } catch (err) {
      setError('Failed to start session. Please check your connection.');
      console.error('Error starting session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (answer) => {
    const currentTime = Date.now();
    const timeSpent = currentTime - questionStartTime;
    const currentQuestion = questions[currentQuestionIndex];
  
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        answer,
        timeSpent
      }
    }));
  };
  
  const handleNextClick = async () => {
    const currentTime = Date.now();
    const timeSpent = currentTime - questionStartTime;
    const currentQuestion = questions[currentQuestionIndex];
  
    if (timeSpent <= QUESTION_TIME_LIMIT) {
      const currentAnswer = answers[currentQuestion.id]?.answer; 
  
      if (currentAnswer) {
        await sendAnswerToDB(currentAnswer, timeSpent, currentQuestion.id);
      }
  
      moveToNextQuestion();
    }
  };
  
  // send the answer to the database
  const sendAnswerToDB = async (answer, timeSpent, questionId) => {
    try {
      await axios.post(`${API_URL}/sessions/${sessionId}/answers`, {
        questionId,
        answer,
        timeSpent
      });
  
      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          answer,
          timeSpent
        }
      }));
      setError(null);
    } catch (err) {
      setError('Failed to save answer. Please try again.');
      console.error('Error saving answer:', err);
    }
  };
  
  const resetQuestionnaire = () => {
    stopTimer();
    setCurrentState('ready');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setQuestionStartTime(null);
    setSessionId(null);
    setError(null);
    setTimeRemaining(QUESTION_TIME_LIMIT);
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
            aria-label={`Answer for: ${currentQuestion.text}`}
          />
        );
      case 'likert':
      case 'multiple-choice':
        return (
          <div className="flex flex-col space-y-3" role="radiogroup">
            {currentQuestion.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={currentQuestion.type}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="w-4 h-4 text-blue-500"
                  aria-label={option}
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      case 'multiple-select':
        return (
          <div className="flex flex-col space-y-3" role="group">
            {currentQuestion.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(currentAnswer) && currentAnswer.includes(option)}
                  onChange={(e) => {
                    const selectedOptions = Array.isArray(currentAnswer) ? [...currentAnswer] : [];
                    if (e.target.checked) {
                      selectedOptions.push(option);
                    } else {
                      const index = selectedOptions.indexOf(option);
                      if (index > -1) {
                        selectedOptions.splice(index, 1);
                      }
                    }
                    handleAnswer(selectedOptions);
                  }}
                  className="w-4 h-4 text-blue-500 rounded"
                  aria-label={option}
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
        case 'boolean':
        return (
          <div className="flex flex-col space-y-3" role="radiogroup">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`boolean-${currentQuestion.id}`}
                value="yes"
                checked={currentAnswer === "yes"}
                onChange={() => handleAnswer("yes")}
                className="w-4 h-4 text-blue-500"
                aria-label="Yes"
              />
              <span className="text-gray-700">Yes</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`boolean-${currentQuestion.id}`}
                value="no"
                checked={currentAnswer === "no"}
                onChange={() => handleAnswer("no")}
                className="w-4 h-4 text-blue-500"
                aria-label="No"
              />
              <span className="text-gray-700">No</span>
            </label>
          </div>
        );
      case 'parsons-problem':
        return <ParsonsProblem question={currentQuestion} currentAnswer={currentAnswer} handleAnswer={handleAnswer} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 text-center">
        <div className="flex items-center justify-center space-x-2">
          <AlertCircle className="w-6 h-6 text-blue-500 animate-pulse" />
          <p>Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center space-x-4">
          <AlertCircle className="w-6 h-6" />
          <div>
            <p>{error}</p>
            <button 
              onClick={resetQuestionnaire}
              className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Belonging Beyond Boundaries Study</h2>
          
          {currentState === 'answering' && questions.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
            </div>
          )}

          {currentState === 'ready' && (
            <div className="text-center py-8 space-y-4">
              <p className="text-gray-600">
                Welcome to our study. Please make sure you're in a quiet environment 
                and your EEG device is properly connected before starting.
              </p>
              <button 
                onClick={startQuestionnaire}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 mx-auto"
                aria-label="Start Questionnaire"
              >
                <Play className="w-4 h-4" />
                Begin Questionnaire
              </button>
            </div>
          )}

          {currentState === 'answering' && questions.length > 0 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {questions[currentQuestionIndex].text}
                </h3>
                {renderQuestionInput()}
                <div className="flex justify-end">
                  <button 
                    onClick={handleNextClick}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
                    aria-label={currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Questionnaire'}
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
                aria-label="Start New Session"
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