import { useNavigate } from "react-router";

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <span className="not-found-code">404</span>
        <h1>This page is not on your prep plan.</h1>
        <p>
          The page you are looking for does not exist or may have been moved.
        </p>

        <button
          className="session-primary-button"
          onClick={() => navigate("/dashboard")}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default NotFoundPage;