"""Small helpers layered on top of Flask-JWT-Extended for ownership checks."""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity


def project_owner_required(get_project_fn):
    """Decorator factory: ensures the current JWT user owns the project
    returned by `get_project_fn(*args, **kwargs)`. Injects the project
    as the first positional argument to the wrapped view.

    Usage:
        @project_owner_required(lambda project_id: project_service.get_project_or_none(project_id, get_jwt_identity()))
        def view(project, project_id):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            project = get_project_fn(*args, **kwargs)
            if project is None:
                return jsonify({"error": {"code": "NOT_FOUND", "message": "Project not found"}}), 404
            return view_func(project, *args, **kwargs)
        return wrapper
    return decorator
