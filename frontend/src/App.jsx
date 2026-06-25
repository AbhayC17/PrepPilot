import { Navigate, Route, Routes } from "react-router";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import InterviewModesPage from "./pages/InterviewModesPage";
import InterviewRoomPage from "./pages/InterviewRoomPage";
import HistoryPage from "./pages/HistoryPage";
import InterviewReportPage from "./pages/InterviewReportPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/interview-modes" element={<InterviewModesPage />} />
          <Route path="/interview" element={<InterviewRoomPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route
            path="/history/:interviewId"
            element={<InterviewReportPage />}
          />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;