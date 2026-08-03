function showMessage(el, message, isError = false) {
  if (!el) return;
  el.textContent = message;
  el.className = `text-sm ${isError ? "text-red-500" : "text-green-600"}`;
  el.classList.remove("hidden");
}

async function loadProfile() {
  try {
    const data = await apiFetch("/auth/me");
    if (!data) return;
    document.getElementById("profile-name").value = data.user.name;
    document.getElementById("profile-username").value = data.user.username;
    document.getElementById("profile-email").value = data.user.email;
  } catch (err) {
    console.error("Failed to load profile", err);
  }
}

const profileForm = document.getElementById("profile-form");
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("profile-name").value.trim();
    const msgEl = document.getElementById("profile-message");
    try {
      await apiFetch("/auth/me", { method: "PUT", body: JSON.stringify({ name }) });
      showMessage(msgEl, "Profile updated.");
      // Refresh the sidebar name/avatar too, since they cache the old value
      await loadSidebarUser();
    } catch (err) {
      showMessage(msgEl, err.message, true);
    }
  });
}

const passwordForm = document.getElementById("password-form");
if (passwordForm) {
  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const current_password = document.getElementById("current-password").value;
    const new_password = document.getElementById("new-password").value;
    const confirm_password = document.getElementById("confirm-password").value;
    const msgEl = document.getElementById("password-message");

    if (new_password !== confirm_password) {
      showMessage(msgEl, "New password and confirmation don't match.", true);
      return;
    }

    try {
      await apiFetch("/auth/me/password", {
        method: "PUT",
        body: JSON.stringify({ current_password, new_password }),
      });
      showMessage(msgEl, "Password updated.");
      passwordForm.reset();
    } catch (err) {
      showMessage(msgEl, err.message, true);
    }
  });
}

document.addEventListener("DOMContentLoaded", loadProfile);
