import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { supabase } from "../lib/supabase";

function SignupPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSignup = async (event) => {
    event.preventDefault();

    if (fullName.trim().length < 2) {
      setIsError(true);
      setMessage("Enter your full name using at least 2 characters.");
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setMessage("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setIsError(false);
      setMessage(
        "Account created. Check your email inbox to verify your account, then sign in."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error.message || "Could not create your account. Please try again."
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
            <p className="auth-eyebrow">START WITH CONFIDENCE</p>
            <h1>Make every practice session count.</h1>

            <p>
              Build your interview preparation routine with AI questions,
              evidence-based feedback, and useful saved reports.
            </p>
          </div>

          <div className="auth-feature-stack">
            <div className="auth-feature-item">
              <span>01</span>
              <p>Choose HR, technical, resume, or role-based interviews.</p>
            </div>

            <div className="auth-feature-item">
              <span>02</span>
              <p>Practice with text or voice-assisted answers.</p>
            </div>

            <div className="auth-feature-item">
              <span>03</span>
              <p>Review feedback whenever you need it.</p>
            </div>
          </div>

          <p className="auth-quote">
            “Practice is where confidence begins.”
          </p>
        </div>
      </section>

      <main className="auth-content">
        <section className="auth-card">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark">PP</span>
            <strong>PrepPilot</strong>
          </div>

          <p className="auth-eyebrow auth-eyebrow-dark">CREATE ACCOUNT</p>
          <h2>Start practising smarter</h2>
          <p className="auth-subtitle">
            Create your PrepPilot account to save interview feedback and reports.
          </p>

          <form className="auth-form" onSubmit={handleSignup}>
            <label className="auth-field">
              <span>Full name</span>

              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                maxLength="80"
                required
              />
            </label>

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
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength="6"
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
              {loading ? "Creating account..." : "Create PrepPilot account"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default SignupPage;