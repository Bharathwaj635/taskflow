"""Business logic for tasks."""
from ..extensions import db
from ..models.task import Task
from ..models.project import Project
from ..models.project_member import ProjectMember


def create_task(project_id: int, data: dict) -> Task:
    task = Task(
        project_id=project_id,
        title=data["title"],
        description=data.get("description") or "",
        assignee_id=data.get("assignee_id"),
        status=data.get("status", "todo"),
        priority=data.get("priority", "medium"),
        due_date=data.get("due_date"),
    )
    db.session.add(task)
    db.session.commit()
    return task


def get_tasks_for_project(project_id: int, status: str | None = None, assignee_id: int | None = None):
    query = Task.query.filter_by(project_id=project_id, is_deleted=False)
    if status:
        query = query.filter_by(status=status)
    if assignee_id:
        query = query.filter_by(assignee_id=assignee_id)
    # NULL due_dates sort last, regardless of database backend (SQLite/MySQL/Postgres)
    return query.order_by(
        Task.due_date.is_(None), Task.due_date.asc(), Task.created_at.desc()
    ).all()


def get_tasks_for_user(
    user_id: int,
    status: str | None = None,
    priority: str | None = None,
    project_id: int | None = None,
    due_after: str | None = None,
    due_before: str | None = None,
):
    """Cross-project task query — every task in every project the user
    belongs to, whether they created it or were added as a member.
    Used by the global Tasks page and the Calendar page.
    """
    query = (
        Task.query.join(Project, Task.project_id == Project.id)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(ProjectMember.user_id == user_id, Task.is_deleted.is_(False), Project.is_deleted.is_(False))
    )
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if due_after:
        query = query.filter(Task.due_date >= due_after)
    if due_before:
        query = query.filter(Task.due_date <= due_before)
    return query.order_by(
        Task.due_date.is_(None), Task.due_date.asc(), Task.created_at.desc()
    ).all()


def get_task_or_none(task_id: int) -> Task | None:
    return Task.query.filter_by(id=task_id, is_deleted=False).first()


def update_task(task: Task, data: dict) -> Task:
    for field in ("title", "description", "assignee_id", "status", "priority", "due_date"):
        if field in data:
            setattr(task, field, data[field])
    db.session.commit()
    return task


def soft_delete_task(task: Task) -> Task:
    task.is_deleted = True
    db.session.commit()
    return task