// Matches the backend's PasswordChangeSchema / RegisterSchema min length
// (see backend/app/schemas/user_schema.py) so the client-side check below
// always agrees with what the server would ultimately accept.
const MIN_PASSWORD_LENGTH = 6;

function showError(message) {
  const el = document.getElementById("error-msg");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
}

function clearError() {
  const el = document.getElementById("error-msg");
  if (!el) return;
  el.textContent = "";
  el.classList.add("hidden");
}

/**
 * Wires up any password-visibility toggle button on the page.
 * A toggle button must have:
 *   - data-toggle-password="<id of the password input>"
 *   - a child element matching ".eye-icon-open" and ".eye-icon-closed"
 * This runs on DOMContentLoaded so it works regardless of script load order,
 * and uses addEventListener instead of inline onclick for reliability.
 */
function initPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    const input = document.getElementById(btn.dataset.togglePassword);
    const openIcon = btn.querySelector(".eye-icon-open");
    const closedIcon = btn.querySelector(".eye-icon-closed");
    if (!input || !openIcon || !closedIcon) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const isCurrentlyHidden = input.type === "password";
      input.type = isCurrentlyHidden ? "text" : "password";
      openIcon.classList.toggle("hidden", isCurrentlyHidden);
      closedIcon.classList.toggle("hidden", !isCurrentlyHidden);
    });
  });
}
document.addEventListener("DOMContentLoaded", initPasswordToggles);

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const identifier = document.getElementById("identifier").value.trim();
    const password = document.getElementById("password").value;

    // --- Client-side validation (runs before any network call) ---
    if (!identifier) {
      showError("Please enter your username or email.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      showError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      if (data) {
        localStorage.setItem("token", data.token);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      // The backend (auth_service.authenticate_user) intentionally returns
      // one generic message whether the identifier or the password was
      // wrong, so we never reveal which field failed. We just surface it.
      showError(err.message || "Invalid username, email, or password.");
    }
  });
}

const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, username, email, password }),
      });
      if (data) {
        localStorage.setItem("token", data.token);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      showError(err.message);
    }
  });
}

// logout() now lives in api.js — it's loaded on every page (via base.html),
// whereas this file (auth.js) is only loaded on /login and /register.