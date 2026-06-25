import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

import "../styles/interview-experience.css";

const MAX_RESUME_SIZE = 2 * 1024 * 1024;

function ProfilePage() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [resumePath, setResumePath] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [viewingResume, setViewingResume] = useState(false);
  const [removingResume, setRemovingResume] = useState(false);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const displayName =
    fullName ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Candidate";

  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, resume_path, resume_file_name")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        setFullName(
          data?.full_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            ""
        );

        setResumePath(data?.resume_path || "");
        setResumeFileName(data?.resume_file_name || "");
      } catch (error) {
        setIsError(true);
        setMessage(
          error.message || "Could not load your profile details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const showMessage = (text, error = false) => {
    setIsError(error);
    setMessage(text);
  };

  const handleSaveName = async (event) => {
    event.preventDefault();

    const cleanName = fullName.trim();

    if (cleanName.length < 2) {
      showMessage("Enter a name with at least 2 characters.", true);
      return;
    }

    setSavingName(true);
    setMessage("");

    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: cleanName,
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: cleanName,
            resume_path: resumePath || null,
            resume_file_name: resumeFileName || null,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        throw new Error(profileError.message);
      }

      showMessage("Your PrepPilot profile has been updated.");
    } catch (error) {
      showMessage(
        error.message || "Could not save your profile.",
        true
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleResumeUpload = async (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      showMessage("Upload your resume in PDF format only.", true);
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_RESUME_SIZE) {
      showMessage("Resume PDF must be smaller than 2 MB.", true);
      event.target.value = "";
      return;
    }

    setUploadingResume(true);
    setMessage("");

    try {
      const uploadPath = `${user.id}/default-resume.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(uploadPath, selectedFile, {
          upsert: true,
          contentType: "application/pdf",
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name:
              fullName.trim() ||
              user.user_metadata?.full_name ||
              "Candidate",
            resume_path: uploadPath,
            resume_file_name: selectedFile.name,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        throw new Error(profileError.message);
      }

      setResumePath(uploadPath);
      setResumeFileName(selectedFile.name);

      showMessage(
        "Your default resume has been saved for future resume-based interviews."
      );
    } catch (error) {
      showMessage(
        error.message || "Could not upload your resume.",
        true
      );
    } finally {
      setUploadingResume(false);
      event.target.value = "";
    }
  };

  const handleViewResume = async () => {
    if (!resumePath) {
      return;
    }

    setViewingResume(true);
    setMessage("");

    try {
      const { data, error } = await supabase.storage
        .from("resumes")
        .download(resumePath);

      if (error) {
        throw new Error(error.message);
      }

      const objectUrl = URL.createObjectURL(data);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 3000);
    } catch (error) {
      showMessage(
        error.message || "Could not open your saved resume.",
        true
      );
    } finally {
      setViewingResume(false);
    }
  };

  const handleRemoveResume = async () => {
    if (!resumePath) {
      return;
    }

    const shouldRemove = window.confirm(
      "Remove your saved default resume from PrepPilot?"
    );

    if (!shouldRemove) {
      return;
    }

    setRemovingResume(true);
    setMessage("");

    try {
      const { error: removeError } = await supabase.storage
        .from("resumes")
        .remove([resumePath]);

      if (removeError) {
        throw new Error(removeError.message);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name:
              fullName.trim() ||
              user.user_metadata?.full_name ||
              "Candidate",
            resume_path: null,
            resume_file_name: null,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        throw new Error(profileError.message);
      }

      setResumePath("");
      setResumeFileName("");

      showMessage("Your saved default resume has been removed.");
    } catch (error) {
      showMessage(
        error.message || "Could not remove your resume.",
        true
      );
    } finally {
      setRemovingResume(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-dashboard-card">
        <p>Loading your PrepPilot profile...</p>
      </div>
    );
  }

  return (
    <div className="pp-profile-page">
      <section className="pp-page-hero">
        <p className="section-label">YOUR PREPPILOT PROFILE</p>
        <h1>Keep your practice workspace ready.</h1>
        <p>
          Save your name and a private default resume to make future
          resume-based interview sessions faster.
        </p>
      </section>

      {message && (
        <p
          className={`pp-profile-message ${
            isError ? "pp-profile-message-error" : ""
          }`}
        >
          {message}
        </p>
      )}

      <section className="pp-profile-grid">
        <article className="pp-profile-card pp-profile-summary">
          <span className="pp-profile-avatar">{initial}</span>

          <h2>{displayName}</h2>
          <p>{user?.email || "PrepPilot user"}</p>

          <span className="pp-profile-ready-badge">
            AI interview workspace active
          </span>

          <p className="pp-profile-tip">
            Keep your default resume updated so PrepPilot can ask more relevant
            questions about your latest skills, projects, and experience.
          </p>
        </article>

        <article className="pp-profile-card">
          <h3>Profile details</h3>
          <p className="pp-profile-description">
            This name appears across your PrepPilot workspace and reports.
          </p>

          <form className="pp-profile-form" onSubmit={handleSaveName}>
            <label htmlFor="profile-name">Full name</label>

            <input
              id="profile-name"
              className="pp-profile-input"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your full name"
              maxLength="80"
              required
            />

            <button
              className="session-primary-button"
              type="submit"
              disabled={savingName}
            >
              {savingName ? "Saving profile..." : "Save profile"}
            </button>
          </form>
        </article>

        <article className="pp-profile-card pp-profile-card-full">
          <h3>Default resume</h3>
          <p className="pp-profile-description">
            Your default resume is private and is used only when you start a
            Resume-Based Interview.
          </p>

          {resumePath ? (
            <div className="pp-profile-resume-file">
              <div className="pp-profile-resume-info">
                <span className="pp-profile-file-icon">PDF</span>

                <div>
                  <strong>{resumeFileName || "default-resume.pdf"}</strong>
                  <span>Saved default resume</span>
                </div>
              </div>

              <div className="pp-profile-resume-actions">
                <button
                  className="pp-small-button"
                  onClick={handleViewResume}
                  disabled={viewingResume}
                >
                  {viewingResume ? "Opening..." : "View"}
                </button>

                <button
                  className="pp-small-danger-button"
                  onClick={handleRemoveResume}
                  disabled={removingResume}
                >
                  {removingResume ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ) : (
            <div className="pp-profile-resume-empty">
              No default resume saved yet. Upload a PDF below to make
              Resume-Based Interview sessions faster.
            </div>
          )}

          <div className="pp-upload-row" style={{ marginTop: "15px" }}>
            <label className="pp-file-label" htmlFor="profile-resume-upload">
              {uploadingResume
                ? "Uploading resume..."
                : resumePath
                ? "Replace default resume"
                : "Upload default resume"}
            </label>

            <input
              id="profile-resume-upload"
              className="pp-file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleResumeUpload}
              disabled={uploadingResume}
            />
          </div>

          <p className="pp-resource-note">
            PDF only · Maximum 2 MB · Stored privately in your PrepPilot account.
          </p>
        </article>
      </section>
    </div>
  );
}

export default ProfilePage;