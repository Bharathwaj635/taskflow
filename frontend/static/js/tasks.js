/**
 * Project detail page: overview stats, tabs, and the task checklist.
 * PROJECT_ID is read from the data-project-id attribute set on <main>
 * in project_detail.html (avoids inline-templated <script> values,
 * which trip up editor JS linters since `{{ project_id }}` isn't valid
 * JS syntax on its own).
 */
const PROJECT_ID = parseInt(document.querySelector("[data-project-id]").dataset.projectId, 10);

let taskFilter = "";
let currentProject = null;
let projectMembers = [];

/** Fills the Create Task form's assignee dropdown with current project members. */
function populateAssigneeSelect() {
  const select = document.getElementById("task-assignee");
  if (!select) return;
  const current = select.value;
  select.innerHTML =
    `<option value="">Unassigned</option>` +
    projectMembers.map((m) => `<option value="${m.user_id}">${escapeHtml(m.name || m.email)}</option>`).join("");
  select.value = current || "";
}

async function loadProjectDetail() {
  try {
    const project = await apiFetch(`/projects/${PROJECT_ID}`);
    if (!project) return;
    currentProject = project;

    document.getElementById("project-name").textContent = project.name;
    document.getElementById("project-description").textContent = project.description || "";
    const badge = document.getElementById("project-status-badge");
    badge.textContent = project.status;
    badge.className = `text-xs font-medium px-2 py-1 rounded-full ${statusBadgeClass(project.status)}`;

    const pct = project.task_count ? Math.round((project.done_count / project.task_count) * 100) : 0;
    document.getElementById("progress-bar").style.width = `${pct}%`;
    document.getElementById("progress-pct").textContent = `${pct}%`;
    document.getElementById("stat-total").textContent = project.task_count ?? 0;
    document.getElementById("stat-done").textContent = project.done_count ?? 0;
  } catch (err) {
    console.error("Failed to load project", err);
  }
  loadTasks();
  loadMembers();
  loadTeamMembers();
}

function setTab(tab) {
  document.getElementById("tab-overview").classList.toggle("hidden", tab !== "overview");
  document.getElementById("tab-tasks").classList.toggle("hidden", tab !== "tasks");
  document.getElementById("tab-team").classList.toggle("hidden", tab !== "team");
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("border-brand-500", active);
    btn.classList.toggle("text-brand-600", active);
    btn.classList.toggle("border-transparent", !active);
    btn.classList.toggle("text-gray-500", !active);
  });
}

/** "owner" reads as "Head" everywhere in the UI; the backend/API value is unchanged. */
function roleLabel(role) {
  return role === "owner" ? "Head" : "Member";
}

async function loadTasks() {
  try {
    const tasks = await apiFetch(`/projects/${PROJECT_ID}/tasks`);
    renderTaskStats(tasks || []);
    const filtered = taskFilter ? (tasks || []).filter((t) => t.status === taskFilter) : tasks || [];
    renderTaskList(filtered);
  } catch (err) {
    console.error("Failed to load tasks", err);
  }
}

function renderTaskStats(tasks) {
  const counts = { all: tasks.length, todo: 0, in_progress: 0, done: 0 };
  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status] += 1;
  });
  document.getElementById("tcount-all").textContent = counts.all;
  document.getElementById("tcount-todo").textContent = counts.todo;
  document.getElementById("tcount-in_progress").textContent = counts.in_progress;
  document.getElementById("tcount-done").textContent = counts.done;
  document.getElementById("stat-inprogress").textContent = counts.in_progress;
  document.getElementById("stat-todo").textContent = counts.todo;
}

function renderTaskList(tasks) {
  const container = document.getElementById("tasks-list");
  if (!container) return;

  if (tasks.length === 0) {
    container.innerHTML = `<p class="text-sm text-gray-500 text-center py-8">No tasks in this view.</p>`;
    return;
  }

  container.innerHTML = tasks.map((t) => renderTaskRow(t)).join("");
}

