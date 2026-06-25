import axios from "axios";

import { supabase } from "../lib/supabase";
import { API_BASE_URL } from "../config/appConfig";

export async function getSavedResumeInfo(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("resume_path, resume_file_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    resumePath: data?.resume_path || "",
    resumeFileName: data?.resume_file_name || "",
  };
}

export async function downloadSavedResume(userId) {
  const { resumePath, resumeFileName } = await getSavedResumeInfo(userId);

  if (!resumePath) {
    throw new Error(
      "No saved default resume was found. Upload one from the Profile page."
    );
  }

  const { data: fileBlob, error } = await supabase.storage
    .from("resumes")
    .download(resumePath);

  if (error) {
    throw new Error(error.message);
  }

  const fileName = resumeFileName || "default-resume.pdf";

  const file = new File([fileBlob], fileName, {
    type: fileBlob.type || "application/pdf",
  });

  return {
    file,
    fileName,
  };
}

export async function extractResumeTextFromFile(file) {
  const formData = new FormData();

  formData.append("resume", file);

  const response = await axios.post(
    `${API_BASE_URL}/extract-resume`,
    formData
  );

  if (!response.data.resume_text) {
    throw new Error("No readable text was found in the resume.");
  }

  return {
    resumeText: response.data.resume_text,
    fileName: response.data.file_name,
    pageCount: response.data.page_count,
  };
}