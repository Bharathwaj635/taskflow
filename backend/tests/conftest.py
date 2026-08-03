import pytest
from app import create_app
from app.config import TestConfig
from app.extensions import db as _db


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def register_and_login(client, email="test@example.com", password="secret123",
                        name="Test User", username="testuser"):
    client.post(
        "/api/v1/auth/register",
        json={"name": name, "username": username, "email": email, "password": password},
    )
    res = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}
