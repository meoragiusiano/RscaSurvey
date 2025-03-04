import React, { useState, useEffect, useCallback, useRef } from "react";
import { Play, AlertCircle } from "lucide-react";
import axios from "axios";
import ParsonsProblem from "./ParsonsProblem";
import vignettes from "./vignettes";

const API_URL = "http://localhost:8000/api";


const QuestionInterface = () => {
  const [currentState, setCurrentState] = useState("ready");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [studyType, setStudyType] = useState(null); // 1 = normal, 2 = without Parsons

  const getQuestionTimeLimit = (index) => {
    if (index >= 0 && index <= 31) {
      return 10000; // 10 seconds for questions 0-31 (Belonging)
    } else if (index >= 32 && index <= 38) {
      return 80000; // 80 seconds for questions 32-38 (Parsons)
    } else if (index >= 39 && index <= 45) {
      return 15000; // 15 seconds for questions 39-42 (Background)
    }else {
      return 70000; // 70 seconds for the rest (Feedback)
    }
  };

  const timerRef = useRef(null);
  const moveToNextQuestionRef = useRef(null);

  const [dividerMessagesIndex, setDividerMessageIndex] = useState(0);
  const dividerMessages = [
    "Quiz.",
    "Solution: Problem 1: Iterating Over a List\n\n" +
      "A. my_list = [\"apple\", \"banana\", \"cherry\"]\n" +
      "C. for fruit in my_list:\n" +
      "  B. print(fruit)\n\n" +
      "Solution: Problem 2: Filtering Even Numbers\n\n" +
      "A. nums = [1, 2, 3, 4, 5, 6]\n" +
      "D. even_nums = []\n" +
      "C. for num in nums:\n" +
      "  E. if num % 2 == 0:\n" +
      "    B. even_nums.append(num)\n" +
      "F. print(even_nums)\n",
    "Background.",
    "Feedback."
  ];

  const [currentVignetteIndex, setCurrentVignetteIndex] = useState(0);
  const [vignetteSelected, setVignetteSelected] = useState(false);

  const { title, author, contents } = vignettes[currentVignetteIndex];

  // Fetch questions on component mount
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/questions`);
        const allQuestions = response.data;

        const firstPart = allQuestions.slice(0, 23);
        const remainingPart = allQuestions.slice(23);

        const shuffledFirst = [...firstPart];
        for (let i = shuffledFirst.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledFirst[i], shuffledFirst[j]] = [
            shuffledFirst[j],
            shuffledFirst[i],
          ];
        }

        const shuffledQuestions = [...shuffledFirst, ...remainingPart];
        setQuestions(shuffledQuestions);
      } catch (err) {
        setError("Failed to load questions. Please check your connection.");
        console.error("Error fetching questions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

  const moveToNextQuestion = useCallback(async () => {
    if (!questions.length || currentQuestionIndex >= questions.length) return;
    
    const currentQuestion = questions[currentQuestionIndex];

    try {
      stopTimer();

      // Save the current answer if it exists
      const currentAnswer = answers[currentQuestion?.id]?.answer;
      if (currentAnswer && sessionId && currentQuestion?.id) {
        const timeSpent = Date.now() - questionStartTime;
        await sendAnswerToDB(currentAnswer, timeSpent, currentQuestion.id);
      }

      // Stop EEG recording for the current question
      if (sessionId && currentQuestion?.id) {
        await stopEEGRecording(sessionId, currentQuestion.id);
      }

      console.log("2 Seconds Waited");
      await delay(2000);  // Waits for 2 seconds so stopping occurs before starting next question

      // If study type is 2 (no Parsons) and we're about to hit Parsons questions, skip them
      if (studyType === 2) {
        // Check if we're about to hit Parsons section
        if (currentQuestionIndex === 31) {
          // Skip to question 39 (Background section)
          setCurrentQuestionIndex(38);
          setDividerMessageIndex(2); // Set to "Background." divider message
          setCurrentState("divider");
          return;
        }
      }

      // Set indices for the divider here (parsons, background, feedback)
      const dividerIndices = studyType === 1 
                            ? new Set([32, 34, 38, 42]) 
                            : new Set([35, 42]);
                            
      if (dividerIndices.has(currentQuestionIndex)) {
        setCurrentState("divider");
        return; // Early return to prevent moving to next question yet
      }

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setQuestionStartTime(Date.now());

        // Start EEG recording for the next question
        if (sessionId && questions[currentQuestionIndex + 1]?.id) {
          await startEEGRecording(sessionId, questions[currentQuestionIndex + 1].id);
        }
        startTimer();
      } else {
        // Complete the session when there are no more questions
        if (sessionId) {
          await axios.post(`${API_URL}/sessions/${sessionId}/complete`);
        }
        setCurrentState("completed");
      }
    } catch (err) {
      setError("Failed to move to the next question. Please try again.");
      console.error("Error moving to the next question:", err);
    }
  }, [currentQuestionIndex, questions, sessionId, answers, questionStartTime, studyType]);

  // Store the latest version of moveToNextQuestion in a ref
  useEffect(() => {
    moveToNextQuestionRef.current = moveToNextQuestion;
  }, [moveToNextQuestion]);
  
  const startTimer = useCallback(() => {
    const startTime = Date.now();
    const currentTimeLimit = getQuestionTimeLimit(currentQuestionIndex);
    
    setTimeRemaining(currentTimeLimit);
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(currentTimeLimit - elapsed, 0);

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        if (moveToNextQuestionRef.current) {
          moveToNextQuestionRef.current();
        }
      }
    }, 100);
  }, [currentQuestionIndex]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const startEEGRecording = async (sessionId, questionId) => {
    try {
      await axios.post(
        `${API_URL}/sessions/${sessionId}/questions/${questionId}/start-eeg`
      );
      console.log(`EEG recording started for question ${questionId}`);
    } catch (err) {
      setError("Failed to start EEG recording.");
      console.error("Error starting EEG recording:", err);
    }
  };

  const stopEEGRecording = async (sessionId, questionId) => {
    try {
      await axios.post(
        `${API_URL}/sessions/${sessionId}/questions/${questionId}/stop-eeg`
      );
      console.log(`EEG recording stopped for question ${questionId}`);
    } catch (err) {
      setError("Failed to stop EEG recording.");
      console.error("Error stopping EEG recording:", err);
    }
  };

  const startQuestionnaire = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/sessions`);
      setSessionId(response.data.sessionId);
      setCurrentState("studySelection");
    } catch (err) {
      setError("Failed to start session. Please check your connection.");
      console.error("Error starting session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (answer) => {
    const currentQuestion = questions[currentQuestionIndex];

    if (currentQuestion) {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          answer,
          timeSpent: Date.now() - questionStartTime,
        },
      }));
    }
  };

  // send the answer to the database
  const sendAnswerToDB = async (answer, timeSpent, questionId) => {
    try {
      await axios.post(`${API_URL}/sessions/${sessionId}/answers`, {
        questionId,
        answer,
        timeSpent,
      });

      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          answer,
          timeSpent,
        },
      }));
      setError(null);
    } catch (err) {
      setError("Failed to save answer. Please try again.");
      console.error("Error saving answer:", err);
    }
  };

  const resetQuestionnaire = () => {
    stopTimer();
    setCurrentState("ready");
    setCurrentQuestionIndex(0);
    setVignetteSelected(false);
    setCurrentVignetteIndex(0);
    setAnswers({});
    setQuestionStartTime(null);
    setSessionId(null);
    setError(null);
    setTimeRemaining(getQuestionTimeLimit(0));
    setStudyType(null);
  };

  const renderQuestionInput = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;
    
    const currentAnswer = answers[currentQuestion.id]?.answer || "";

    switch (currentQuestion.type) {
      case "text":
      case "number":
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
      case "likert":
      case "multiple-choice":
        return (
          <div className="flex flex-col space-y-3" role="radiogroup">
            {currentQuestion.options.map((option, index) => (
              <label
                key={index}
                className="flex items-center space-x-2 cursor-pointer"
              >
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
      case "multiple-select":
        return (
          <div className="flex flex-col space-y-3" role="group">
            {currentQuestion.options.map((option, index) => (
              <label
                key={index}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={
                    Array.isArray(currentAnswer) &&
                    currentAnswer.includes(option)
                  }
                  onChange={(e) => {
                    const selectedOptions = Array.isArray(currentAnswer)
                      ? [...currentAnswer]
                      : [];
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
      case "boolean":
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
      case "parsons-problem":
        return (
          <ParsonsProblem
            question={currentQuestion}
            currentAnswer={currentAnswer}
            handleAnswer={handleAnswer}
          />
        );
      default:
        return null;
    }
  };

  const renderDivider = () => {
    const currentMessage = dividerMessages[dividerMessagesIndex];
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-gray-600 whitespace-pre-wrap break-words">{currentMessage}</p>
        <button
          onClick={() => {
            setCurrentState("answering");
            setDividerMessageIndex((prevIndex) => prevIndex + 1);
            setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
            setQuestionStartTime(Date.now());
            if (sessionId && questions[currentQuestionIndex + 1]?.id) {
              startEEGRecording(sessionId, questions[currentQuestionIndex + 1].id);
            }
            startTimer();
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 mx-auto"
          aria-label="Continue Questionnaire"
        >
          Ready to Continue!
        </button>
      </div>
    );
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

  // Format time remaining for display
  const formatTimeRemaining = (ms) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Computer Science Study</h2>

          {currentState === "studySelection" && (
            <div className="mb-4 flex flex-col items-center justify-between">
              <h2
                style={{
                  color: "black",
                  fontSize: "24px",
                  fontWeight: "medium",
                  textAlign: "center",
                  marginBottom: "20px"
                }}
              >
                Please select your study type
              </h2>
              <div className="flex flex-row items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setStudyType(1); // Normal flow with Parsons
                    setCurrentState("vignette");
                    
                    // Update the session with the study type information
                    if (sessionId) {
                      axios.put(`${API_URL}/sessions/${sessionId}`, { 
                        surveyType: 1 
                      }).catch(err => {
                        console.error("Error updating session with survey type:", err);
                      });
                    }
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 mx-auto"
                >
                  1
                </button>
                <button
                  onClick={() => {
                    setStudyType(2); // Without Parsons
                    setCurrentState("vignette");
                    
                    // Update the session with the study type information
                    if (sessionId) {
                      axios.put(`${API_URL}/sessions/${sessionId}`, { 
                        surveyType: 2 
                      }).catch(err => {
                        console.error("Error updating session with survey type:", err);
                      });
                    }
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 mx-auto"
                >
                  2
                </button>
              </div>
            </div>
          )}

          {currentState === "vignette" && vignetteSelected === false && (
            <div className="mb-4 flex flex-col items-center justify-between">
              <h2
                style={{
                  color: "black",
                  fontSize: "24px",
                  fontWeight: "medium",
                  textAlign: "center",
                }}
              >
                Please select your assigned letter
              </h2>
              <div className="flex flex-row items-center justify-between gap-4">
              {["F", "G", "C"].map((letter) => (
                <button
                  key={letter}
                  onClick={() => {
                    const vignetteMap = {"F": 0, "G": 1, "C": 2};
                    const vignetteTypeMap = {"F": "fixed", "G": "growth", "C": "control"};
                    const vignetteLetterIndex = vignetteMap[letter];
                    setVignetteSelected(true);
                    setCurrentVignetteIndex(vignetteLetterIndex);

                    // Update the session with the vignette type information
                    if (sessionId) {
                      axios.put(`${API_URL}/sessions/${sessionId}`, { 
                        vignetteType: vignetteTypeMap[letter] 
                      }).catch(err => {
                        console.error("Error updating session with vignette type:", err);
                      });
                    }

                    // Start EEG recording for the vignette
                    if (sessionId) {
                      startEEGRecording(sessionId, 100);
                    }

                    // Store the question start time
                    setQuestionStartTime(Date.now());
                    // Wait 100 seconds before stopping EEG and transitioning state
                    setTimeout(() => {
                      if (sessionId) {
                        stopEEGRecording(sessionId, 100);
                      }

                      // Wait 2 seconds before starting the EEG for the first question
                      setTimeout(() => {
                        console.log("2 Seconds Waited");
                        setCurrentState("answering");
                        if (sessionId && questions[0]?.id) {
                          startEEGRecording(sessionId, questions[0].id);
                        }
                        startTimer();
                      }, 2000); // 2-second delay
                    }, 100000); // 100-second delay
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 mx-auto"
                >
                  {letter}
                </button>
              ))}
              </div>
            </div>
          )}

          {currentState === "vignette" && vignetteSelected === true && (
            <div className="mb-4 flex flex-col items-center justify-between">
              <h2
                style={{
                  color: "black",
                  fontSize: "24px",
                  fontWeight: "medium",
                  textAlign: "center",
                }}
              >
                {title}
              </h2>
              <p
                style={{
                  color: "gray",
                  fontSize: "18px",
                  marginBottom: "10px",
                }}
              >
                By: {author}
              </p>
              <div
                style={{
                  height: "500px",
                  overflowY: "auto",
                  border: "1px solid #ccc",
                  padding: "10px",
                  width: "100%",
                  marginBottom: "20px",
                }}
              >
                {contents}
              </div>
            </div>
          )}

          {currentState === "answering" && questions.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <div className="text-sm font-medium text-gray-500">
                {/* Time: {formatTimeRemaining(timeRemaining)} */}
              </div>
            </div>
          )}

          {currentState === "ready" && (
            <div className="text-center py-8 space-y-4">
              <p className="text-gray-600">
                Welcome to our study. Please make sure you're in a quiet
                environment and your EEG device is properly connected before
                starting.
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

          {currentState === "divider" && <>{renderDivider()}</>}
          {currentState === "answering" && questions.length > 0 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {questions[currentQuestionIndex]?.text}
                </h3>
                {renderQuestionInput()}
              </div>
            </div>
          )}

          {currentState === "completed" && (
            <div className="text-center py-8 space-y-4">
              <h3 className="text-lg font-medium">
                Thank you for participating!
              </h3>
              <p className="text-gray-600">
                Your responses have been recorded.
              </p>
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