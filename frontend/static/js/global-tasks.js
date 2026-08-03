/**
 * Global cross-project Tasks page. Reuses the row markup style from the
 * per-project task list, but each row also links back to its project.
 */
let statusFilter = "";

async function loadGlobalTasks() {
  try {
    const projects = await apiFetch("/projects");
    const select = document.getElementById("project-filter");
    if (select && projects) {
      projects.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Failed to load projects for filter", err);
  }
  await applyExtraFilters();
}

async function applyExtraFilters() {
  const params = new URLSearchParams();
  // Deliberately NOT sending `status` here. renderGlobalTaskList() already
  // filters the fetched tasks by statusFilter client-side (see below), so
  // the list of tasks that reaches renderCounts() must stay status-unfiltered
  // — otherwise switching tabs narrows the data before counts are computed
  // from it, and every pill except the active one reads wrong/stale.
  const priority = document.getElementById("priority-filter")?.value;
  const projectId = document.getElementById("project-filter")?.value;
  const dueAfter = document.getElementById("due-after-filter")?.value;
  const dueBefore = document.getElementById("due-before-filter")?.value;
  if (priority) params.set("priority", priority);
  if (projectId) params.set("project_id", projectId);
  if (dueAfter) params.set("due_after", dueAfter);
  if (dueBefore) params.set("due_before", dueBefore);

  try {
    const tasks = await apiFetch(`/tasks?${params.toString()}`);
    renderCounts(tasks || []);
    renderGlobalTaskList(tasks || []);
  } catch (err) {
    console.error("Failed to load tasks", err);
  }
}

function clearDateFilters() {
  const after = document.getElementById("due-after-filter");
  const before = document.getElementById("due-before-filter");
  if (after) after.value = "";
  if (before) before.value = "";
  applyExtraFilters();
}

function renderCounts(tasks) {
  // Counts reflect the priority/project filters but not the status filter,
  // so the status pills always show a meaningful breakdown of what's visible.
  const counts = { all: tasks.length, todo: 0, in_progress: 0, done: 0 };
  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status] += 1;
  });
  document.getElementById("tcount-all").textContent = counts.all;
  document.getElementById("tcount-todo").textContent = counts.todo;
  document.getElementById("tcount-in_progress").textContent = counts.in_progress;
  document.getElementById("tcount-done").textContent = counts.done;
}

function renderGlobalTaskList(tasks) {
  const container = document.getElementById("tasks-list");
  if (!container) return;

  const filtered = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks;

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-sm text-gray-500 text-center py-8">No tasks match this view.</p>`;
    return;
  }

  container.innerHTML = filtered.map((t) => renderGlobalTaskRow(t)).join("");
}

function renderGlobalTaskRow(t) {
  const isDone = t.status === "done";
  return `
    <a href="/projects/${t.project_id}" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <span class="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                   ${isDone ? "bg-green-500 border-green-500" : "border-gray-300"}">
        ${isDone ? `<svg class="w-3 h-3 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>` : ""}
      </span>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium ${isDone ? "text-gray-400 line-through" : "text-gray-800"}">${escapeHtml(t.title)}</p>
        <p class="text-xs text-brand-600 truncate">${escapeHtml(t.project_name || "")}</p>
      </div>

      <span class="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${statusBadgeClass(t.status)}">${escapeHtml(t.status.replace("_", " "))}</span>
      <span class="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${priorityBadgeClass(t.priority)}">${escapeHtml(t.priority)}</span>

      ${t.assignee_name ? `<span class="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-semibold flex items-center justify-center flex-shrink-0" title="${escapeHtml(t.assignee_name)}">${escapeHtml(initialsFor(t.assignee_name))}</span>` : ""}

      ${t.due_date ? `<span class="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">${escapeHtml(t.due_date)}</span>` : ""}
    </a>
  `;
}

function setStatusFilter(status) {
  statusFilter = status;
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    const active = btn.dataset.filter === status;
    btn.classList.toggle("bg-brand-500", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("bg-gray-100", !active);
    btn.classList.toggle("text-gray-700", !active);
  });
  applyExtraFilters();
}

document.addEventListener("DOMContentLoaded", loadGlobalTasks);