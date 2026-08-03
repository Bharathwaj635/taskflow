from .conftest import register_and_login


def _create_project(client, headers, name="Project A"):
    res = client.post("/api/v1/projects", json={"name": name}, headers=headers)
    return res.get_json()["id"]


def test_create_and_list_task(client):
    headers = register_and_login(client)
    project_id = _create_project(client, headers)

    res = client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={"title": "Design homepage", "priority": "high"},
        headers=headers,
    )
    assert res.status_code == 201
    assert res.get_json()["title"] == "Design homepage"

    res = client.get(f"/api/v1/projects/{project_id}/tasks", headers=headers)
    assert res.status_code == 200
    assert len(res.get_json()) == 1


def test_update_task_status(client):
    headers = register_and_login(client)
    project_id = _create_project(client, headers)
    task_res = client.post(
        f"/api/v1/projects/{project_id}/tasks", json={"title": "Do thing"}, headers=headers
    )
    task_id = task_res.get_json()["id"]

    res = client.put(f"/api/v1/tasks/{task_id}", json={"status": "done"}, headers=headers)
    assert res.status_code == 200
    assert res.get_json()["status"] == "done"


def test_delete_task(client):
    headers = register_and_login(client)
    project_id = _create_project(client, headers)
    task_res = client.post(
        f"/api/v1/projects/{project_id}/tasks", json={"title": "Delete me"}, headers=headers
    )
    task_id = task_res.get_json()["id"]

    res = client.delete(f"/api/v1/tasks/{task_id}", headers=headers)
    assert res.status_code == 200

    res = client.get(f"/api/v1/projects/{project_id}/tasks", headers=headers)
    assert res.get_json() == []


def test_dashboard_summary(client):
    headers = register_and_login(client)
    project_id = _create_project(client, headers)
    client.post(f"/api/v1/projects/{project_id}/tasks", json={"title": "Task 1"}, headers=headers)
    client.post(f"/api/v1/projects/{project_id}/tasks", json={"title": "Task 2"}, headers=headers)

    res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res.status_code == 200
    body = res.get_json()
    assert body["total_projects"] == 1
    assert body["total_tasks"] == 2
    assert body["pending_tasks"] == 2
