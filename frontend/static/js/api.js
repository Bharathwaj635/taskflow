/**
 * Central fetch wrapper. Attaches the JWT token to every request and
 * redirects to /login automatically if the token is missing/expired.
 */
const API_BASE = "/api/v1";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // /auth/login returns 401 for wrong username/email/password — that's a
  // normal, expected error we want the caller's catch block to show to the
  // user, NOT a "your session expired" event. Only auto-logout on 401s from
  // everything else (protected routes with a missing/expired JWT).
  // /auth/me/password returns 401 for a wrong *current* password — that's a
  // normal error the Settings page should show inline, not a session expiry.
  const isAuthAttempt =
    path === "/auth/login" || path === "/auth/register" || path === "/auth/me/password";
  if (res.status === 401 && !isAuthAttempt) {
    localStorage.removeItem("token");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    return null;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || "Something went wrong.";
    throw new Error(message);
  }
  return data;
}

/** Shared UI helpers used across dashboard.js / projects.js / tasks.js */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function statusBadgeClass(status) {
  switch (status) {
    case "active":
    case "in_progress":
      return "bg-amber-100 text-amber-700";
    case "completed":
    case "done":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function priorityBadgeClass(priority) {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function initialsFor(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/** Populates the sidebar's user avatar/name footer, present on every logged-in page. */
async function loadSidebarUser() {
  const nameEl = document.getElementById("sidebar-user-name");
  const avatarEl = document.getElementById("sidebar-user-avatar");
  if (!nameEl || !avatarEl) return;

  try {
    const data = await apiFetch("/auth/me");
    if (!data) return;
    nameEl.textContent = data.user.name;
    avatarEl.textContent = initialsFor(data.user.name);
  } catch (err) {
    console.error("Failed to load sidebar user info", err);
  }
}
document.addEventListener("DOMContentLoaded", loadSidebarUser);

/**
 * Logs the user out and sends them back to the login page.
 * Defined here (not in auth.js) because api.js is the one script loaded on
 * EVERY page via base.html — the Log Out button lives in navbar.html /
 * bottom_nav.html, which render on every authenticated page, not just
 * login/register where auth.js is loaded.
 */
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}