import { useState } from "react";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { generateInterviewPdf } from "../utils/generateInterviewPdf";

import "../styles/interview-experience.css";

function DownloadReportButton({ interviewId }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleDownload = async () => {
    if (!user || !interviewId) {
      setIsError(true);
      setMessage("This report is not available for download.");
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const { data: interview, error: interviewError } = await supabase
        .from("interviews")
        .select(
          "id, interview_type, overall_score, readiness_level, summary, final_report, completed_at, created_at"
        )
        .eq("id", interviewId)
        .eq("user_id", user.id)
        .single();

      if (interviewError) {
        throw new Error(interviewError.message);
      }

      const { data: answers, error: answersError } = await supabase
        .from("interview_answers")
        .select(
          "question_number, question, user_answer, feedback, evidence, scores, improved_answer"
        )
        .eq("interview_id", interviewId)
        .eq("user_id", user.id)
        .order("question_number", { ascending: true });

      if (answersError) {
        throw new Error(answersError.message);
      }

      const candidateName =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Candidate";

      generateInterviewPdf({
        interview,
        answers: answers || [],
        candidateName,
      });

      setMessage("Your PrepPilot report has been downloaded.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error.message || "Could not create your PDF report."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pp-download-wrapper">
      <button
        className="session-secondary-button"
        onClick={handleDownload}
        disabled={loading}
      >
        {loading ? "Preparing PDF..." : "Download PDF Report"}
      </button>

      {message && (
        <p
          className={`pp-download-message ${
            isError ? "pp-download-message-error" : ""
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export default DownloadReportButton;