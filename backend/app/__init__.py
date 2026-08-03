"""Application factory."""
from flask import Flask
from flask_cors import CORS

from .config import DevConfig
from .extensions import db, migrate, jwt, limiter


def create_app(config_class=DevConfig):
    app = Flask(__name__, static_folder="../../frontend/static",
                template_folder="../../frontend/templates")
    app.config.from_object(config_class)

    # --- Extensions ---
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    CORS(app, origins=app.config.get("CORS_ORIGINS", "*"))

    # --- Models (import so Flask-Migrate can detect them) ---
    from . import models  # noqa: F401

    # --- Blueprints ---
    from .routes.auth_routes import auth_bp
    from .routes.project_routes import project_bp
    from .routes.task_routes import task_bp
    from .routes.dashboard_routes import dashboard_bp
    from .routes.team_routes import team_bp
    from .routes.report_routes import report_bp
    from .routes.page_routes import page_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(project_bp, url_prefix="/api/v1/projects")
    app.register_blueprint(task_bp, url_prefix="/api/v1")
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1/dashboard")
    app.register_blueprint(team_bp, url_prefix="/api/v1/team")
    app.register_blueprint(report_bp, url_prefix="/api/v1/reports")
    app.register_blueprint(page_bp)  # server-rendered HTML pages, no prefix

    # --- Error handlers ---
    from .middleware.error_handlers import register_error_handlers
    register_error_handlers(app)

    # --- Health check ---
    @app.route("/health")
    def health():
        return {"status": "ok"}

    return app
