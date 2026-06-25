import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { supabase } from "../lib/supabase";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setIsError(true);
      setMessage(
        error.message || "Could not sign in. Check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-panel-inner">
          <div className="auth-brand">
            <span className="auth-brand-mark">PP</span>

            <div>
              <strong>PrepPilot</strong>
              <small>AI interview practice</small>
            </div>
          </div>

          <div className="auth-hero-copy">
            <p className="auth-eyebrow">PRACTISE WITH PURPOSE</p>
            <h1>Walk into interviews more prepared.</h1>

            <p>
              Simulate realistic interviews, get structured feedback, and turn
              every practice session into measurable improvement.
            </p>
          </div>

          <div className="auth-feature-stack">
            <div className="auth-feature-item">
              <span>01</span>
              <p>Personalised interview modes for your preparation goals.</p>
            </div>

            <div className="auth-feature-item">
              <span>02</span>
              <p>Clear feedback, improved answers, and saved reports.</p>
            </div>

            <div className="auth-feature-item">
              <span>03</span>
              <p>Resume and job-description based interview practice.</p>
            </div>
          </div>

          <p className="auth-quote">
            “Better preparation creates calmer interviews.”
          </p>
        </div>
      </section>

      <main className="auth-content">
        <section className="auth-card">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark">PP</span>
            <strong>PrepPilot</strong>
          </div>

          <p className="auth-eyebrow auth-eyebrow-dark">WELCOME BACK</p>
          <h2>Continue your preparation</h2>
          <p className="auth-subtitle">
            Sign in to practise interviews and review your progress.
          </p>

          <form className="auth-form" onSubmit={handleLogin}>
            <label className="auth-field">
              <span>Email address</span>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-field">
              <span>Password</span>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>

            {message && (
              <p
                className={`auth-message ${
                  isError ? "auth-message-error" : "auth-message-success"
                }`}
              >
                {message}
              </p>
            )}

            <button
              className="auth-submit-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in to PrepPilot"}
            </button>
          </form>

          <p className="auth-footer">
            New to PrepPilot? <Link to="/signup">Create your account</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;