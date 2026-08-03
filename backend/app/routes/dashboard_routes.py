"""Dashboard summary route: stats, weekly trend series, and upcoming deadlines.

Every number here is computed directly from real rows in the database —
nothing is fabricated. "This week" deltas count rows created in the last
7 days; the weekly trend chart buckets tasks by the day their status was
last updated (via Task.updated_at).
"""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from ..extensions import db, limiter
from ..models.project import Project
from ..models.project_member import ProjectMember
from ..models.task import Task

dashboard_bp = Blueprint("dashboard", __name__)


def _count(query) -> int:
    return db.session.query(func.count()).select_from(query.subquery()).scalar() or 0


@dashboard_bp.route("/summary", methods=["GET"])
@jwt_required()
@limiter.limit("60 per minute")
def dashboard_summary():
    user_id = int(get_jwt_identity())
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    today = now.date()

    # Every project the user belongs to — as creator or as an added member.
    my_project_ids = db.session.query(ProjectMember.project_id).filter(ProjectMember.user_id == user_id)
    projects_q = Project.query.filter(Project.id.in_(my_project_ids), Project.is_deleted.is_(False))
    tasks_q = (
        db.session.query(Task)
        .join(Project, Task.project_id == Project.id)
        .filter(Project.id.in_(my_project_ids), Task.is_deleted.is_(False))
    )

    total_projects = projects_q.count()
    active_projects = projects_q.filter(Project.status == "active").count()
    completed_projects = projects_q.filter(Project.status == "completed").count()

    total_tasks = _count(tasks_q)
    pending_tasks = _count(tasks_q.filter(Task.status != "done"))
    in_progress_tasks = _count(tasks_q.filter(Task.status == "in_progress"))
    completed_tasks = _count(tasks_q.filter(Task.status == "done"))
    todo_tasks = _count(tasks_q.filter(Task.status == "todo"))
    overdue_tasks = _count(
        tasks_q.filter(Task.status != "done", Task.due_date.isnot(None), Task.due_date < today)
    )

    # "This week" deltas — rows created in the last 7 days
    new_projects_this_week = projects_q.filter(Project.created_at >= week_ago).count()
    new_active_this_week = projects_q.filter(
        Project.status == "active", Project.created_at >= week_ago
    ).count()
    new_completed_this_week = projects_q.filter(
        Project.status == "completed", Project.created_at >= week_ago
    ).count()
    new_tasks_this_week = _count(tasks_q.filter(Task.created_at >= week_ago))
    new_pending_this_week = _count(
        tasks_q.filter(Task.status != "done", Task.created_at >= week_ago)
    )
    new_completed_tasks_this_week = _count(
        tasks_q.filter(Task.status == "done", Task.updated_at >= week_ago)
    )
    new_overdue_this_week = _count(
        tasks_q.filter(
            Task.status != "done",
            Task.due_date.isnot(None),
            Task.due_date < today,
            Task.updated_at >= week_ago,
        )
    )

    # Weekly trend chart: for each of the last 7 days, how many tasks were
    # marked done / moved to in_progress that day (based on updated_at).
    weekly_series = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        completed_that_day = _count(
            tasks_q.filter(
                Task.status == "done", Task.updated_at >= day_start, Task.updated_at < day_end
            )
        )
        in_progress_that_day = _count(
            tasks_q.filter(
                Task.status == "in_progress",
                Task.updated_at >= day_start,
                Task.updated_at < day_end,
            )
        )
        weekly_series.append(
            {
                "day": day.strftime("%a"),
                "date": day.isoformat(),
                "completed": completed_that_day,
                "in_progress": in_progress_that_day,
            }
        )

    # Upcoming deadlines: next 5 non-done tasks with a due date, soonest first
    upcoming = (
        tasks_q.filter(Task.status != "done", Task.due_date.isnot(None))
        .order_by(Task.due_date.asc())
        .limit(5)
        .all()
    )
    upcoming_deadlines = [
        {
            "id": t.id,
            "title": t.title,
            "due_date": t.due_date.isoformat(),
            "project_id": t.project_id,
            "project_name": t.project.name if t.project else None,
        }
        for t in upcoming
    ]

    return jsonify(
        {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "completed_projects": completed_projects,
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "in_progress_tasks": in_progress_tasks,
            "completed_tasks": completed_tasks,
            "todo_tasks": todo_tasks,
            "overdue_tasks": overdue_tasks,
            "deltas": {
                "total_projects": new_projects_this_week,
                "active_projects": new_active_this_week,
                "completed_projects": new_completed_this_week,
                "total_tasks": new_tasks_this_week,
                "pending_tasks": new_pending_this_week,
                "completed_tasks": new_completed_tasks_this_week,
                "overdue_tasks": new_overdue_this_week,
            },
            "weekly_series": weekly_series,
            "upcoming_deadlines": upcoming_deadlines,
        }
    )