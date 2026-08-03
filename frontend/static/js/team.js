let allMembers = [];
let currentUserId = null;

async function loadTeam() {
  try {
    // Needed to know which row is "me" for the "Just me" filter.
    const me = await apiFetch("/auth/me");
    currentUserId = me?.user?.id ?? null;
  } catch (err) {
    console.error("Failed to load current user", err);
  }

  try {
    allMembers = (await apiFetch("/team")) || [];
    applyTeamFilters();
  } catch (err) {
    console.error("Failed to load team", err);
  }
}

/** "owner" reads as "Head" everywhere in the UI; the backend/API value is unchanged. */
function roleLabel(role) {
  return role === "owner" ? "Head" : "Member";
}

function applyTeamFilters() {
  const role = document.getElementById("role-filter")?.value;
  const onlyMe = document.getElementById("only-me-filter")?.checked;

  let filtered = allMembers;
  if (role) filtered = filtered.filter((m) => m.role === role);
  if (onlyMe) filtered = filtered.filter((m) => m.id === currentUserId);

  renderTeam(filtered);
}

function renderTeam(members) {
  const container = document.getElementById("team-list");
  if (!container) return;

  if (members.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <p class="mb-1">No team members match this view.</p>
        <p class="text-sm">Add members from inside a project's Team tab.</p>
      </div>`;
    return;
  }

  container.innerHTML = members
    .map(
      (m) => `
    <div class="flex items-center gap-4 px-4 py-4">
      <span class="w-11 h-11 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center flex-shrink-0">
        ${escapeHtml(initialsFor(m.name))}
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-medium text-gray-900">${escapeHtml(m.name)}${m.id === currentUserId ? ` <span class="text-xs text-brand-600" style="font-weight: normal;">(You)</span>` : ""}</p>
        <p class="text-xs text-gray-500">${escapeHtml(roleLabel(m.role))}</p>
      </div>
      <div class="text-sm text-gray-500 hidden sm:block">${escapeHtml(m.email)}</div>
      <div class="text-right flex-shrink-0">
        <p class="text-sm font-medium text-gray-800">${m.project_count} project${m.project_count === 1 ? "" : "s"}</p>
        <p class="text-xs text-gray-400">${m.assigned_task_count} task${m.assigned_task_count === 1 ? "" : "s"} assigned</p>
      </div>
    </div>
  `
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", loadTeam);