function renderTaskRow(t) {
  const isDone = t.status === "done";
  return `
    <div class="flex items-center gap-3 px-4 py-3">
      <button onclick="toggleTaskDone(${t.id}, '${t.status}')"
              class="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                     ${isDone ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-brand-400"}"
              aria-label="Toggle done">
        ${isDone ? `<svg class="w-3 h-3 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>` : ""}
      </button>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium ${isDone ? "text-gray-400 line-through" : "text-gray-800"}">${escapeHtml(t.title)}</p>
        ${t.description ? `<p class="text-xs text-gray-500 truncate">${escapeHtml(t.description)}</p>` : ""}
      </div>

      <span class="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${statusBadgeClass(t.status)}">${escapeHtml(t.status.replace("_", " "))}</span>
      <span class="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${priorityBadgeClass(t.priority)}">${escapeHtml(t.priority)}</span>

      <button onclick="openAssignModal(${t.id}, ${t.assignee_id ?? "null"})" class="flex-shrink-0" aria-label="Assign task" title="${t.assignee_name ? `Assigned to ${t.assignee_name} — click to reassign` : "Click to assign"}">
        ${
          t.assignee_name
            ? `<span class="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-semibold flex items-center justify-center">${escapeHtml(initialsFor(t.assignee_name))}</span>`
            : `<span class="w-6 h-6 rounded-full border border-gray-300 text-gray-300 flex items-center justify-center text-xs" style="border-style: dashed;">+</span>`
        }
      </button>

      ${t.due_date ? `<span class="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">${escapeHtml(t.due_date)}</span>` : ""}

      <button onclick="deleteTask(${t.id})" class="text-gray-300 hover:text-red-500 flex-shrink-0" aria-label="Delete task">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
      </button>
    </div>
  `;
}

async function toggleTaskDone(taskId, currentStatus) {
  const newStatus = currentStatus === "done" ? "todo" : "done";
  try {
    await apiFetch(`/tasks/${taskId}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
    loadTasks();
    loadProjectDetail();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteTask(taskId) {
  if (!confirm("Delete this task?")) return;
  try {
    await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
    loadTasks();
    loadProjectDetail();
  } catch (err) {
    alert(err.message);
  }
}

function setTaskFilter(status) {
  taskFilter = status;
  document.querySelectorAll("[data-task-filter]").forEach((btn) => {
    const active = btn.dataset.taskFilter === status;
    btn.classList.toggle("bg-brand-500", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("bg-gray-100", !active);
    btn.classList.toggle("text-gray-700", !active);
  });
  loadTasks();
}

const createTaskForm = document.getElementById("create-task-form");
if (createTaskForm) {
  createTaskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("task-title").value.trim();
    const description = document.getElementById("task-description").value.trim();
    const priority = document.getElementById("task-priority").value;
    const status = document.getElementById("task-status").value;
    const due_date = document.getElementById("task-due-date").value || null;
    const assigneeRaw = document.getElementById("task-assignee")?.value;
    const assignee_id = assigneeRaw ? parseInt(assigneeRaw, 10) : null;
    if (!title) return;

    try {
      await apiFetch(`/projects/${PROJECT_ID}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title, description, priority, status, due_date, assignee_id }),
      });
      closeCreateTaskModal();
      createTaskForm.reset();
      loadTasks();
      loadProjectDetail();
    } catch (err) {
      alert(err.message);
    }
  });
}

function openCreateTaskModal() {
  document.getElementById("create-task-modal")?.classList.remove("hidden");
}
function closeCreateTaskModal() {
  document.getElementById("create-task-modal")?.classList.add("hidden");
}

function openEditProjectModal() {
  if (!currentProject) return;
  document.getElementById("edit-project-name").value = currentProject.name;
  document.getElementById("edit-project-description").value = currentProject.description || "";
  document.getElementById("edit-project-status").value = currentProject.status;
  document.getElementById("edit-project-due-date").value = currentProject.end_date || "";
  document.getElementById("edit-project-modal")?.classList.remove("hidden");
}
function closeEditProjectModal() {
  document.getElementById("edit-project-modal")?.classList.add("hidden");
}

const editProjectForm = document.getElementById("edit-project-form");
if (editProjectForm) {
  editProjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("edit-project-name").value.trim();
    const description = document.getElementById("edit-project-description").value.trim();
    const status = document.getElementById("edit-project-status").value;
    const end_date = document.getElementById("edit-project-due-date").value || null;

    try {
      await apiFetch(`/projects/${PROJECT_ID}`, {
        method: "PUT",
        body: JSON.stringify({ name, description, status, end_date }),
      });
      closeEditProjectModal();
      loadProjectDetail();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function loadMembers() {
  try {
    const members = await apiFetch(`/projects/${PROJECT_ID}/members`);
    projectMembers = members || [];
    populateAssigneeSelect();
    const list = document.getElementById("members-list");
    if (!list || !members) return;
    if (members.length === 0) {
      list.innerHTML = `<li class="text-sm text-gray-500 py-2">No members yet.</li>`;
      return;
    }
    list.innerHTML = members
      .map(
        (m) => `
      <li class="flex items-center gap-3 py-2.5">
        <span class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">${escapeHtml(initialsFor(m.name || m.email))}</span>
        <span class="text-sm text-gray-700 flex-1">${escapeHtml(m.name || m.email)}</span>
        <span class="text-xs text-gray-400">${escapeHtml(roleLabel(m.role))}</span>
      </li>
    `
      )
      .join("");
  } catch (err) {
    console.error("Failed to load members", err);
  }
}

async function loadTeamMembers() {
  try {
    const members = await apiFetch(`/projects/${PROJECT_ID}/members`);
    const list = document.getElementById("team-members-list");
    if (!list || !members) return;
    if (members.length === 0) {
      list.innerHTML = `<p class="text-sm text-gray-500 text-center py-8">No members yet — add one above.</p>`;
      return;
    }
    list.innerHTML = members
      .map(
        (m) => `
      <div class="flex items-center gap-3 px-4 py-3">
        <span class="w-9 h-9 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">${escapeHtml(initialsFor(m.name || m.email))}</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-gray-800 truncate">${escapeHtml(m.name || m.email)}</p>
          <p class="text-xs text-gray-500 truncate">${escapeHtml(m.email)}</p>
        </div>
        <span class="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${m.role === "owner" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-700"}">${escapeHtml(roleLabel(m.role))}</span>
        <button onclick="removeMember(${m.user_id})" class="text-gray-300 hover:text-red-500 flex-shrink-0" aria-label="Remove member">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </div>
    `
      )
      .join("");
  } catch (err) {
    console.error("Failed to load team members", err);
  }
}

async function removeMember(userId) {
  if (!confirm("Remove this member from the project?")) return;
  try {
    await apiFetch(`/projects/${PROJECT_ID}/members/${userId}`, { method: "DELETE" });
    loadTeamMembers();
    loadMembers();
  } catch (err) {
    alert(err.message);
  }
}

function openAddMemberModal() {
  document.getElementById("add-member-modal")?.classList.remove("hidden");
}
function closeAddMemberModal() {
  document.getElementById("add-member-modal")?.classList.add("hidden");
}

const addMemberForm = document.getElementById("add-member-form");
if (addMemberForm) {
  addMemberForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("member-email").value.trim();
    const role = document.getElementById("member-role").value;
    if (!email) return;

    try {
      await apiFetch(`/projects/${PROJECT_ID}/members`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      closeAddMemberModal();
      addMemberForm.reset();
      loadTeamMembers();
      loadMembers();
    } catch (err) {
      alert(err.message);
    }
  });
}

let assigningTaskId = null;

function openAssignModal(taskId, currentAssigneeId) {
  assigningTaskId = taskId;
  const select = document.getElementById("assign-task-select");
  if (select) {
    select.innerHTML =
      `<option value="">Unassigned</option>` +
      projectMembers.map((m) => `<option value="${m.user_id}">${escapeHtml(m.name || m.email)}</option>`).join("");
    select.value = currentAssigneeId ? String(currentAssigneeId) : "";
  }
  document.getElementById("assign-task-modal")?.classList.remove("hidden");
}
function closeAssignModal() {
  document.getElementById("assign-task-modal")?.classList.add("hidden");
  assigningTaskId = null;
}

const assignTaskForm = document.getElementById("assign-task-form");
if (assignTaskForm) {
  assignTaskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!assigningTaskId) return;
    const raw = document.getElementById("assign-task-select").value;
    const assignee_id = raw ? parseInt(raw, 10) : null;

    try {
      await apiFetch(`/tasks/${assigningTaskId}`, {
        method: "PUT",
        body: JSON.stringify({ assignee_id }),
      });
      closeAssignModal();
      loadTasks();
    } catch (err) {
      alert(err.message);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setTab("overview");
  loadProjectDetail();
});