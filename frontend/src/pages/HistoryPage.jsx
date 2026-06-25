import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

import "../styles/dashboard-pages.css";

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

function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [selectedMode, setSelectedMode] = useState("All");

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("interviews")
        .select(
          "id, interview_type, overall_score, readiness_level, summary, completed_at, created_at, status"
        )
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setInterviews(data || []);
      }

      setLoading(false);
    };

    loadHistory();
  }, [user]);

  const interviewModes = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(interviews.map((item) => item.interview_type))
      ),
    ];
  }, [interviews]);

  const visibleInterviews = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return interviews.filter((interview) => {
      const matchesMode =
        selectedMode === "All" ||
        interview.interview_type === selectedMode;

      const matchesSearch =
        !normalizedSearch ||
        interview.interview_type
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        interview.summary?.toLowerCase().includes(normalizedSearch) ||
        interview.readiness_level
          ?.toLowerCase()
          .includes(normalizedSearch);

      return matchesMode && matchesSearch;
    });
  }, [interviews, searchText, selectedMode]);

  if (loading) {
    return (
      <div className="empty-dashboard-card">
        <p>Loading your saved practice sessions...</p>
      </div>
    );
  }

  return (
    <div className="prep-history-page">
      <div className="page-title-block">
        <p className="section-label">PREVIOUS INTERVIEWS</p>
        <h2>Your saved feedback library</h2>
        <p>
          Revisit your questions, improved answers, performance reports, and
          downloadable PDFs whenever you want.
        </p>
      </div>

      {errorMessage && (
        <p className="error-message">{errorMessage}</p>
      )}

      {!interviews.length ? (
        <section className="prep-panel">
          <div className="prep-empty-inline">
            <strong>Your saved reports will appear here.</strong>
            Finish an interview session to build your own preparation history.
          </div>

          <div className="prep-hero-actions">
            <button
              className="session-primary-button"
              onClick={() => navigate("/interview-modes")}
            >
              Start practising
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="prep-history-toolbar">
            <input
              className="prep-history-search"
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search interview type, readiness, or feedback..."
            />

            <select
              className="prep-history-select"
              value={selectedMode}
              onChange={(event) => setSelectedMode(event.target.value)}
            >
              {interviewModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === "All" ? "All interview modes" : mode}
                </option>
              ))}
            </select>
          </section>

          <p className="prep-history-results">
            {visibleInterviews.length} saved{" "}
            {visibleInterviews.length === 1 ? "session" : "sessions"} found
          </p>

          {!visibleInterviews.length ? (
            <section className="prep-panel">
              <div className="prep-empty-inline">
                <strong>No matching sessions found.</strong>
                Try another search term or switch back to all interview modes.
              </div>
            </section>
          ) : (
            <section className="prep-history-grid">
              {visibleInterviews.map((interview) => (
                <article className="prep-history-card" key={interview.id}>
                  <div className="prep-history-card-top">
                    <div>
                      <p className="prep-history-date">
                        {formatDate(
                          interview.completed_at || interview.created_at
                        )}
                      </p>

                      <h3>{interview.interview_type}</h3>
                    </div>

                    <div className="prep-history-score">
                      <span>SCORE</span>
                      <strong>{interview.overall_score}/10</strong>
                    </div>
                  </div>

                  <span className="prep-history-readiness">
                    {interview.readiness_level || "Saved Report"}
                  </span>

                  <p className="prep-history-summary">
                    {interview.summary ||
                      "Open this report to review detailed feedback and improved answers."}
                  </p>

                  <div className="prep-history-footer">
                    <span>5-question session</span>

                    <button
                      className="prep-history-open-button"
                      onClick={() => navigate(`/history/${interview.id}`)}
                    >
                      Open report →
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default HistoryPage;