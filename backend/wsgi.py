"""Production entry point for gunicorn.

Run with:  gunicorn wsgi:app
"""
from app import create_app
from app.config import ProdConfig

app = create_app(ProdConfig)
