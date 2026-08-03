"""Authentication routes: register, login, current user."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from marshmallow import ValidationError

from ..extensions import db, limiter
from ..models.user import User
from ..schemas.user_schema import (
    register_schema,
    login_schema,
    user_schema,
    profile_update_schema,
    password_change_schema,
)
from ..services import auth_service
from ..middleware.error_handlers import error_response

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("10 per minute")
def register():
    try:
        data = register_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid registration data", 400, err.messages)

    try:
        user = auth_service.register_user(
            data["name"], data["username"], data["email"], data["password"]
        )
    except auth_service.AccountAlreadyExists as err:
        return error_response(
            "VALIDATION_ERROR", str(err), 400, {err.field: "already in use"}
        )

    token = create_access_token(identity=str(user.id))
    return jsonify({"user": user_schema.dump(user), "token": token}), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    try:
        data = login_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid login data", 400, err.messages)

    try:
        user = auth_service.authenticate_user(data["identifier"], data["password"])
    except auth_service.InvalidCredentials as err:
        return error_response("AUTH_ERROR", str(err), 401)

    token = create_access_token(identity=str(user.id))
    return jsonify({"user": user_schema.dump(user), "token": token})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return error_response("NOT_FOUND", "User not found", 404)
    return jsonify({"user": user_schema.dump(user)})


@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return error_response("NOT_FOUND", "User not found", 404)

    try:
        data = profile_update_schema.load(request.get_json(force=True, silent=True) or {}, partial=True)
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid profile data", 400, err.messages)

    if "name" in data:
        user.name = data["name"]
    db.session.commit()
    return jsonify({"user": user_schema.dump(user)})


@auth_bp.route("/me/password", methods=["PUT"])
@jwt_required()
@limiter.limit("10 per minute")
def change_password():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return error_response("NOT_FOUND", "User not found", 404)

    try:
        data = password_change_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response("VALIDATION_ERROR", "Invalid password data", 400, err.messages)

    try:
        auth_service.change_password(user, data["current_password"], data["new_password"])
    except auth_service.InvalidCredentials as err:
        return error_response("AUTH_ERROR", str(err), 401)

    return jsonify({"message": "Password updated"})
