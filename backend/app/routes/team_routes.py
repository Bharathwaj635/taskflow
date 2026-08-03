"""Aggregate team view across every project the current user belongs to
(as creator, Head, or plain Member) — not just ones they own.

Every number here is real: role is derived from actual ProjectMember rows,
project_count and assigned_task_count are live counts. There is no fake
"online status" for other members here, since we have no way to know
that honestly — only the current user's own sidebar shows "Online",
because that reflects their own active session.
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from ..extensions import db
from ..models.project import Project
from ..models.project_member import ProjectMember
from ..models.task import Task

team_bp = Blueprint("team", __name__)


@team_bp.route("", methods=["GET"])
@jwt_required()
def list_team():
    user_id = int(get_jwt_identity())

    # Every project the current user is a member of — whether they created
    # it (owner_id) or were added to it later as Head/Member.
    my_project_ids = db.session.query(ProjectMember.project_id).filter(ProjectMember.user_id == user_id)

    memberships = (
        db.session.query(ProjectMember)
        .join(Project, ProjectMember.project_id == Project.id)
        .filter(Project.id.in_(my_project_ids), Project.is_deleted.is_(False))
        .all()
    )

    members_by_user: dict[int, dict] = {}
    for m in memberships:
        if not m.user:
            continue
        entry = members_by_user.setdefault(
            m.user_id,
            {"id": m.user.id, "name": m.user.name, "email": m.user.email, "roles": set(), "project_count": 0},
        )
        entry["roles"].add(m.role)
        entry["project_count"] += 1

    result = []
    for uid, entry in members_by_user.items():
        assigned_task_count = (
            db.session.query(func.count(Task.id))
            .join(Project, Task.project_id == Project.id)
            .filter(Project.id.in_(my_project_ids), Task.assignee_id == uid, Task.is_deleted.is_(False))
            .scalar()
        ) or 0
        result.append(
            {
                "id": entry["id"],
                "name": entry["name"],
                "email": entry["email"],
                "role": "owner" if "owner" in entry["roles"] else "member",
                "project_count": entry["project_count"],
                "assigned_task_count": assigned_task_count,
            }
        )

    result.sort(key=lambda x: x["name"].lower())
    return jsonify(result)