"""Reports & analytics aggregate endpoint.

Every figure is computed live from real rows — task/priority breakdowns,
per-project completion percentages, and a 7-day productivity trend based
on Task.updated_at (when a task's status last changed to "done").
"""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from ..extensions import db
from ..models.project import Project
from ..models.project_member import ProjectMember
from ..models.task import Task

report_bp = Blueprint("reports", __name__)


def _count(query) -> int:
    return db.session.query(func.count()).select_from(query.subquery()).scalar() or 0


@report_bp.route("/overview", methods=["GET"])
@jwt_required()
def reports_overview():
    user_id = int(get_jwt_identity())
    now = datetime.now(timezone.utc)

    # Every project the user belongs to — as creator or as an added member.
    my_project_ids = db.session.query(ProjectMember.project_id).filter(ProjectMember.user_id == user_id)

    tasks_q = (
        db.session.query(Task)
        .join(Project, Task.project_id == Project.id)
        .filter(Project.id.in_(my_project_ids), Task.is_deleted.is_(False), Project.is_deleted.is_(False))
    )

    tasks_by_status = {
        "todo": _count(tasks_q.filter(Task.status == "todo")),
        "in_progress": _count(tasks_q.filter(Task.status == "in_progress")),
        "done": _count(tasks_q.filter(Task.status == "done")),
    }
    tasks_by_priority = {
        "low": _count(tasks_q.filter(Task.priority == "low")),
        "medium": _count(tasks_q.filter(Task.priority == "medium")),
        "high": _count(tasks_q.filter(Task.priority == "high")),
    }

    projects = Project.query.filter(Project.id.in_(my_project_ids), Project.is_deleted.is_(False)).all()
    project_progress = []
    for p in projects:
        active_tasks = p.tasks.filter_by(is_deleted=False)
        total = active_tasks.count()
        done = active_tasks.filter_by(status="done").count()
        pct = round((done / total) * 100) if total else 0
        project_progress.append({"name": p.name, "progress_pct": pct, "task_count": total})
    project_progress.sort(key=lambda x: x["progress_pct"], reverse=True)

    productivity_trend = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        completed_that_day = _count(
            tasks_q.filter(Task.status == "done", Task.updated_at >= day_start, Task.updated_at < day_end)
        )
        productivity_trend.append({"day": day.strftime("%a"), "date": day.isoformat(), "completed": completed_that_day})

    return jsonify(
        {
            "tasks_by_status": tasks_by_status,
            "tasks_by_priority": tasks_by_priority,
            "project_progress": project_progress,
            "productivity_trend": productivity_trend,
        }
    )