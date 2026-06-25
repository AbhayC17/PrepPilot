import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const navigationItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "◈",
  },
  {
    label: "Practice",
    path: "/interview-modes",
    icon: "◉",
  },
  {
    label: "Previous Interviews",
    path: "/history",
    icon: "▣",
  },
  {
    label: "Profile",
    path: "/profile",
    icon: "◎",
  },
];

function AppLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Candidate";

  const initial = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-shell">
      {mobileMenuOpen && (
        <button
          className="mobile-sidebar-overlay"
          onClick={closeMobileMenu}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        className={`app-sidebar ${
          mobileMenuOpen ? "app-sidebar-open" : ""
        }`}
      >
        <div className="sidebar-top">
          <button
            className="brand-lockup"
            onClick={() => {
              navigate("/dashboard");
              closeMobileMenu();
            }}
            aria-label="Open PrepPilot dashboard"
          >
            <span className="brand-mark">PP</span>

            <span className="brand-copy">
              <strong>PrepPilot</strong>
              <small>Interview practice</small>
            </span>
          </button>

          <button
            className="mobile-close-button"
            onClick={closeMobileMenu}
            aria-label="Close navigation menu"
          >
            ×
          </button>
        </div>

        <nav className="sidebar-navigation">
          <p className="sidebar-section-title">WORKSPACE</p>

          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `sidebar-nav-link ${
                  isActive ? "sidebar-nav-link-active" : ""
                }`
              }
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-upgrade-card">
            <span className="sidebar-upgrade-icon">✦</span>
            <strong>Build confidence daily</strong>
            <p>Practice, review feedback, and improve one answer at a time.</p>
          </div>

          <NavLink
            to="/profile"
            onClick={closeMobileMenu}
            className="sidebar-profile-card"
          >
            <span className="sidebar-profile-avatar">{initial}</span>

            <span className="sidebar-profile-copy">
              <strong>{displayName}</strong>
              <small>{user?.email || "Signed in"}</small>
            </span>
          </NavLink>

          <button
            className="sidebar-signout-button"
            onClick={handleSignOut}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            ☰
          </button>

          <div className="topbar-brand-mobile">
            <span className="topbar-brand-mark">PP</span>
            <strong>PrepPilot</strong>
          </div>

          <div className="topbar-right">
            <span className="topbar-status-dot" />
            <span className="topbar-status-text">AI Coach Ready</span>

            <NavLink to="/profile" className="topbar-avatar">
              {initial}
            </NavLink>
          </div>
        </header>

        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;