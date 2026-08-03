let currentFilter = "";
let allProjects = [];
let openMenuProjectId = null;

async function loadProjects() {
  try {
    const projects = await apiFetch("/projects");
    allProjects = projects || [];
    updateFilterCounts();
    applyFiltersAndRender();
  } catch (err) {
    console.error("Failed to load projects", err);
  }
}

function updateFilterCounts() {
  const counts = { all: allProjects.length, active: 0, completed: 0, on_hold: 0 };
  allProjects.forEach((p) => {
    if (counts[p.status] !== undefined) counts[p.status] += 1;
  });
  document.getElementById("count-all").textContent = counts.all;
  document.getElementById("count-active").textContent = counts.active;
  document.getElementById("count-completed").textContent = counts.completed;
  document.getElementById("count-on_hold").textContent = counts.on_hold;
}

function applyFiltersAndRender() {
  const search = (document.getElementById("search-input")?.value || "").toLowerCase().trim();
  let filtered = allProjects;
  if (currentFilter) filtered = filtered.filter((p) => p.status === currentFilter);
  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.description || "").toLowerCase().includes(search)
    );
  }
  renderProjects(filtered);
}

function renderProjects(projects) {
  const container = document.getElementById("projects-list");
  if (!container) return;

  if (projects.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-gray-500">
        <p class="mb-1">No projects found.</p>
        <p class="text-sm">Try a different filter or search, or create a new project.</p>
      </div>`;
    return;
  }

  container.innerHTML = projects
    .map((p) => {
      const total = p.task_count ?? 0;
      const done = p.done_count ?? 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const menuOpen = openMenuProjectId === p.id;
      return `
    <div class="card relative hover:shadow-md transition-shadow duration-200">
      <div class="flex items-start justify-between mb-1.5">
        <a href="/projects/${p.id}" class="font-semibold text-gray-900 hover:text-brand-600 transition-colors">${escapeHtml(p.name)}</a>
        <div class="relative flex-shrink-0">
          <button onclick="toggleProjectMenu(event, ${p.id})" class="text-gray-400 hover:text-gray-600 px-1" aria-label="Project options">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
          <div class="${menuOpen ? "" : "hidden"} absolute right-0 top-7 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32 z-10">
            <button onclick="openEditProjectModal(${p.id})" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit</button>
            <button onclick="deleteProject(${p.id})" class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
          </div>
        </div>
      </div>
      <a href="/projects/${p.id}" class="block">
        <span class="text-xs font-medium px-2 py-1 rounded-full inline-block mb-2 ${statusBadgeClass(p.status)}">${escapeHtml(p.status)}</span>
        <p class="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[2.5rem]">${escapeHtml(p.description || "No description")}</p>
        <div class="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
          <div class="bg-brand-500 h-1.5 rounded-full transition-all" style="width:${pct}%"></div>
        </div>
        <div class="flex items-center justify-between text-xs text-gray-400 mt-1.5">
          <span>${done}/${total} tasks done</span>
          ${p.end_date ? `<span>Due: ${escapeHtml(p.end_date)}</span>` : ""}
        </div>
        ${p.member_count ? `<p class="text-xs text-gray-400 mt-1">${p.member_count} member${p.member_count === 1 ? "" : "s"}</p>` : ""}
      </a>
    </div>
  `;
    })
    .join("");
}

function toggleProjectMenu(event, projectId) {
  event.preventDefault();
  event.stopPropagation();
  openMenuProjectId = openMenuProjectId === projectId ? null : projectId;
  applyFiltersAndRender();
}
document.addEventListener("click", () => {
  if (openMenuProjectId !== null) {
    openMenuProjectId = null;
    applyFiltersAndRender();
  }
});

function setFilter(status) {
  currentFilter = status;
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.classList.toggle("bg-brand-500", btn.dataset.filter === status);
    btn.classList.toggle("text-white", btn.dataset.filter === status);
    btn.classList.toggle("bg-gray-100", btn.dataset.filter !== status);
    btn.classList.toggle("text-gray-700", btn.dataset.filter !== status);
  });
  const select = document.getElementById("status-filter-select");
  if (select && select.value !== status) select.value = status;
  applyFiltersAndRender();
}

const createProjectForm = document.getElementById("create-project-form");
if (createProjectForm) {
  createProjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("project-name").value.trim();
    const description = document.getElementById("project-description").value.trim();
    const status = document.getElementById("project-status").value;
    const start_date = document.getElementById("project-start-date").value || null;
    const end_date = document.getElementById("project-end-date").value || null;
    if (!name) return;

    try {
      await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({ name, description, status, start_date, end_date }),
      });
      closeCreateProjectModal();
      createProjectForm.reset();
      loadProjects();
    } catch (err) {
      alert(err.message);
    }
  });
}

function openCreateProjectModal() {
  document.getElementById("create-project-modal")?.classList.remove("hidden");
}
function closeCreateProjectModal() {
  document.getElementById("create-project-modal")?.classList.add("hidden");
}

function openEditProjectModal(projectId) {
  const p = allProjects.find((proj) => proj.id === projectId);
  if (!p) return;
  document.getElementById("edit-project-id").value = p.id;
  document.getElementById("edit-project-name").value = p.name;
  document.getElementById("edit-project-description").value = p.description || "";
  document.getElementById("edit-project-status").value = p.status;
  document.getElementById("edit-project-start-date").value = p.start_date || "";
  document.getElementById("edit-project-end-date").value = p.end_date || "";
  document.getElementById("edit-project-modal")?.classList.remove("hidden");
}
function closeEditProjectModal() {
  document.getElementById("edit-project-modal")?.classList.add("hidden");
}

const editProjectForm = document.getElementById("edit-project-form");
if (editProjectForm) {
  editProjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-project-id").value;
    const name = document.getElementById("edit-project-name").value.trim();
    const description = document.getElementById("edit-project-description").value.trim();
    const status = document.getElementById("edit-project-status").value;
    const start_date = document.getElementById("edit-project-start-date").value || null;
    const end_date = document.getElementById("edit-project-end-date").value || null;

    try {
      await apiFetch(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, description, status, start_date, end_date }),
      });
      closeEditProjectModal();
      loadProjects();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function deleteProject(projectId) {
  if (!confirm("Delete this project? This cannot be undone.")) return;
  try {
    await apiFetch(`/projects/${projectId}`, { method: "DELETE" });
    loadProjects();
  } catch (err) {
    alert(err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadProjects();
  document.getElementById("search-input")?.addEventListener("input", debounce(applyFiltersAndRender, 250));
});

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}