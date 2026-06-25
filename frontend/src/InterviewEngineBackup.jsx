import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000";
const MAX_QUESTIONS = 5;

function App() {
  const [interviewType, setInterviewType] = useState("HR Interview");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);

  const [feedback, setFeedback] = useState(null);
  const [feedbackQuestionNumber, setFeedbackQuestionNumber] = useState(null);
  const [history, setHistory] = useState([]);
  const [finalReport, setFinalReport] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const getAnswerValidationError = (text) => {
    const trimmedText = text.trim();
    const words = trimmedText.match(/[A-Za-z]{2,}/g) || [];
    const lowerCaseWords = words.map((word) => word.toLowerCase());

    if (trimmedText.length < 15) {
      return "Write at least one meaningful sentence before submitting.";
    }

    if (words.length < 3) {
      return "Your answer needs more meaningful words.";
    }

    if (
      lowerCaseWords.length >= 3 &&
      new Set(lowerCaseWords).size === 1
    ) {
      return "Do not repeat the same word. Write a proper answer.";
    }

    if (words.length === 1 && words[0].length >= 10) {
      return "This looks like random letters. Please write a meaningful answer.";
    }

    return "";
  };

  const startInterview = async () => {
    setLoading(true);
    setErrorMessage("");
    setCurrentQuestion("");
    setAnswer("");
    setQuestionNumber(1);
    setFeedback(null);
    setFeedbackQuestionNumber(null);
    setHistory([]);
    setFinalReport(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/start-interview`, {
        interview_type: interviewType,
      });

      if (!response.data.question) {
        throw new Error("The AI did not return a question.");
      }

      setCurrentQuestion(response.data.question);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.detail ||
          error.message ||
          "Could not start the interview."
      );
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentQuestion) {
      setErrorMessage("Click Start New Interview first.");
      return;
    }

    const clientValidationError = getAnswerValidationError(answer);

    if (clientValidationError) {
      setErrorMessage(clientValidationError);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const questionBeingAnswered = currentQuestion;
    const answerBeingSubmitted = answer;

    try {
      const evaluationResponse = await axios.post(
        `${API_BASE_URL}/interview`,
        {
          interview_type: interviewType,
          current_question: questionBeingAnswered,
          user_answer: answerBeingSubmitted,
          question_number: questionNumber,
        }
      );

      const evaluation = evaluationResponse.data;

      setFeedback(evaluation);
      setFeedbackQuestionNumber(questionNumber);

      if (evaluation.requires_retry) {
        setErrorMessage(evaluation.feedback);
        return;
      }

      const newRecord = {
        question: questionBeingAnswered,
        answer: answerBeingSubmitted,
        feedback: evaluation.feedback,
        scores: evaluation.scores,
        improved_answer: evaluation.improved_answer,
        evidence: evaluation.evidence || [],
      };

      const updatedHistory = [...history, newRecord];

      setHistory(updatedHistory);
      setAnswer("");

      const interviewCompleted =
        evaluation.is_complete || questionNumber === MAX_QUESTIONS;

      if (interviewCompleted) {
        setCurrentQuestion("");

        const finalResponse = await axios.post(
          `${API_BASE_URL}/final-report`,
          {
            interview_type: interviewType,
            history: updatedHistory,
          }
        );

        setFinalReport(finalResponse.data);
      } else {
        if (!evaluation.next_question?.trim()) {
          throw new Error(
            "The next question was not generated. Please start a new interview."
          );
        }

        setCurrentQuestion(evaluation.next_question);
        setQuestionNumber((previousNumber) => previousNumber + 1);
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.detail ||
          error.message ||
          "Could not analyze your answer. Check the backend terminal."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (text) => {
    return text.replaceAll("_", " ");
  };

  return (
    <main className="app-container">
      <section className="interview-card">
        <div className="heading-section">
          <p className="tag">AI-POWERED MOCK INTERVIEW</p>
          <h1>AI Interview Coach</h1>
          <p className="subtitle">
            Practice interviews, receive feedback, and improve your answers.
          </p>
        </div>

        <div className="form-section">
          <label htmlFor="interview-type">Choose interview type</label>

          <select
            id="interview-type"
            value={interviewType}
            onChange={(event) => setInterviewType(event.target.value)}
            disabled={loading}
          >
            <option>HR Interview</option>
            <option>Technical Interview</option>
            <option>DSA Interview</option>
            <option>Frontend Interview</option>
            <option>Backend Interview</option>
          </select>

          <button
            className="start-button"
            onClick={startInterview}
            disabled={loading}
          >
            {loading && !currentQuestion
              ? "Starting..."
              : "Start New Interview"}
          </button>
        </div>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {!currentQuestion && !loading && !finalReport && (
          <div className="empty-state">
            <p>Select an interview type and click “Start New Interview”.</p>
          </div>
        )}

        {currentQuestion && (
          <section className="question-section">
            <div className="question-header">
              <span>
                QUESTION {questionNumber} OF {MAX_QUESTIONS}
              </span>
            </div>

            <p className="question-text">{currentQuestion}</p>

            <label htmlFor="answer">Your answer</label>

            <textarea
              id="answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Write your answer as if you are in a real interview..."
              disabled={loading}
            />

            <button
              className="submit-button"
              onClick={submitAnswer}
              disabled={loading}
            >
              {loading ? "AI is analyzing..." : "Submit Answer"}
            </button>
          </section>
        )}

        {feedback && (
          <section className="feedback-section">
            <h2>Feedback for Question {feedbackQuestionNumber}</h2>

            <div className="score-grid">
              {Object.entries(feedback.scores).map(([key, value]) => (
                <div className="score-box" key={key}>
                  <span>{formatLabel(key)}</span>
                  <strong>{value}/10</strong>
                </div>
              ))}
            </div>

            <div className="feedback-box">
              <h3>Coach Feedback</h3>
              <p>{feedback.feedback}</p>
            </div>

            {feedback.evidence?.length > 0 && (
              <div className="feedback-box">
                <h3>Evidence Used for Evaluation</h3>
                <ul>
                  {feedback.evidence.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.improved_answer && (
              <div className="feedback-box improved-answer">
                <h3>Improved Answer</h3>
                <p>{feedback.improved_answer}</p>
              </div>
            )}
          </section>
        )}

        {loading && history.length === MAX_QUESTIONS && (
          <div className="report-loading">
            Creating your final performance report...
          </div>
        )}

        {finalReport && (
          <section className="final-report-section">
            <div className="report-title-row">
              <div>
                <p className="tag">INTERVIEW COMPLETED</p>
                <h2>Final Performance Report</h2>
              </div>

              <div className="overall-score">
                <span>Overall</span>
                <strong>{finalReport.overall_score}/10</strong>
              </div>
            </div>

            <div className="readiness-box">
              <span>Interview Readiness</span>
              <strong>{finalReport.interview_readiness}</strong>
            </div>

            <div className="feedback-box">
              <h3>Overall Summary</h3>
              <p>{finalReport.summary}</p>
            </div>

            <div className="report-grid">
              <div className="report-list-box">
                <h3>Your Strengths</h3>
                <ul>
                  {finalReport.strengths.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="report-list-box">
                <h3>Areas to Improve</h3>
                <ul>
                  {finalReport.improvement_areas.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="report-list-box action-plan">
              <h3>Your Action Plan</h3>
              <ol>
                {finalReport.action_plan.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ol>
            </div>

            <button className="restart-button" onClick={startInterview}>
              Start Another Interview
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;