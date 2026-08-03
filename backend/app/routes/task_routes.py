"""Task CRUD routes.

Registered under url_prefix="/api/v1", so routes here define their own
full sub-paths (e.g. "/projects/<id>/tasks", "/tasks/<id>").
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from ..schemas.task_schema import task_create_schema, task_update_schema
from ..services import project_service, task_service
from ..middleware.error_handlers import error_response

task_bp = Blueprint("tasks", __name__)


def _current_user_id() -> int:
    return int(get_jwt_identity())


@task_bp.route("/tasks", methods=["GET"])
@jwt_required()
def list_all_tasks():
    """Every task across every project the user owns — used by the global
    Tasks page and the Calendar page. Supports filtering by status,
    priority, project, and due-date range.
    """
    user_id = _current_user_id()
    tasks = task_service.get_tasks_for_user(
        user_id,
        status=request.args.get("status"),
        priority=request.args.get("priority"),
        project_id=request.args.get("project_id", type=int),
        due_after=request.args.get("due_after"),
        due_before=request.args.get("due_before"),
    )
    return jsonify([t.to_dict() for t in tasks])


def _get_owned_project_or_none(project_id):
    return project_service.get_project_or_none(project_id, _current_user_id())


@task_bp.route("/projects/<int:project_id>/tasks", methods=["GET"])
@jwt_required()
def list_tasks(project_id):
    project = _get_owned_project_or_none(project_id)
    if not project:
        return error_response("NOT_FOUND", "Project not found", 404)

    status = request.args.get("status")
    assignee_id = request.args.get("assignee_id", type=int)
    tasks = task_service.get_tasks_for_project(project_id, status=status, assignee_id=assignee_id)
    return jsonify([t.to_dict() for t in tasks])


@task_bp.route("/projects/<int:project_id>/tasks", methods=["POST"])
@jwt_required()
def create_task(project_id):
    project = _get_owned_project_or_none(project_id)
    if not project:
        return error_response("NOT_FOUND", "Project not found", 404)

    try:
        data = task_create_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid task data", 400, err.messages)

    task = task_service.create_task(project_id, data)
    return jsonify(task.to_dict()), 201


@task_bp.route("/tasks/<int:task_id>", methods=["GET"])
@jwt_required()
def get_task(task_id):
    task = task_service.get_task_or_none(task_id)
    if not task or not _get_owned_project_or_none(task.project_id):
        return error_response("NOT_FOUND", "Task not found", 404)
    return jsonify(task.to_dict())


@task_bp.route("/tasks/<int:task_id>", methods=["PUT"])
@jwt_required()
def update_task(task_id):
    task = task_service.get_task_or_none(task_id)
    if not task or not _get_owned_project_or_none(task.project_id):
        return error_response("NOT_FOUND", "Task not found", 404)

    try:
        data = task_update_schema.load(request.get_json(force=True, silent=True) or {}, partial=True)
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid task data", 400, err.messages)

    task = task_service.update_task(task, data)
    return jsonify(task.to_dict())


@task_bp.route("/tasks/<int:task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(task_id):
    task = task_service.get_task_or_none(task_id)
    if not task or not _get_owned_project_or_none(task.project_id):
        return error_response("NOT_FOUND", "Task not found", 404)

    task_service.soft_delete_task(task)
    return jsonify({"message": "Task deleted"})
