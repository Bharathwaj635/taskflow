"""Server-rendered HTML pages (Jinja2 templates).

These routes just render templates; all data comes from the JSON API
via JavaScript running in the browser (see frontend/static/js/*.js).
"""
from flask import Blueprint, render_template

page_bp = Blueprint("pages", __name__)


@page_bp.route("/")
def index():
    return render_template("login.html")


@page_bp.route("/login")
def login_page():
    return render_template("login.html")


@page_bp.route("/register")
def register_page():
    return render_template("register.html")


@page_bp.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")


@page_bp.route("/projects")
def projects_page():
    return render_template("projects.html")


@page_bp.route("/projects/<int:project_id>")
def project_detail_page(project_id):
    return render_template("project_detail.html", project_id=project_id)


@page_bp.route("/tasks")
def tasks_page():
    return render_template("tasks.html")


@page_bp.route("/team")
def team_page():
    return render_template("team.html")


@page_bp.route("/calendar")
def calendar_page():
    return render_template("calendar.html")


@page_bp.route("/reports")
def reports_page():
    return render_template("reports.html")


@page_bp.route("/settings")
def settings_page():
    return render_template("settings.html")
