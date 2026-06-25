import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";

function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="auth-loading-screen">
        Checking your login session...
      </main>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;