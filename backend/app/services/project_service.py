"""Business logic for projects and project membership."""
from ..extensions import db
from ..models.project import Project
from ..models.project_member import ProjectMember
from ..models.user import User


def create_project(owner_id: int, data: dict) -> Project:
    project = Project(
        name=data["name"],
        description=data.get("description") or "",
        owner_id=owner_id,
        status=data.get("status", "active"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
    )
    db.session.add(project)
    db.session.flush()  # get project.id before commit

    # Owner is automatically a project member with role "owner"
    membership = ProjectMember(project_id=project.id, user_id=owner_id, role="owner")
    db.session.add(membership)
    db.session.commit()
    return project


def get_projects_for_user(user_id: int, status: str | None = None, search: str | None = None):
    """Every project the user belongs to — as the original creator (owner_id)
    or as a member/Head added later. A single ProjectMember row exists for
    the creator too (see create_project above), so joining on membership
    covers both cases without listing anything twice.
    """
    query = (
        Project.query.join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(ProjectMember.user_id == user_id, Project.is_deleted.is_(False))
    )
    if status:
        query = query.filter(Project.status == status)
    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))
    return query.order_by(Project.created_at.desc()).all()


def get_project_or_none(project_id: int, user_id: int) -> Project | None:
    """View access: any project member (Head or Member role) can read the
    project, its tasks, and its member list — not just whoever created it.
    """
    return (
        Project.query.join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(Project.id == project_id, ProjectMember.user_id == user_id, Project.is_deleted.is_(False))
        .first()
    )


def get_manageable_project_or_none(project_id: int, user_id: int) -> Project | None:
    """Manage access: editing/deleting the project and adding/removing members
    is restricted to Head-role members (role == "owner" in the DB — this
    includes the original creator, who gets that role automatically, and
    anyone later promoted to Head).
    """
    return (
        Project.query.join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(
            Project.id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.role == "owner",
            Project.is_deleted.is_(False),
        )
        .first()
    )


def update_project(project: Project, data: dict) -> Project:
    for field in ("name", "description", "status", "start_date", "end_date"):
        if field in data:
            setattr(project, field, data[field])
    db.session.commit()
    return project


def soft_delete_project(project: Project) -> Project:
    project.is_deleted = True
    db.session.commit()
    return project


def add_member(project: Project, email: str, role: str) -> ProjectMember:
    user = User.query.filter_by(email=email).first()
    if not user:
        raise ValueError(f"No user found with email {email}")

    existing = ProjectMember.query.filter_by(project_id=project.id, user_id=user.id).first()
    if existing:
        return existing

    membership = ProjectMember(project_id=project.id, user_id=user.id, role=role)
    db.session.add(membership)
    db.session.commit()
    return membership


def remove_member(project: Project, user_id: int) -> bool:
    membership = ProjectMember.query.filter_by(project_id=project.id, user_id=user_id).first()
    if not membership:
        return False
    db.session.delete(membership)
    db.session.commit()
    return True