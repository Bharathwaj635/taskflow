"""Project CRUD + project membership routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from ..schemas.project_schema import (
    project_create_schema,
    project_update_schema,
    project_member_add_schema,
)
from ..services import project_service
from ..middleware.error_handlers import error_response

project_bp = Blueprint("projects", __name__)


def _current_user_id() -> int:
    return int(get_jwt_identity())


@project_bp.route("", methods=["GET"])
@jwt_required()
def list_projects():
    user_id = _current_user_id()
    status = request.args.get("status")
    search = request.args.get("search")
    projects = project_service.get_projects_for_user(user_id, status=status, search=search)
    return jsonify([p.to_dict(include_task_counts=True) for p in projects])


@project_bp.route("", methods=["POST"])
@jwt_required()
def create_project():
    try:
        data = project_create_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid project data", 400, err.messages)

    project = project_service.create_project(_current_user_id(), data)
    return jsonify(project.to_dict()), 201


@project_bp.route("/<int:project_id>", methods=["GET"])
@jwt_required()
def get_project(project_id):
    project = project_service.get_project_or_none(project_id, _current_user_id())
    if not project:
        return error_response("NOT_FOUND", "Project not found", 404)
    return jsonify(project.to_dict(include_task_counts=True))


@project_bp.route("/<int:project_id>", methods=["PUT"])
@jwt_required()
def update_project(project_id):
    project = project_service.get_manageable_project_or_none(project_id, _current_user_id())
    if not project:
        return error_response("NOT_FOUND", "Project not found", 404)

    try:
        data = project_update_schema.load(request.get_json(force=True, silent=True) or {}, partial=True)
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid project data", 400, err.messages)

    project = project_service.update_project(project, data)
    return jsonify(project.to_dict())


@project_bp.route("/<int:project_id>", methods=["DELETE"])
@jwt_required()
def delete_project(project_id):
    project = project_service.get_manageable_project_or_none(project_id, _current_user_id())
    if not project:
        return error_response("NOT_FOUND", "Project not found", 404)

    project_service.soft_delete_project(project)
    return jsonify({"message": "Project deleted"})


@project_bp.route("/<int:project_id>/members", methods=["GET"])
@jwt_required()
def list_members(project_id):
    project = project_service.get_project_or_none(project_id, _current_user_id())
    if not project:
        return error_response("NOT_FOUND", "Project not found", 404)
    return jsonify([m.to_dict() for m in project.members])


@project_bp.route("/<int:project_id>/members", methods=["POST"])
@jwt_required()
def add_member(project_id):
    project = project_service.get_manageable_project_or_none(project_id, _current_user_id())
    if not project:
        return error_response("NOT_FOUND", "Project not found", 404)

    try:
        data = project_member_add_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid member data", 400, err.messages)

    try:
        membership = project_service.add_member(project, data["email"], data["role"])
    except ValueError as err:
        return error_response("NOT_FOUND", str(err), 404)

    return jsonify(membership.to_dict()), 201


@project_bp.route("/<int:project_id>/members/<int:user_id>", methods=["DELETE"])
@jwt_required()
def remove_member(project_id, user_id):
    project = project_service.get_manageable_project_or_none(project_id, _current_user_id())
    if not project:
        return error_response("NOT_FOUND", "Project not found", 404)

    removed = project_service.remove_member(project, user_id)
    if not removed:
        return error_response("NOT_FOUND", "Member not found on this project", 404)

    return jsonify({"message": "Member removed"})