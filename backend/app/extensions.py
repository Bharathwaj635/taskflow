"""Shared Flask extension instances.

Kept in their own module (rather than app/__init__.py) so that models,
routes, and services can import `db`/`jwt` without triggering circular
imports with the app factory.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address)
