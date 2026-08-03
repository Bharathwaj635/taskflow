function formatDelta(el, value, label = "this week") {
  if (!el) return;
  if (!value) {
    el.textContent = "";
    return;
  }
  el.textContent = `+${value} ${label}`;
}

function formatDateRange() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(monday)} - ${fmt(sunday)}, ${sunday.getFullYear()}`;
}

async function loadDashboard() {
  const rangeEl = document.getElementById("date-range");
  if (rangeEl) rangeEl.textContent = formatDateRange();

  try {
    const me = await apiFetch("/auth/me");
    const heading = document.getElementById("welcome-heading");
    if (me && heading) heading.textContent = `Welcome back, ${me.user.name.split(" ")[0]}! 👋`;
  } catch (err) {
    console.error("Failed to load current user", err);
  }

  try {
    const summary = await apiFetch("/dashboard/summary");
    if (!summary) return;

    document.getElementById("stat-total-projects").textContent = summary.total_projects;
    document.getElementById("stat-active-projects").textContent = summary.active_projects;
    document.getElementById("stat-completed-projects").textContent = summary.completed_projects;
    document.getElementById("stat-pending-tasks").textContent = summary.pending_tasks;
    document.getElementById("stat-total-tasks").textContent = summary.total_tasks;
    document.getElementById("stat-in-progress-tasks").textContent = summary.in_progress_tasks;
    document.getElementById("stat-completed-tasks").textContent = summary.completed_tasks;
    document.getElementById("stat-overdue-tasks").textContent = summary.overdue_tasks;

    const d = summary.deltas || {};
    formatDelta(document.getElementById("delta-total-projects"), d.total_projects);
    formatDelta(document.getElementById("delta-active-projects"), d.active_projects);
    formatDelta(document.getElementById("delta-completed-projects"), d.completed_projects);
    formatDelta(document.getElementById("delta-pending-tasks"), d.pending_tasks);
    formatDelta(document.getElementById("delta-total-tasks"), d.total_tasks);
    formatDelta(document.getElementById("delta-completed-tasks"), d.completed_tasks);
    const overdueDeltaEl = document.getElementById("delta-overdue-tasks");
    if (overdueDeltaEl && d.overdue_tasks) {
      overdueDeltaEl.textContent = `+${d.overdue_tasks} this week`;
    }

    renderTasksOverviewChart(summary.todo_tasks, summary.in_progress_tasks, summary.completed_tasks);
    renderTasksProgressChart(summary.weekly_series || []);
    renderUpcomingDeadlines(summary.upcoming_deadlines || []);
  } catch (err) {
    console.error("Failed to load dashboard summary", err);
  }

  try {
    const projects = await apiFetch("/projects");
    const list = document.getElementById("recent-projects");
    if (!list || !projects) return;

    if (projects.length === 0) {
      list.innerHTML = `<li class="text-sm text-gray-500 py-3">No projects yet.</li>`;
      return;
    }

    list.innerHTML = projects
      .slice(0, 5)
      .map((p) => {
        const total = p.task_count ?? 0;
        const done = p.done_count ?? 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return `
        <li class="py-3">
          <a href="/projects/${p.id}" class="block">
            <div class="flex items-center justify-between mb-1.5">
              <span class="font-medium text-gray-800 text-sm">${escapeHtml(p.name)}</span>
              <span class="text-xs text-gray-500">${pct}%</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-1.5">
              <div class="bg-brand-500 h-1.5 rounded-full" style="width:${pct}%"></div>
            </div>
          </a>
        </li>`;
      })
      .join("");
  } catch (err) {
    console.error("Failed to load recent projects", err);
  }
}

function renderUpcomingDeadlines(deadlines) {
  const list = document.getElementById("upcoming-deadlines");
  if (!list) return;

  if (deadlines.length === 0) {
    list.innerHTML = `<li class="text-sm text-gray-500 py-3">No upcoming deadlines.</li>`;
    return;
  }

  list.innerHTML = deadlines
    .map(
      (t) => `
    <li class="py-3">
      <a href="/projects/${t.project_id}" class="flex items-center justify-between">
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate">${escapeHtml(t.title)}</p>
          <p class="text-xs text-gray-500 truncate">${escapeHtml(t.project_name || "")}</p>
        </div>
        <span class="text-xs text-gray-400 flex-shrink-0 ml-3">${escapeHtml(t.due_date)}</span>
      </a>
    </li>`
    )
    .join("");
}

let overviewChartInstance = null;
function renderTasksOverviewChart(todo, inProgress, done) {
  const canvas = document.getElementById("tasks-overview-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (overviewChartInstance) overviewChartInstance.destroy();
  overviewChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["To Do", "In Progress", "Done"],
      datasets: [
        {
          data: [todo, inProgress, done],
          backgroundColor: ["#9ca3af", "#f59e0b", "#22c55e"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
    },
  });
}

let progressChartInstance = null;
function renderTasksProgressChart(series) {
  const canvas = document.getElementById("tasks-progress-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (progressChartInstance) progressChartInstance.destroy();
  progressChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: series.map((s) => s.day),
      datasets: [
        {
          label: "Completed",
          data: series.map((s) => s.completed),
          borderColor: "#22c55e",
          backgroundColor: "#22c55e",
          tension: 0.35,
        },
        {
          label: "In Progress",
          data: series.map((s) => s.in_progress),
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b",
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
    },
  });
}

document.addEventListener("DOMContentLoaded", loadDashboard);
