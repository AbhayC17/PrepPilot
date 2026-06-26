import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import axios from "axios";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import DownloadReportButton from "../components/DownloadReportButton";
import { API_BASE_URL } from "../config/appConfig";

import {
  downloadSavedResume,
  extractResumeTextFromFile,
  getSavedResumeInfo,
} from "../utils/resumeStorage";

import "../styles/interview-experience.css";

const MAX_QUESTIONS = 5;
const MAX_RESUME_SIZE = 2 * 1024 * 1024;
const MIN_JOB_DESCRIPTION_LENGTH = 100;

function InterviewRoomPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const interviewType =
    searchParams.get("type") || "Technical Interview";

  const isResumeMode = interviewType === "Resume-Based Interview";
  const isJobDescriptionMode =
    interviewType === "Job Description-Based Interview";

  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);

  const [history, setHistory] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [feedbackQuestionNumber, setFeedbackQuestionNumber] =
    useState(null);

  const [finalReport, setFinalReport] = useState(null);
  const [savedInterviewId, setSavedInterviewId] = useState(null);

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeStatus, setResumeStatus] = useState("");

  const [savedResumeAvailable, setSavedResumeAvailable] = useState(false);
  const [savedResumeName, setSavedResumeName] = useState("");

  const [jobDescription, setJobDescription] = useState("");

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceError, setVoiceError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [sessionPlan, setSessionPlan] = useState([]);
  const [currentCompetency, setCurrentCompetency] = useState(null);
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [recentAnswerContext, setRecentAnswerContext] = useState([]);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    setVoiceSupported(Boolean(SpeechRecognition));

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadSavedResumeStatus = async () => {
      if (!user || !isResumeMode) {
        if (isActive) {
          setSavedResumeAvailable(false);
          setSavedResumeName("");
        }

        return;
      }

      try {
        const resumeInfo = await getSavedResumeInfo(user.id);

        if (isActive) {
          setSavedResumeAvailable(Boolean(resumeInfo.resumePath));
          setSavedResumeName(resumeInfo.resumeFileName || "");
        }
      } catch {
        if (isActive) {
          setSavedResumeAvailable(false);
          setSavedResumeName("");
        }
      }
    };

    loadSavedResumeStatus();

    return () => {
      isActive = false;
    };
  }, [user, isResumeMode]);

  const getRecentPracticeContext = async () => {
    if (!user) {
      return {
        questions: [],
        answers: [],
      };
    }

    const { data, error } = await supabase
      .from("interview_answers")
      .select("question, user_answer, competency")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      console.warn("Could not load previous practice context:", error.message);

      return {
        questions: [],
        answers: [],
      };
    }

    const savedAnswers = (data || [])
      .filter((item) => item.question && item.user_answer)
      .map((item) => ({
        question: item.question,
        answer: item.user_answer,
        competency_label: item.competency || "",
      }));

    return {
      questions: savedAnswers.map((item) => item.question),
      answers: savedAnswers,
    };
  };

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

  const handleResumeFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setErrorMessage("");
    setResumeText("");
    setResumeStatus("");

    if (!selectedFile) {
      setResumeFile(null);
      setResumeFileName("");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setResumeFile(null);
      setResumeFileName("");
      setErrorMessage("Upload your resume in PDF format only.");
      return;
    }

    if (selectedFile.size > MAX_RESUME_SIZE) {
      setResumeFile(null);
      setResumeFileName("");
      setErrorMessage("Resume PDF must be smaller than 2 MB.");
      return;
    }

    setResumeFile(selectedFile);
    setResumeFileName(selectedFile.name);
    setResumeStatus("Resume selected. It will be read when you start.");
  };

  const readResumeForInterview = async (file) => {
    const result = await extractResumeTextFromFile(file);

    setResumeText(result.resumeText);
    setResumeFileName(result.fileName);
    setResumeStatus(
      `Resume read successfully: ${result.pageCount} page(s).`
    );

    return result.resumeText;
  };

  const readQuestionAloud = () => {
    if (!currentQuestion) {
      return;
    }

    if (!("speechSynthesis" in window)) {
      setVoiceError(true);
      setVoiceMessage(
        "Text-to-speech is not available in this browser."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(currentQuestion);

    speech.lang = "en-IN";
    speech.rate = 0.95;
    speech.pitch = 1;

    speech.onstart = () => {
      setVoiceError(false);
      setVoiceMessage("Reading the question aloud...");
    };

    speech.onend = () => {
      setVoiceError(false);
      setVoiceMessage("Finished reading the question.");
    };

    speech.onerror = () => {
      setVoiceError(true);
      setVoiceMessage(
        "The question could not be read aloud. You can still read it on screen."
      );
    };

    window.speechSynthesis.speak(speech);
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(true);
      setVoiceMessage(
        "Speech recognition is not supported in this browser. Please type your answer."
      );
      return;
    }

    if (isListening) {
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const recognition = new SpeechRecognition();
    const answerBeforeSpeaking = answer.trim();

    let finalTranscript = "";
    let recognitionFailed = false;

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError(false);
      setVoiceMessage("Listening... Speak your answer clearly.");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const transcript = event.results[index][0].transcript;

        if (event.results[index].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }

      const combinedAnswer = [
        answerBeforeSpeaking,
        finalTranscript.trim(),
        interimTranscript.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      setAnswer(combinedAnswer);
    };

    recognition.onerror = (event) => {
      recognitionFailed = true;
      setIsListening(false);
      setVoiceError(true);

      const errorMessages = {
        "not-allowed":
          "Microphone permission was denied. Allow microphone access and try again.",
        "no-speech":
          "No speech was detected. Try speaking closer to the microphone.",
        "audio-capture":
          "No microphone was found. Check your microphone connection.",
        network:
          "Speech recognition needs an internet connection in this browser.",
      };

      setVoiceMessage(
        errorMessages[event.error] ||
          "Voice recognition failed. Please type your answer instead."
      );
    };

    recognition.onend = () => {
      setIsListening(false);

      if (!recognitionFailed) {
        setVoiceMessage(
          "Voice input stopped. Review the text, then submit your answer."
        );
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setVoiceMessage("Stopping voice input...");
    }
  };

  const startInterview = async () => {
    setLoading(true);
    setErrorMessage("");
    setCurrentQuestion("");
    setAnswer("");
    setQuestionNumber(1);
    setHistory([]);
    setFeedback(null);
    setFeedbackQuestionNumber(null);
    setFinalReport(null);
    setSavedInterviewId(null);
    setVoiceMessage("");
    setVoiceError(false);
    setSessionPlan([]);
    setCurrentCompetency(null);
    setRecentQuestions([]);
    setRecentAnswerContext([]);

    try {
      let activeResumeText = resumeText;
      const activeJobDescription = jobDescription.trim();

      if (isResumeMode) {
        let fileToRead = resumeFile;

        if (!activeResumeText) {
          if (!fileToRead) {
            setResumeStatus("Loading your saved default resume...");

            const savedResume = await downloadSavedResume(user.id);

            fileToRead = savedResume.file;

            setResumeFileName(savedResume.fileName);
            setResumeStatus(
              `Using saved default resume: ${savedResume.fileName}`
            );
          }

          setResumeStatus("Reading your resume...");
          activeResumeText = await readResumeForInterview(fileToRead);
        }
      }

      if (
        isJobDescriptionMode &&
        activeJobDescription.length < MIN_JOB_DESCRIPTION_LENGTH
      ) {
        throw new Error(
          "Paste a detailed job description with at least 100 characters."
        );
      }

      const practiceContext = await getRecentPracticeContext();

      setRecentQuestions(practiceContext.questions);
      setRecentAnswerContext(practiceContext.answers);

      const response = await axios.post(
        `${API_BASE_URL}/start-interview`,
        {
          interview_type: interviewType,
          resume_text: isResumeMode ? activeResumeText : null,
          job_description: isJobDescriptionMode
            ? activeJobDescription
            : null,
          recent_questions: practiceContext.questions,
        }
      );

      if (!response.data.question) {
        throw new Error("The AI did not return an interview question.");
      }

      setCurrentQuestion(response.data.question);
      setCurrentCompetency(response.data.question_metadata || null);
      setSessionPlan(response.data.session_plan || []);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.detail ||
          error.message ||
          "Could not start the interview. Check whether the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const saveCompletedInterview = async (report, completedHistory) => {
    const reportToSave = {
      ...report,
      resume_file_name: isResumeMode ? resumeFileName : null,
      job_description: isJobDescriptionMode
        ? jobDescription.trim()
        : null,
    };

    const { data: interviewData, error: interviewError } = await supabase
      .from("interviews")
      .insert({
        user_id: user.id,
        interview_type: interviewType,
        status: "completed",
        overall_score: report.overall_score,
        readiness_level: report.interview_readiness,
        summary: report.summary,
        final_report: reportToSave,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (interviewError) {
      throw new Error(interviewError.message);
    }

    const answerRows = completedHistory.map((item, index) => ({
      interview_id: interviewData.id,
      user_id: user.id,
      question_number: index + 1,
      question: item.question,
      user_answer: item.answer,
      feedback: item.feedback,
      evidence: item.evidence || [],
      scores: item.scores,
      improved_answer: item.improved_answer,
      competency: item.competency?.label || "",
      competency_assessment: item.competency_assessment || {},
      consistency_check: item.consistency_check || {},
    }));

    const { error: answersError } = await supabase
      .from("interview_answers")
      .insert(answerRows);

    if (answersError) {
      await supabase
        .from("interviews")
        .delete()
        .eq("id", interviewData.id)
        .eq("user_id", user.id);

      throw new Error(answersError.message);
    }

    return interviewData.id;
  };

  const submitAnswer = async () => {
    if (!currentQuestion) {
      setErrorMessage("Start the interview before submitting an answer.");
      return;
    }

    const validationError = getAnswerValidationError(answer);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    if (isListening) {
      stopListening();
    }

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
          resume_text: isResumeMode ? resumeText : null,
          job_description: isJobDescriptionMode
            ? jobDescription.trim()
            : null,
          session_plan: sessionPlan,
          current_competency: currentCompetency,
          recent_questions: [
            ...recentQuestions,
            ...history.map((item) => item.question),
            questionBeingAnswered,
          ],
          prior_answers: [
            ...recentAnswerContext,
            ...history.map((item) => ({
              question: item.question,
              answer: item.answer,
              competency_label: item.competency?.label || "",
            })),
          ].slice(-10),
        }
      );

      const evaluation = evaluationResponse.data;

      setFeedback(evaluation);
      setFeedbackQuestionNumber(questionNumber);

      if (evaluation.requires_retry) {
        return;
      }

      const newRecord = {
        question: questionBeingAnswered,
        answer: answerBeingSubmitted,
        feedback: evaluation.feedback,
        scores: evaluation.scores,
        evidence: evaluation.evidence || [],
        improved_answer: evaluation.improved_answer,
        competency: evaluation.competency || currentCompetency,
        competency_assessment: evaluation.competency_assessment || {},
        consistency_check: evaluation.consistency_check || {},
      };

      const updatedHistory = [...history, newRecord];

      const isFinalQuestion =
        evaluation.is_complete || questionNumber === MAX_QUESTIONS;

      if (isFinalQuestion) {
        const reportResponse = await axios.post(
          `${API_BASE_URL}/final-report`,
          {
            interview_type: interviewType,
            history: updatedHistory,
            job_description: isJobDescriptionMode
              ? jobDescription.trim()
              : null,
          }
        );

        const report = reportResponse.data;

        const savedId = await saveCompletedInterview(
          report,
          updatedHistory
        );

        setHistory(updatedHistory);
        setFinalReport(report);
        setSavedInterviewId(savedId);
        setCurrentQuestion("");
        setAnswer("");
        return;
      }

      if (!evaluation.next_question?.trim()) {
        throw new Error(
          "The next question was not generated. Please start again."
        );
      }

      setHistory(updatedHistory);
      setCurrentQuestion(evaluation.next_question);
      setCurrentCompetency(evaluation.next_question_metadata || null);
      setQuestionNumber((previousNumber) => previousNumber + 1);
      setAnswer("");
      setVoiceMessage("");
      setVoiceError(false);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.detail ||
          error.message ||
          "Could not save or analyze your answer."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (label) =>
    String(label || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const contextLabel = isResumeMode
    ? "Resume-guided"
    : isJobDescriptionMode
    ? "Role-guided"
    : "AI mock interview";

  return (
    <div className="pp-interview-page">
      <section className="pp-page-hero">
        <p className="section-label">LIVE PRACTICE SESSION</p>
        <h1>{interviewType}</h1>
        <p>
          Answer five varied questions with meaningful examples to receive
          evidence-based feedback and a saved PrepPilot report.
        </p>

        <div className="pp-context-chips">
          <span className="pp-context-chip">{contextLabel}</span>
          <span className="pp-context-chip">
            {MAX_QUESTIONS}-question session
          </span>
          <span className="pp-context-chip">Voice supported</span>
        </div>
      </section>

      {!currentQuestion && !finalReport && (
        <section className="pp-interview-start-card">
          <div className="pp-start-content">
            <span className="pp-start-icon">
              {isResumeMode ? "📄" : isJobDescriptionMode ? "🎯" : "✦"}
            </span>

            <h2>
              {isResumeMode
                ? "Prepare from your resume"
                : isJobDescriptionMode
                ? "Add the job description"
                : "Ready to begin your practice?"}
            </h2>

            <p>
              {isResumeMode
                ? "PrepPilot will ask varied questions based on your real projects, skills, internships, and certifications."
                : isJobDescriptionMode
                ? "PrepPilot will tailor varied questions around the responsibilities, skills, and technologies in the job description."
                : "Each session covers different interview areas and avoids recently saved questions where possible."}
            </p>

            {isResumeMode && (
              <div className="pp-resource-panel">
                <div className="pp-resource-panel-title">
                  <span>📄</span>

                  <div>
                    <strong>Resume source</strong>
                    <p>Use your saved resume or upload another PDF for this session.</p>
                  </div>
                </div>

                {savedResumeAvailable && !resumeFile && (
                  <div className="pp-default-resume">
                    <strong>Saved default resume ready</strong>
                    <p>
                      {savedResumeName || "Your saved resume"} will be used for
                      this interview.
                    </p>
                  </div>
                )}

                {!savedResumeAvailable && !resumeFile && (
                  <div className="pp-default-resume pp-default-resume-warning">
                    <strong>No default resume found</strong>
                    <p>
                      Upload a PDF below or save a default resume from the
                      Profile page.
                    </p>
                  </div>
                )}

                <div className="pp-upload-row">
                  <label className="pp-file-label" htmlFor="resume-file">
                    {resumeFile
                      ? "Choose another resume"
                      : "Upload a different PDF"}
                  </label>

                  <input
                    id="resume-file"
                    className="pp-file-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleResumeFileChange}
                    disabled={loading}
                  />
                </div>

                <p className="pp-file-name">
                  {resumeFile
                    ? `Selected for this session: ${resumeFileName}`
                    : savedResumeAvailable
                    ? `Saved default: ${savedResumeName}`
                    : "No resume selected"}
                </p>

                {resumeStatus && (
                  <p className="pp-resource-status">{resumeStatus}</p>
                )}

                <p className="pp-resource-note">
                  PDF only · Maximum 2 MB · Your resume remains private to your account.
                </p>
              </div>
            )}

            {isJobDescriptionMode && (
              <div className="pp-resource-panel">
                <div className="pp-resource-panel-title">
                  <span>🎯</span>

                  <div>
                    <strong>Job description</strong>
                    <p>
                      Include the role, responsibilities, expected skills, and
                      technologies.
                    </p>
                  </div>
                </div>

                <textarea
                  className="pp-resource-textarea"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the complete job description here..."
                  disabled={loading}
                />

                <div className="pp-resource-meta">
                  <span>
                    Minimum required: {MIN_JOB_DESCRIPTION_LENGTH} characters
                  </span>

                  <strong>
                    {jobDescription.trim().length} characters
                  </strong>
                </div>
              </div>
            )}
          </div>

          <button
            className="session-primary-button pp-start-action"
            onClick={startInterview}
            disabled={
              loading ||
              (isResumeMode && !resumeFile && !savedResumeAvailable) ||
              (isJobDescriptionMode &&
                jobDescription.trim().length < MIN_JOB_DESCRIPTION_LENGTH)
            }
          >
            {loading
              ? isResumeMode
                ? "Reading resume..."
                : isJobDescriptionMode
                ? "Preparing questions..."
                : "Preparing session..."
              : isResumeMode
              ? resumeFile
                ? "Start with uploaded resume"
                : "Use saved resume"
              : isJobDescriptionMode
              ? "Start role-based session"
              : "Start interview"}
          </button>
        </section>
      )}

      {errorMessage && (
        <p className="error-message">{errorMessage}</p>
      )}

      {currentQuestion && (
        <section className="pp-interview-session">
          <div className="pp-question-top">
            <span className="pp-question-label">
              QUESTION {questionNumber} OF {MAX_QUESTIONS}
            </span>

            <span className="pp-question-progress">
              {MAX_QUESTIONS - questionNumber} question
              {MAX_QUESTIONS - questionNumber === 1 ? "" : "s"} remaining
            </span>
          </div>

          {currentCompetency && (
            <div className="pp-competency-chip">
              Testing competency: <strong>{currentCompetency.label}</strong>
            </div>
          )}

          <h2 className="pp-live-question">{currentQuestion}</h2>

          <div className="pp-voice-panel">
            <div>
              <strong>Voice tools</strong>
              <p>
                Listen to the question or speak your answer. You can edit the
                text before submitting.
              </p>
            </div>

            <div className="pp-voice-actions">
              <button
                className="pp-voice-button"
                onClick={readQuestionAloud}
                disabled={loading}
              >
                🔊 Read question
              </button>

              {!isListening ? (
                <button
                  className="pp-voice-button pp-voice-button-primary"
                  onClick={startListening}
                  disabled={loading || !voiceSupported}
                >
                  🎙 Start speaking
                </button>
              ) : (
                <button
                  className="pp-voice-button pp-voice-button-stop"
                  onClick={stopListening}
                  disabled={loading}
                >
                  ■ Stop listening
                </button>
              )}
            </div>
          </div>

          {!voiceSupported && (
            <p className="pp-voice-message pp-voice-message-error">
              Voice typing is unavailable in this browser. You can still type
              your answer normally.
            </p>
          )}

          {voiceMessage && (
            <p
              className={`pp-voice-message ${
                voiceError ? "pp-voice-message-error" : ""
              }`}
            >
              {voiceMessage}
            </p>
          )}

          <div className="pp-answer-section">
            <label className="pp-answer-label" htmlFor="interview-answer">
              <span>Your answer</span>
              <span>Use a clear example where possible</span>
            </label>

            <textarea
              id="interview-answer"
              className="pp-answer-textarea"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Write your answer here or use voice input..."
              disabled={loading}
            />

            <div className="pp-answer-footer">
              <p className="pp-answer-hint">
                Tip: Explain what you did, why you did it, and what result you achieved.
              </p>

              <button
                className="session-primary-button"
                onClick={submitAnswer}
                disabled={loading}
              >
                {loading ? "AI is evaluating..." : "Submit answer"}
              </button>
            </div>
          </div>
        </section>
      )}

      {feedback && (
        <section className="pp-feedback-section">
          <div className="pp-feedback-header">
            <div>
              <p className="section-label">
                QUESTION {feedbackQuestionNumber} FEEDBACK
              </p>
              <h2>Your coach review</h2>
            </div>

            <span className="pp-feedback-badge">
              {feedback.requires_retry ? "Retry needed" : "Feedback ready"}
            </span>
          </div>

          {!feedback.requires_retry && (
            <div className="pp-score-grid">
              {Object.entries(feedback.scores || {}).map(([key, value]) => (
                <div className="pp-score-card" key={key}>
                  <span>{formatLabel(key)}</span>
                  <strong>{value}/10</strong>
                </div>
              ))}
            </div>
          )}

          <div className="pp-feedback-card">
            <h3>Coach feedback</h3>
            <p>{feedback.feedback}</p>
          </div>

          {!feedback.requires_retry && feedback.competency_assessment && (
            <div className="pp-feedback-card pp-competency-feedback-card">
              <h3>Competency progress</h3>
              <p>
                <strong>{feedback.competency_assessment.performance_level || "Developing"}</strong>
                {" · "}
                {feedback.competency_assessment.improvement_focus ||
                  "Keep using specific examples to make this skill more visible."}
              </p>

              {feedback.competency_assessment.demonstrated?.length > 0 && (
                <ul className="pp-evidence-list">
                  {feedback.competency_assessment.demonstrated.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!feedback.requires_retry &&
            feedback.consistency_check?.status === "needs_clarification" && (
              <div className="pp-feedback-card pp-consistency-warning">
                <h3>Answer consistency coach</h3>
                <p>{feedback.consistency_check.note}</p>

                {feedback.consistency_check.compared_with && (
                  <p className="pp-consistency-context">
                    Compared with: {feedback.consistency_check.compared_with}
                  </p>
                )}
              </div>
            )}

          {!feedback.requires_retry &&
            feedback.evidence?.length > 0 && (
              <div className="pp-feedback-card">
                <h3>Evidence used for evaluation</h3>

                <ul className="pp-evidence-list">
                  {feedback.evidence.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

          {!feedback.requires_retry && feedback.improved_answer && (
            <div className="pp-feedback-card pp-feedback-card-improved">
              <h3>Improved answer direction</h3>
              <p>{feedback.improved_answer}</p>
            </div>
          )}
        </section>
      )}

      {finalReport && (
        <section className="pp-report-card">
          <div className="pp-report-heading-row">
            <div>
              <p className="section-label">SESSION SAVED</p>
              <h2>Your final PrepPilot report</h2>
            </div>

            <div className="pp-overall-score">
              <span>OVERALL SCORE</span>
              <strong>{finalReport.overall_score}/10</strong>
            </div>
          </div>

          <div className="pp-readiness-card">
            <span>Interview readiness</span>
            <strong>{finalReport.interview_readiness}</strong>
          </div>

          {finalReport.coverage && (
            <div className="pp-coverage-overview">
              <div>
                <span>Coverage confidence</span>
                <strong>{finalReport.coverage.coverage_confidence || 0}%</strong>
                <p>{finalReport.coverage.coverage_status}</p>
              </div>

              <div className="pp-coverage-meter" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        Number(finalReport.coverage.coverage_confidence || 0)
                      )
                    )}%`,
                  }}
                />
              </div>

              <p className="pp-coverage-note">
                {finalReport.coverage.coverage_note}
              </p>
            </div>
          )}

          <div className="pp-feedback-card pp-report-summary">
            <h3>Overall summary</h3>
            <p>{finalReport.summary}</p>
          </div>

          <div className="pp-report-grid">
            <div className="pp-report-list-card">
              <h3>Your strengths</h3>

              <ul>
                {(finalReport.strengths || []).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="pp-report-list-card">
              <h3>Areas to improve</h3>

              <ul>
                {(finalReport.improvement_areas || []).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pp-report-list-card" style={{ marginTop: "14px" }}>
            <h3>Your action plan</h3>

            <ol>
              {(finalReport.action_plan || []).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </div>

          {finalReport.coverage?.competency_map?.length > 0 && (
            <div className="pp-competency-map-card">
              <h3>Competency map</h3>
              <p>
                Your score is useful only when enough independent skills are tested.
                This map shows what PrepPilot covered in this session.
              </p>

              <div className="pp-competency-map">
                {finalReport.coverage.competency_map.map((item) => (
                  <div className="pp-competency-map-item" key={item.id}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.note || "No extra note available."}</span>
                    </div>

                    <span
                      className={`pp-competency-status pp-competency-status-${String(
                        item.status || "Untested"
                      )
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                    >
                      {item.average_score ? `${item.status} · ${item.average_score}/10` : item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {finalReport.consistency_overview && (
            <div
              className={`pp-consistency-summary ${
                finalReport.consistency_overview.flags?.length
                  ? "pp-consistency-summary-warning"
                  : ""
              }`}
            >
              <h3>Answer consistency coach</h3>
              <p>{finalReport.consistency_overview.message}</p>

              {finalReport.consistency_overview.flags?.length > 0 && (
                <ul className="pp-evidence-list">
                  {finalReport.consistency_overview.flags.map((item, index) => (
                    <li key={index}>{item.note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {finalReport.retest_recommendation && (
            <div className="pp-retest-card">
              <div>
                <p className="section-label">UNDERSTANDING RETEST</p>
                <h3>{finalReport.retest_recommendation.competency_label}</h3>
                <p>{finalReport.retest_recommendation.reason}</p>
              </div>

              <div className="pp-retest-question">
                <strong>Use this new scenario in your next practice:</strong>
                <p>{finalReport.retest_recommendation.scenario_question}</p>
              </div>
            </div>
          )}

          {finalReport.seven_day_sprint?.length > 0 && (
            <div className="pp-sprint-card">
              <div>
                <p className="section-label">7-DAY IMPROVEMENT SPRINT</p>
                <h3>Turn this report into measurable progress</h3>
              </div>

              <div className="pp-sprint-list">
                {finalReport.seven_day_sprint.map((item) => (
                  <div className="pp-sprint-day" key={item.day}>
                    <span>DAY {item.day}</span>
                    <strong>{item.focus}</strong>
                    <p>{item.task}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pp-report-actions">
            <button
              className="session-secondary-button"
              onClick={() => navigate("/interview-modes")}
            >
              Choose another mode
            </button>

            {savedInterviewId && (
              <DownloadReportButton interviewId={savedInterviewId} />
            )}

            <button
              className="session-primary-button"
              onClick={() => navigate(`/history/${savedInterviewId}`)}
            >
              View saved report
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default InterviewRoomPage;