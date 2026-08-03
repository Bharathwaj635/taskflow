"""Centralized error handling so every API error returns a consistent
{ "error": { "code": ..., "message": ..., "fields": ... } } shape.
"""
from flask import jsonify
from werkzeug.exceptions import HTTPException


def error_response(code: str, message: str, status: int, fields: dict | None = None):
    body = {"error": {"code": code, "message": message}}
    if fields:
        body["error"]["fields"] = fields
    return jsonify(body), status


def register_error_handlers(app):

    @app.errorhandler(400)
    def bad_request(e):
        return error_response("BAD_REQUEST", "The request could not be understood.", 400)

    @app.errorhandler(401)
    def unauthorized(e):
        return error_response("UNAUTHORIZED", "Authentication is required.", 401)

    @app.errorhandler(403)
    def forbidden(e):
        return error_response("FORBIDDEN", "You do not have access to this resource.", 403)

    @app.errorhandler(404)
    def not_found(e):
        return error_response("NOT_FOUND", "Resource not found.", 404)

    @app.errorhandler(429)
    def rate_limited(e):
        return error_response("RATE_LIMITED", "Too many requests. Please slow down.", 429)

    @app.errorhandler(HTTPException)
    def http_exception(e):
        return error_response("HTTP_ERROR", e.description or "An error occurred.", e.code)

    @app.errorhandler(Exception)
    def unhandled_exception(e):
        # In production, log `e` here (e.g., to Sentry) before returning a generic message.
        app.logger.exception(e)
        return error_response("SERVER_ERROR", "Something went wrong on our end.", 500)
