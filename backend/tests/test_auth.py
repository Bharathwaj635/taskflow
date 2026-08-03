def test_register_success(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"name": "Alice", "username": "alice", "email": "alice@example.com", "password": "secret123"},
    )
    assert res.status_code == 201
    body = res.get_json()
    assert body["user"]["email"] == "alice@example.com"
    assert body["user"]["username"] == "alice"
    assert "token" in body


def test_register_duplicate_email_fails(client):
    payload = {"name": "Alice", "username": "alice1", "email": "alice@example.com", "password": "secret123"}
    client.post("/api/v1/auth/register", json=payload)
    payload2 = {**payload, "username": "alice2"}
    res = client.post("/api/v1/auth/register", json=payload2)
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "VALIDATION_ERROR"
    assert "email" in res.get_json()["error"]["fields"]


def test_register_duplicate_username_fails(client):
    payload = {"name": "Alice", "username": "alice", "email": "alice1@example.com", "password": "secret123"}
    client.post("/api/v1/auth/register", json=payload)
    payload2 = {**payload, "email": "alice2@example.com"}
    res = client.post("/api/v1/auth/register", json=payload2)
    assert res.status_code == 400
    assert "username" in res.get_json()["error"]["fields"]


def test_login_with_email(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Bob", "username": "bob", "email": "bob@example.com", "password": "secret123"},
    )
    res = client.post("/api/v1/auth/login", json={"identifier": "bob@example.com", "password": "secret123"})
    assert res.status_code == 200
    assert "token" in res.get_json()


def test_login_with_username(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Bob", "username": "bobby", "email": "bob2@example.com", "password": "secret123"},
    )
    res = client.post("/api/v1/auth/login", json={"identifier": "bobby", "password": "secret123"})
    assert res.status_code == 200
    assert "token" in res.get_json()


def test_login_wrong_password_fails(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Bob", "username": "bob3", "email": "bob3@example.com", "password": "secret123"},
    )
    res = client.post("/api/v1/auth/login", json={"identifier": "bob3@example.com", "password": "wrong"})
    assert res.status_code == 401


def test_me_requires_auth(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
