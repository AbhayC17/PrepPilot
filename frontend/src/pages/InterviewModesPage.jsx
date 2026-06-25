import { useNavigate } from "react-router";

import "../styles/dashboard-pages.css";

const interviewModes = [
  {
    title: "HR Interview",
    icon: "🤝",
    tag: "Behavioural",
    softColor: "#eef6f1",
    description:
      "Practice introductions, strengths, teamwork, difficult situations, and career goals.",
  },
  {
    title: "Technical Interview",
    icon: "💻",
    tag: "Core concepts",
    softColor: "#eef2ff",
    description:
      "Prepare for programming, OOP, DBMS, OS, APIs, and technical project questions.",
  },
  {
    title: "DSA Interview",
    icon: "🧩",
    tag: "Problem solving",
    softColor: "#f7f0ff",
    description:
      "Work through data structures, algorithms, time complexity, and edge cases.",
  },
  {
    title: "Frontend Interview",
    icon: "🎨",
    tag: "Web development",
    softColor: "#fff4ed",
    description:
      "Practice React, JavaScript, HTML, CSS, APIs, and frontend project discussions.",
  },
  {
    title: "Backend Interview",
    icon: "⚙️",
    tag: "Systems",
    softColor: "#eef7f7",
    description:
      "Prepare for APIs, authentication, databases, debugging, and backend design questions.",
  },
  {
    title: "Resume-Based Interview",
    icon: "📄",
    tag: "Personalised",
    softColor: "#fff8e9",
    description:
      "Use your saved resume or upload a PDF for questions based on your own experience.",
  },
  {
    title: "Job Description-Based Interview",
    icon: "🎯",
    tag: "Role focused",
    softColor: "#f0f4ff",
    description:
      "Paste a job description and practise answers aligned with its skills and responsibilities.",
  },
];

function InterviewModesPage() {
  const navigate = useNavigate();

  const startInterview = (interviewType) => {
    navigate(`/interview?type=${encodeURIComponent(interviewType)}`);
  };

  return (
    <div className="prep-practice-page">
      <div className="page-title-block">
        <p className="section-label">PRACTICE CENTER</p>
        <h2>Choose how you want to prepare</h2>
        <p>
          Every PrepPilot session gives you five focused questions, feedback
          after each answer, and a saved report at the end.
        </p>
      </div>

      <section className="prep-practice-banner">
        <div>
          <h3>Small practice sessions. Better interview habits.</h3>
          <p>
            Choose a mode that matches your next goal. You can type answers or
            use voice-assisted practice in the interview room.
          </p>
        </div>

        <div className="prep-practice-count">
          <strong>5</strong>
          <span>QUESTIONS / SESSION</span>
        </div>
      </section>

      <section className="prep-mode-grid">
        {interviewModes.map((mode) => (
          <article className="prep-mode-card" key={mode.title}>
            <div className="prep-mode-top">
              <span
                className="prep-mode-icon"
                style={{
                  "--card-soft": mode.softColor,
                }}
              >
                {mode.icon}
              </span>

              <span className="prep-mode-tag">{mode.tag}</span>
            </div>

            <h3>{mode.title}</h3>
            <p>{mode.description}</p>

            <div className="prep-mode-footer">
              <span className="prep-mode-meta">5-question session</span>

              <button
                className="prep-mode-start"
                onClick={() => startInterview(mode.title)}
              >
                Start practice →
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export default InterviewModesPage;