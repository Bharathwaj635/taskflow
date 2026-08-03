async function loadReports() {
  try {
    const data = await apiFetch("/reports/overview");
    if (!data) return;
    renderStatusChart(data.tasks_by_status);
    renderPriorityChart(data.tasks_by_priority);
    renderProgressChart(data.project_progress);
    renderTrendChart(data.productivity_trend);
  } catch (err) {
    console.error("Failed to load reports", err);
  }
}

function renderStatusChart(byStatus) {
  const canvas = document.getElementById("status-chart");
  if (!canvas || typeof Chart === "undefined") return;
  new Chart(canvas, {
    type: "pie",
    data: {
      labels: ["To Do", "In Progress", "Done"],
      datasets: [
        {
          data: [byStatus.todo, byStatus.in_progress, byStatus.done],
          backgroundColor: ["#9ca3af", "#f59e0b", "#22c55e"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
    },
  });
}

function renderPriorityChart(byPriority) {
  const canvas = document.getElementById("priority-chart");
  if (!canvas || typeof Chart === "undefined") return;
  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["High", "Medium", "Low"],
      datasets: [
        {
          data: [byPriority.high, byPriority.medium, byPriority.low],
          backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
    },
  });
}

function renderProgressChart(projectProgress) {
  const container = document.getElementById("progress-list");
  if (!container) return;

  if (!projectProgress || projectProgress.length === 0) {
    container.innerHTML = `<p class="text-sm text-gray-400">No projects yet.</p>`;
    return;
  }

  // Same palette as the status/priority charts above, so color meaning
  // stays consistent across the whole Reports page.
  const barColor = (pct) => {
    if (pct >= 100) return "#22c55e"; // green — done
    if (pct >= 50) return "#4f46e5"; // brand indigo — on track
    return "#f59e0b"; // amber — just started
  };

  container.innerHTML = projectProgress
    .map((p) => {
      const pct = Math.max(0, Math.min(100, p.progress_pct));
      return `
    <div class="mb-4">
      <div class="flex items-center justify-between gap-2 mb-1 text-sm">
        <span class="font-medium text-gray-700 truncate">${escapeHtml(p.name)}</span>
        <span class="text-gray-500 flex-shrink-0">${pct}% · ${p.task_count} task${p.task_count === 1 ? "" : "s"}</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full" style="height:10px">
        <div class="rounded-full" style="width:${pct}%; height:10px; background-color:${barColor(pct)}; transition: width 0.5s ease;"></div>
      </div>
    </div>`;
    })
    .join("");
}

function renderTrendChart(trend) {
  const canvas = document.getElementById("trend-chart");
  if (!canvas || typeof Chart === "undefined") return;
  new Chart(canvas, {
    type: "line",
    data: {
      labels: trend.map((t) => t.day),
      datasets: [
        {
          label: "Tasks Completed",
          data: trend.map((t) => t.completed),
          borderColor: "#4f46e5",
          backgroundColor: "#4f46e5",
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

document.addEventListener("DOMContentLoaded", loadReports);