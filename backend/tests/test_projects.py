from .conftest import register_and_login


def test_create_and_list_project(client):
    headers = register_and_login(client)

    res = client.post("/api/v1/projects", json={"name": "Website Redesign"}, headers=headers)
    assert res.status_code == 201
    assert res.get_json()["name"] == "Website Redesign"

    res = client.get("/api/v1/projects", headers=headers)
    assert res.status_code == 200
    projects = res.get_json()
    assert len(projects) == 1
    assert projects[0]["name"] == "Website Redesign"


def test_update_project(client):
    headers = register_and_login(client)
    create_res = client.post("/api/v1/projects", json={"name": "Old Name"}, headers=headers)
    project_id = create_res.get_json()["id"]

    res = client.put(f"/api/v1/projects/{project_id}", json={"name": "New Name"}, headers=headers)
    assert res.status_code == 200
    assert res.get_json()["name"] == "New Name"


def test_soft_delete_project(client):
    headers = register_and_login(client)
    create_res = client.post("/api/v1/projects", json={"name": "Temp Project"}, headers=headers)
    project_id = create_res.get_json()["id"]

    res = client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    assert res.status_code == 200

    res = client.get("/api/v1/projects", headers=headers)
    assert res.get_json() == []


def test_project_requires_auth(client):
    res = client.get("/api/v1/projects")
    assert res.status_code == 401
