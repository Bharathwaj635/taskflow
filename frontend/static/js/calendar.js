let viewYear, viewMonth; // viewMonth is 0-indexed
let tasksByDate = {}; // "YYYY-MM-DD" -> [tasks]
let selectedDate = null;

function pad2(n) {
  return String(n).padStart(2, "0");
}
function dateKey(y, m, d) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

async function loadCalendar() {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  selectedDate = dateKey(viewYear, viewMonth, now.getDate());
  await fetchMonthTasks();
  renderGrid();
  renderSelectedDayTasks();
}

async function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear -= 1;
  } else if (viewMonth > 11) {
    viewMonth = 0;
    viewYear += 1;
  }
  await fetchMonthTasks();
  renderGrid();
  renderSelectedDayTasks();
}

async function fetchMonthTasks() {
  const label = document.getElementById("calendar-month-label");
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  if (label) label.textContent = `${monthNames[viewMonth]} ${viewYear}`;

  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const dueAfter = dateKey(viewYear, viewMonth, 1);
  const dueBefore = dateKey(viewYear, viewMonth, lastDay.getDate());

  try {
    const tasks = await apiFetch(`/tasks?due_after=${dueAfter}&due_before=${dueBefore}`);
    tasksByDate = {};
    (tasks || []).forEach((t) => {
      if (!t.due_date) return;
      (tasksByDate[t.due_date] = tasksByDate[t.due_date] || []).push(t);
    });
  } catch (err) {
    console.error("Failed to load tasks for calendar", err);
    tasksByDate = {};
  }
}

function renderGrid() {
  const grid = document.getElementById("calendar-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const todayKey = dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  for (let i = 0; i < firstDay.getDay(); i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const key = dateKey(viewYear, viewMonth, day);
    const dayTasks = tasksByDate[key] || [];
    const isToday = key === todayKey;
    const isSelected = key === selectedDate;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.onclick = () => {
      selectedDate = key;
      renderGrid();
      renderSelectedDayTasks();
    };
    cell.className = `aspect-square rounded-lg p-1.5 text-left flex flex-col transition-colors
      ${isSelected ? "bg-brand-500 text-white" : isToday ? "bg-brand-50 text-brand-700" : "hover:bg-gray-50 text-gray-700"}`;

    const doneCount = dayTasks.filter((t) => t.status === "done").length;
    cell.innerHTML = `
      <span class="text-xs font-medium">${day}</span>
      ${dayTasks.length > 0 ? `<span class="mt-auto text-[10px] ${isSelected ? "text-white/90" : "text-gray-400"}">${doneCount}/${dayTasks.length} done</span>` : ""}
      ${dayTasks.length > 0 ? `<span class="w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-brand-500"}"></span>` : ""}
    `;
    grid.appendChild(cell);
  }
}

function renderSelectedDayTasks() {
  const heading = document.getElementById("selected-day-heading");
  const list = document.getElementById("selected-day-tasks");
  if (heading) heading.textContent = `Tasks due ${selectedDate}`;
  if (!list) return;

  const tasks = tasksByDate[selectedDate] || [];
  if (tasks.length === 0) {
    list.innerHTML = `<li class="text-sm text-gray-500 py-3">No tasks due this day.</li>`;
    return;
  }

  list.innerHTML = tasks
    .map(
      (t) => `
    <li class="py-3">
      <a href="/projects/${t.project_id}" class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate">${escapeHtml(t.title)}</p>
          <p class="text-xs text-brand-600 truncate">${escapeHtml(t.project_name || "")}</p>
        </div>
        <span class="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${statusBadgeClass(t.status)}">${escapeHtml(t.status.replace("_", " "))}</span>
      </a>
    </li>`
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", loadCalendar);
