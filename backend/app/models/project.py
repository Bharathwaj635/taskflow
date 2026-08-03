from datetime import datetime, timezone
from ..extensions import db

VALID_STATUSES = ("active", "completed", "on_hold")


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    description = db.Column(db.Text, default="")
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    status = db.Column(db.String(20), default="active", index=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)

    tasks = db.relationship(
        "Task", backref="project", lazy="dynamic", cascade="all, delete-orphan"
    )
    members = db.relationship(
        "ProjectMember", backref="project", lazy="dynamic", cascade="all, delete-orphan"
    )

    def to_dict(self, include_task_counts: bool = False) -> dict:
        data = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "owner_id": self.owner_id,
            "status": self.status,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_task_counts:
            active_tasks = self.tasks.filter_by(is_deleted=False)
            data["task_count"] = active_tasks.count()
            data["done_count"] = active_tasks.filter_by(status="done").count()
            data["member_count"] = self.members.count()
            data["members_preview"] = [
                {"name": m.user.name} for m in self.members.limit(3) if m.user
            ]
        return data

    def __repr__(self) -> str:
        return f"<Project {self.id} {self.name}>"
