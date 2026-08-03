# TaskFlow — Project Management System

A mobile-responsive project & task management web app.
**Stack:** Flask + SQLAlchemy + JWT auth (backend) · Jinja2 + Tailwind CSS + vanilla JS (frontend) · SQLite (dev) / MySQL (prod).

## Quick Start (Local Development)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then edit SECRET_KEY / JWT_SECRET_KEY

# First-time DB setup
flask --app run db init
flask --app run db migrate -m "initial schema"
flask --app run db upgrade

python run.py
```
Backend + server-rendered frontend now run together at **http://localhost:5000**.

### 2. Frontend CSS (Tailwind build)

In a separate terminal:
```bash
cd frontend
npm install
npm run build:css        # one-time build
# or during development:
npm run watch:css        # rebuilds on file changes
```

### 3. Run tests

```bash
cd backend
source venv/bin/activate
pip install pytest
pytest tests/ -v
```

## Project Structure

See `backend/app/` for the layered architecture (models → services → routes)
and `frontend/templates` + `frontend/static` for the mobile-first UI.

## Deployment

See the full deployment guide (Render.com + Railway/PlanetScale MySQL) in
the project documentation. Key points:
- Set `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`, `CORS_ORIGINS` as environment variables.
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn wsgi:app`
- Run `flask --app run db upgrade` against production DB before first deploy.

## Default Ports
- Backend (Flask, dev): `5000`
- Frontend is served by Flask itself (Jinja2 templates) — no separate frontend server needed.
