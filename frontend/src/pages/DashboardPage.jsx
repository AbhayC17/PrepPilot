import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

import "../styles/dashboard-pages.css";

const dimensions = [
  "communication",
  "clarity",
  "confidence",
  "technical_accuracy",
];

const readableLabel = (text) =>
  String(text || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const average = (values) => {
  const validValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!validValues.length) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));
};

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "there";

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const { data: interviewData, error: interviewError } = await supabase
          .from("interviews")
          .select(
            "id, interview_type, overall_score, readiness_level, summary, completed_at, created_at, status"
          )
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false });

        if (interviewError) {
          throw new Error(interviewError.message);
        }

        const completedInterviews = interviewData || [];
        const interviewIds = completedInterviews.map((item) => item.id);

        let answerData = [];

        if (interviewIds.length) {
          const { data, error } = await supabase
            .from("interview_answers")
            .select("interview_id, scores")
            .in("interview_id", interviewIds);

          if (error) {
            throw new Error(error.message);
          }

          answerData = data || [];
        }

        setInterviews(completedInterviews);
        setAnswers(answerData);
      } catch (error) {
        setErrorMessage(
          error.message || "Could not load your dashboard right now."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  const dashboard = useMemo(() => {
    const overallAverage = Math.round(
      average(interviews.map((item) => item.overall_score))
    );

    const bestScore = interviews.length
      ? Math.max(...interviews.map((item) => Number(item.overall_score || 0)))
      : 0;

    const skillScores = dimensions.map((key) => {
      const score = Math.round(
        average(answers.map((item) => item.scores?.[key]))
      );

      return {
        key,
        label: readableLabel(key),
        score,
      };
    });

    const strongest = [...skillScores].sort(
      (first, second) => second.score - first.score
    )[0];

    const weakest = [...skillScores].sort(
      (first, second) => first.score - second.score
    )[0];

    const latestInterview = interviews[0];

    return {
      overallAverage,
      bestScore,
      skillScores,
      strongest,
      weakest,
      latestInterview,
      recentInterviews: interviews.slice(0, 4),
    };
  }, [answers, interviews]);

  const startPractice = (type) => {
    navigate(`/interview?type=${encodeURIComponent(type)}`);
  };

  if (loading) {
    return (
      <div className="empty-dashboard-card">
        <p>Loading your PrepPilot workspace...</p>
      </div>
    );
  }

  const hasInterviews = interviews.length > 0;
  const scoreProgress = Math.min(
    100,
    Math.max(0, dashboard.overallAverage * 10)
  );

  return (
    <div className="prep-dashboard">
      <section className="prep-hero">
        <div className="prep-hero-content">
          <p className="prep-hero-kicker">YOUR INTERVIEW WORKSPACE</p>

          <h1>
            Welcome back, {displayName}.
          </h1>

          <p>
            Build confidence through focused practice, clear feedback, and
            better answers every time you return.
          </p>

          <div className="prep-hero-actions">
            <button
              className="session-primary-button"
              onClick={() => navigate("/interview-modes")}
            >
              Start practising
            </button>

            <button
              className="prep-outline-button"
              onClick={() => navigate("/history")}
            >
              Review past reports
            </button>
          </div>
        </div>
      </section>

      {errorMessage && (
        <p className="error-message">{errorMessage}</p>
      )}

      <section className="prep-metrics-grid">
        <article className="prep-metric-card">
          <span className="prep-metric-label">
            <span className="prep-metric-icon">◈</span>
            Interviews completed
          </span>

          <strong>{interviews.length}</strong>
          <p>Every completed session is saved for review.</p>
        </article>

        <article className="prep-metric-card">
          <span className="prep-metric-label">
            <span className="prep-metric-icon">↗</span>
            Average score
          </span>

          <strong>
            {hasInterviews ? `${dashboard.overallAverage}/10` : "—"}
          </strong>
          <p>Based on all completed interview sessions.</p>
        </article>

        <article className="prep-metric-card">
          <span className="prep-metric-label">
            <span className="prep-metric-icon">✦</span>
            Strongest area
          </span>

          <strong>
            {hasInterviews && dashboard.strongest?.score
              ? `${dashboard.strongest.score}/10`
              : "—"}
          </strong>
          <p>
            {hasInterviews && dashboard.strongest?.score
              ? dashboard.strongest.label
              : "Complete an interview to unlock this insight."}
          </p>
        </article>

        <article className="prep-metric-card">
          <span className="prep-metric-label">
            <span className="prep-metric-icon">◎</span>
            Latest readiness
          </span>

          <strong>
            {dashboard.latestInterview?.readiness_level || "—"}
          </strong>

          <p>
            {dashboard.latestInterview
              ? "Based on your most recent session."
              : "Your readiness will appear here."}
          </p>
        </article>
      </section>

      {!hasInterviews ? (
        <section className="prep-panel">
          <div className="prep-empty-inline">
            <strong>Your preparation dashboard is ready.</strong>
            Complete one interview to unlock score insights, skill progress,
            and recent activity.
          </div>

          <div className="prep-hero-actions">
            <button
              className="session-primary-button"
              onClick={() => navigate("/interview-modes")}
            >
              Start your first interview
            </button>
          </div>
        </section>
      ) : (
        <section className="prep-dashboard-grid">
          <article className="prep-panel">
            <div className="prep-panel-header">
              <div>
                <h2>Performance snapshot</h2>
                <p>
                  A quick view of the skills measured across your saved answers.
                </p>
              </div>
            </div>

            <div className="prep-score-summary">
              <div
                className="prep-score-orb"
                style={{
                  "--score-progress": `${scoreProgress}%`,
                }}
              >
                <div className="prep-score-orb-inner">
                  <strong>{dashboard.overallAverage}/10</strong>
                  <span>AVERAGE SCORE</span>
                </div>
              </div>

              <div className="prep-skill-list">
                {dashboard.skillScores.map((skill) => (
                  <div className="prep-skill-row" key={skill.key}>
                    <span>{skill.label}</span>

                    <div className="prep-skill-track">
                      <div
                        className="prep-skill-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, skill.score * 10)
                          )}%`,
                        }}
                      />
                    </div>

                    <strong>{skill.score || "—"}</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="prep-panel">
            <div className="prep-panel-header">
              <div>
                <h2>Coach insight</h2>
                <p>Focus on one small improvement at a time.</p>
              </div>
            </div>

            <div className="prep-insight-card">
              <div className="prep-insight-highlight">
                <span>BEST AREA</span>
                <strong>
                  {dashboard.strongest?.score
                    ? dashboard.strongest.label
                    : "Keep practising"}
                </strong>
                <p>
                  {dashboard.strongest?.score
                    ? `Your current average is ${dashboard.strongest.score}/10 in this area.`
                    : "Your strongest area will appear after more practice."}
                </p>
              </div>

              <div className="prep-tip-box">
                <strong>Today’s focus</strong>
                <p>
                  {dashboard.weakest?.score
                    ? `Spend one session improving ${dashboard.weakest.label.toLowerCase()}. Use clear examples and explain your reasoning.`
                    : "Start with a short HR or Technical interview to create your first baseline."}
                </p>
              </div>
            </div>
          </article>
        </section>
      )}

      <section className="prep-panel">
        <div className="prep-panel-header">
          <div>
            <h2>Continue practising</h2>
            <p>Choose a focused session based on what you want to improve.</p>
          </div>

          <button
            className="prep-text-link"
            onClick={() => navigate("/interview-modes")}
          >
            View all modes →
          </button>
        </div>

        <div className="prep-quick-grid">
          <button
            className="prep-quick-card"
            onClick={() => startPractice("HR Interview")}
          >
            <span className="prep-quick-icon">🤝</span>
            <strong>Build HR confidence</strong>
            <p>Practice introductions, teamwork, strengths, and goals.</p>
            <span>Start HR practice →</span>
          </button>

          <button
            className="prep-quick-card"
            onClick={() => startPractice("Technical Interview")}
          >
            <span className="prep-quick-icon">💻</span>
            <strong>Sharpen technical answers</strong>
            <p>Review programming, DBMS, OOP, OS, and project questions.</p>
            <span>Start technical practice →</span>
          </button>

          <button
            className="prep-quick-card"
            onClick={() => startPractice("Resume-Based Interview")}
          >
            <span className="prep-quick-icon">📄</span>
            <strong>Tell your project story</strong>
            <p>Prepare confident answers based on your resume and experience.</p>
            <span>Start resume practice →</span>
          </button>
        </div>
      </section>

      <section className="prep-panel">
        <div className="prep-panel-header">
          <div>
            <h2>Recent activity</h2>
            <p>Open a saved session to revisit feedback and improved answers.</p>
          </div>

          {hasInterviews && (
            <button
              className="prep-text-link"
              onClick={() => navigate("/history")}
            >
              View history →
            </button>
          )}
        </div>

        {!hasInterviews ? (
          <div className="prep-empty-inline">
            <strong>No saved sessions yet.</strong>
            Your completed interviews will appear here.
          </div>
        ) : (
          <div className="prep-recent-list">
            {dashboard.recentInterviews.map((interview) => (
              <button
                className="prep-recent-item"
                key={interview.id}
                onClick={() => navigate(`/history/${interview.id}`)}
              >
                <span className="prep-recent-main">
                  <strong>{interview.interview_type}</strong>
                  <span>
                    {formatDate(
                      interview.completed_at || interview.created_at
                    )}{" "}
                    · {interview.readiness_level || "Saved report"}
                  </span>
                </span>

                <span className="prep-recent-score">
                  {interview.overall_score}/10
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;