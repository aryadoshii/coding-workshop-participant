"""
Competencies Service - Track employee skills and gaps.
Endpoints:
  GET    /competencies              → list all (filterable)
  GET    /competencies/{id}         → get one
  POST   /competencies              → create (HR/Manager)
  PUT    /competencies/{id}         → update (HR/Manager)
  DELETE /competencies/{id}         → delete (HR only)
  GET    /competencies/gaps         → org-wide skill gap summary
"""

import json
import logging
import os
import jwt
from postgres_service import (
    get_competencies, get_competency_by_id,
    create_competency, update_competency,
    delete_competency, get_skill_gap_summary,
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SECRET_KEY = os.getenv("JWT_SECRET", "citi-workshop-secret-key-2026")

PG_CONFIG = (
    f"host={os.getenv('POSTGRES_HOST', 'localhost')} "
    f"port={os.getenv('POSTGRES_PORT', '5432')} "
    f"user={os.getenv('POSTGRES_USER', 'postgres')} "
    f"password={os.getenv('POSTGRES_PASS', 'postgres')} "
    f"dbname={os.getenv('POSTGRES_NAME', 'acme_performance')} "
    f"connect_timeout=15"
)

def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        "body": json.dumps(body, default=str),
    }

def _verify_token(event):
    headers = event.get("headers", {}) or {}
    auth = headers.get("authorization") or headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.replace("Bearer ", "")
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except:
        return None

def _require_roles(event, allowed_roles):
    user = _verify_token(event)
    if not user:
        return None, _response(401, {"error": "Unauthorized"})
    if user["role"] not in allowed_roles:
        return None, _response(403, {"error": "Forbidden"})
    return user, None

def handler(event=None, context=None):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/")
    params = event.get("queryStringParameters") or {}

    if method == "OPTIONS":
        return _response(200, {})

    try:
        if method == "GET" and path == "/competencies/gaps":
            return skill_gaps(event)
        elif method == "GET" and path == "/competencies":
            return list_competencies(event, params)
        elif method == "GET" and path.startswith("/competencies/"):
            return get_one(event, int(path.split("/")[-1]))
        elif method == "POST" and path == "/competencies":
            return add_competency(event, json.loads(event.get("body", "{}")))
        elif method == "PUT" and path.startswith("/competencies/"):
            return edit_competency(event, int(path.split("/")[-1]), json.loads(event.get("body", "{}")))
        elif method == "DELETE" and path.startswith("/competencies/"):
            return remove_competency(event, int(path.split("/")[-1]))
        else:
            return _response(404, {"error": "Route not found"})
    except ValueError:
        return _response(400, {"error": "Invalid ID"})
    except Exception as e:
        logger.error("Handler error: %s", str(e), exc_info=True)
        return _response(500, {"error": "Internal server error", "message": str(e)})

def list_competencies(event, params):
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err: return err
    employee_id = int(params["employee_id"]) if params.get("employee_id") else None
    category = params.get("category")
    data = get_competencies(PG_CONFIG, employee_id, category)
    return _response(200, {"competencies": data, "total": len(data)})

def get_one(event, comp_id):
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err: return err
    item = get_competency_by_id(PG_CONFIG, comp_id)
    if not item:
        return _response(404, {"error": f"Competency {comp_id} not found"})
    return _response(200, {"competency": item})

def add_competency(event, body):
    _, err = _require_roles(event, ["HR", "Manager"])
    if err: return err
    required = ["employee_id", "skill_name", "current_level", "target_level"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return _response(400, {"error": f"Missing fields: {missing}"})
    new_id = create_competency(PG_CONFIG, body)
    return _response(201, {"message": "Competency created", "id": new_id})

def edit_competency(event, comp_id, body):
    _, err = _require_roles(event, ["HR", "Manager"])
    if err: return err
    if not get_competency_by_id(PG_CONFIG, comp_id):
        return _response(404, {"error": f"Competency {comp_id} not found"})
    update_competency(PG_CONFIG, comp_id, body)
    return _response(200, {"message": "Competency updated"})

def remove_competency(event, comp_id):
    _, err = _require_roles(event, ["HR"])
    if err: return err
    if not get_competency_by_id(PG_CONFIG, comp_id):
        return _response(404, {"error": f"Competency {comp_id} not found"})
    delete_competency(PG_CONFIG, comp_id)
    return _response(204, {"message": "Competency deleted"})

def skill_gaps(event):
    _, err = _require_roles(event, ["HR", "Manager"])
    if err: return err
    gaps = get_skill_gap_summary(PG_CONFIG)
    return _response(200, {"skill_gaps": gaps, "total": len(gaps)})

if __name__ == "__main__":
    test_event = {
        "requestContext": {"http": {"method": "GET"}},
        "rawPath": "/competencies",
        "queryStringParameters": {},
        "headers": {},
    }
    print(handler(test_event))