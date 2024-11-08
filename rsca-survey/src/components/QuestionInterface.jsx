import React, { useState, useEffect, useCallback } from 'react';
import { Play, ChevronRight } from 'lucide-react';

const QuestionInterface = () => {
  const [currentState, setCurrentState] = useState('ready'); // ready, answering, completed
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionStartTime, setQuestionStartTime] = useState(null);
  
  const QUESTION_TIME_LIMIT = 60000; // 60 seconds in milliseconds
  
  const questions = [
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

  const moveToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    } else {
      setCurrentState('completed');
    }
  }, [currentQuestionIndex, questions.length]);

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
  }, [currentState, currentQuestionIndex, moveToNextQuestion]);

  const startQuestionnaire = () => {
    setCurrentState('answering');
    setQuestionStartTime(Date.now());
  };

  const handleAnswer = (answer) => {
    const currentTime = Date.now();
    const timeSpent = currentTime - questionStartTime;
    
    if (timeSpent <= QUESTION_TIME_LIMIT) {
      setAnswers(prev => ({
        ...prev,
        [questions[currentQuestionIndex].id]: {
          answer,
          timeSpent
        }
      }));
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

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Brain Response Study</h2>

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

          {currentState === 'answering' && (
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