import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import DownloadReportButton from "../components/DownloadReportButton";

import "../styles/interview-experience.css";

function InterviewReportPage() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [interview, setInterview] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadReport = async () => {
      if (!user) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const { data: interviewData, error: interviewError } = await supabase
        .from("interviews")
        .select(
          "id, interview_type, overall_score, readiness_level, summary, final_report, completed_at, created_at"
        )
        .eq("id", interviewId)
        .eq("user_id", user.id)
        .single();

      if (interviewError) {
        setErrorMessage("Interview report not found.");
        setLoading(false);
        return;
      }

      const { data: answerData, error: answerError } = await supabase
        .from("interview_answers")
        .select(
          "question_number, question, user_answer, feedback, evidence, scores, improved_answer, competency, competency_assessment, consistency_check"
        )
        .eq("interview_id", interviewId)
        .eq("user_id", user.id)
        .order("question_number", { ascending: true });

      if (answerError) {
        setErrorMessage(answerError.message);
        setLoading(false);
        return;
      }

      setInterview(interviewData);
      setAnswers(answerData || []);
      setLoading(false);
    };

    loadReport();
  }, [interviewId, user]);

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateValue));
  };

  const formatLabel = (label) =>
    String(label || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const getStatusClassName = (status) =>
    `pp-competency-status-${String(status || "Untested")
      .toLowerCase()
      .replaceAll(" ", "-")}`;

  if (loading) {
    return (
      <div className="empty-dashboard-card">
        <p>Loading your PrepPilot report...</p>
      </div>
    );
  }

  if (errorMessage || !interview) {
    return (
      <div className="empty-dashboard-card">
        <h3>Unable to open this report</h3>
        <p>{errorMessage || "This saved report is unavailable."}</p>

        <button
          className="session-primary-button"
          onClick={() => navigate("/history")}
        >
          Back to Previous Interviews
        </button>
      </div>
    );
  }

  const report = interview.final_report || {};
  const coverage = report.coverage || {};
  const consistencyOverview = report.consistency_overview || {};

  return (
    <div className="pp-report-page">
      <div className="pp-report-topbar">
        <button
          className="pp-back-link"
          onClick={() => navigate("/history")}
        >
          ← Back to Previous Interviews
        </button>
      </div>

      <section className="pp-page-hero">
        <p className="section-label">SAVED INTERVIEW REPORT</p>
        <h1>{interview.interview_type}</h1>
        <p>{formatDate(interview.completed_at || interview.created_at)}</p>

        <div className="pp-context-chips">
          <span className="pp-context-chip">Evidence-based feedback</span>
          <span className="pp-context-chip">
            {answers.length}-question review
          </span>
          <span className="pp-context-chip">PDF available</span>
        </div>
      </section>

      <section className="pp-report-card">
        <div className="pp-report-heading-row">
          <div>
            <p className="section-label">FINAL PERFORMANCE</p>
            <h2>Interview summary</h2>
          </div>

          <div className="pp-overall-score">
            <span>OVERALL SCORE</span>
            <strong>{interview.overall_score}/10</strong>
          </div>
        </div>

        <div className="pp-readiness-card">
          <span>Interview readiness</span>
          <strong>{interview.readiness_level}</strong>
        </div>

        {coverage.coverage_confidence !== undefined && (
          <div className="pp-coverage-overview">
            <div>
              <span>Coverage confidence</span>
              <strong>{coverage.coverage_confidence}%</strong>
              <p>{coverage.coverage_status}</p>
            </div>

            <div className="pp-coverage-meter" aria-hidden="true">
              <span
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, Number(coverage.coverage_confidence || 0))
                  )}%`,
                }}
              />
            </div>

            <p className="pp-coverage-note">{coverage.coverage_note}</p>
          </div>
        )}

        <div className="pp-feedback-card pp-report-summary">
          <h3>Overall summary</h3>
          <p>{interview.summary}</p>
        </div>

        <div className="pp-report-grid">
          <div className="pp-report-list-card">
            <h3>Your strengths</h3>

            <ul>
              {(report.strengths || []).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="pp-report-list-card">
            <h3>Areas to improve</h3>

            <ul>
              {(report.improvement_areas || []).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pp-report-list-card" style={{ marginTop: "14px" }}>
          <h3>Your action plan</h3>

          <ol>
            {(report.action_plan || []).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
        </div>

        {coverage.competency_map?.length > 0 && (
          <div className="pp-competency-map-card">
            <h3>Competency map</h3>
            <p>
              This shows the independent interview skills covered in this
              session. Untested areas should not be treated as strengths or
              weaknesses yet.
            </p>

            <div className="pp-competency-map">
              {coverage.competency_map.map((item) => (
                <div className="pp-competency-map-item" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.note || "No extra note available."}</span>
                  </div>

                  <span
                    className={`pp-competency-status ${getStatusClassName(
                      item.status
                    )}`}
                  >
                    {item.average_score
                      ? `${item.status} · ${item.average_score}/10`
                      : item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {consistencyOverview.message && (
          <div
            className={`pp-consistency-summary ${
              consistencyOverview.flags?.length
                ? "pp-consistency-summary-warning"
                : ""
            }`}
          >
            <h3>Answer consistency coach</h3>
            <p>{consistencyOverview.message}</p>

            {consistencyOverview.flags?.length > 0 && (
              <ul className="pp-evidence-list">
                {consistencyOverview.flags.map((item, index) => (
                  <li key={index}>{item.note}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {report.retest_recommendation && (
          <div className="pp-retest-card">
            <div>
              <p className="section-label">UNDERSTANDING RETEST</p>
              <h3>{report.retest_recommendation.competency_label}</h3>
              <p>{report.retest_recommendation.reason}</p>
            </div>

            <div className="pp-retest-question">
              <strong>Use this new scenario in your next practice:</strong>
              <p>{report.retest_recommendation.scenario_question}</p>
            </div>
          </div>
        )}

        {report.seven_day_sprint?.length > 0 && (
          <div className="pp-sprint-card">
            <div>
              <p className="section-label">7-DAY IMPROVEMENT SPRINT</p>
              <h3>Turn this report into measurable progress</h3>
            </div>

            <div className="pp-sprint-list">
              {report.seven_day_sprint.map((item) => (
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
          <DownloadReportButton interviewId={interview.id} />

          <button
            className="session-primary-button"
            onClick={() => navigate("/interview-modes")}
          >
            Practice again
          </button>
        </div>
      </section>

      <section className="pp-answer-review-list">
        <div className="page-title-block">
          <p className="section-label">QUESTION-BY-QUESTION REVIEW</p>
          <h2>Your answers and detailed feedback</h2>
          <p>
            Review what you said, which competency was tested, why it was
            evaluated that way, and how you can improve next time.
          </p>
        </div>

        {answers.map((item) => (
          <article className="pp-answer-review-card" key={item.question_number}>
            <div className="pp-review-question-top">
              <p className="pp-review-question-label">
                QUESTION {item.question_number}
              </p>

              {item.competency && (
                <span className="pp-competency-chip">
                  {item.competency}
                </span>
              )}
            </div>

            <h3>{item.question}</h3>

            <div className="pp-feedback-card">
              <h3>Your answer</h3>
              <p>{item.user_answer}</p>
            </div>

            <div className="pp-review-score-grid">
              {Object.entries(item.scores || {}).map(([key, value]) => (
                <div className="pp-score-card" key={key}>
                  <span>{formatLabel(key)}</span>
                  <strong>{value}/10</strong>
                </div>
              ))}
            </div>

            <div className="pp-feedback-card">
              <h3>Coach feedback</h3>
              <p>{item.feedback}</p>
            </div>

            {item.competency_assessment?.performance_level && (
              <div className="pp-feedback-card pp-competency-feedback-card">
                <h3>Competency progress</h3>
                <p>
                  <strong>
                    {item.competency_assessment.performance_level}
                  </strong>
                  {" · "}
                  {item.competency_assessment.improvement_focus ||
                    "Keep using clear examples to strengthen this area."}
                </p>

                {item.competency_assessment.demonstrated?.length > 0 && (
                  <ul className="pp-evidence-list">
                    {item.competency_assessment.demonstrated.map(
                      (evidence, index) => (
                        <li key={index}>{evidence}</li>
                      )
                    )}
                  </ul>
                )}
              </div>
            )}

            {item.consistency_check?.status === "needs_clarification" && (
              <div className="pp-feedback-card pp-consistency-warning">
                <h3>Answer consistency coach</h3>
                <p>{item.consistency_check.note}</p>

                {item.consistency_check.compared_with && (
                  <p className="pp-consistency-context">
                    Compared with: {item.consistency_check.compared_with}
                  </p>
                )}
              </div>
            )}

            {item.evidence?.length > 0 && (
              <div className="pp-feedback-card">
                <h3>Evidence used</h3>

                <ul className="pp-evidence-list">
                  {item.evidence.map((evidence, index) => (
                    <li key={index}>{evidence}</li>
                  ))}
                </ul>
              </div>
            )}

            {item.improved_answer && (
              <div className="pp-feedback-card pp-feedback-card-improved">
                <h3>Improved answer direction</h3>
                <p>{item.improved_answer}</p>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

export default InterviewReportPage;