"""
Training Service - Track employee training and development activities.
Endpoints:
  GET    /training          → list all records (filterable)
  GET    /training/{id}     → get one record
  POST   /training          → create record (HR/Manager)
  PUT    /training/{id}     → update record (HR/Manager/Employee)
  DELETE /training/{id}     → delete record (HR only)
  GET    /training/summary  → org-wide training summary
"""

import json
import logging
import os
import jwt
from postgres_service import (
    get_training_records, get_training_by_id,
    create_training, update_training,
    delete_training, get_training_summary,
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
        if method == "GET" and path == "/training/summary":
            return training_summary(event)
        elif method == "GET" and path == "/training":
            return list_training(event, params)
        elif method == "GET" and path.startswith("/training/"):
            return get_one(event, int(path.split("/")[-1]))
        elif method == "POST" and path == "/training":
            return add_training(event, json.loads(event.get("body", "{}")))
        elif method == "PUT" and path.startswith("/training/"):
            return edit_training(event, int(path.split("/")[-1]), json.loads(event.get("body", "{}")))
        elif method == "DELETE" and path.startswith("/training/"):
            return remove_training(event, int(path.split("/")[-1]))
        else:
            return _response(404, {"error": "Route not found"})
    except ValueError:
        return _response(400, {"error": "Invalid ID"})
    except Exception as e:
        logger.error("Handler error: %s", str(e), exc_info=True)
        return _response(500, {"error": "Internal server error", "message": str(e)})

def list_training(event, params):
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err: return err
    employee_id = int(params["employee_id"]) if params.get("employee_id") else None
    status = params.get("status")
    skill_category = params.get("skill_category")
    data = get_training_records(PG_CONFIG, employee_id, status, skill_category)
    return _response(200, {"training": data, "total": len(data)})

def get_one(event, training_id):
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err: return err
    item = get_training_by_id(PG_CONFIG, training_id)
    if not item:
        return _response(404, {"error": f"Training record {training_id} not found"})
    return _response(200, {"training": item})

def add_training(event, body):
    _, err = _require_roles(event, ["HR", "Manager"])
    if err: return err
    required = ["employee_id", "training_name"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return _response(400, {"error": f"Missing fields: {missing}"})
    new_id = create_training(PG_CONFIG, body)
    return _response(201, {"message": "Training record created", "id": new_id})

def edit_training(event, training_id, body):
    # Employees can mark their own training as completed
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err: return err
    if not get_training_by_id(PG_CONFIG, training_id):
        return _response(404, {"error": f"Training record {training_id} not found"})
    update_training(PG_CONFIG, training_id, body)
    return _response(200, {"message": "Training record updated"})

def remove_training(event, training_id):
    _, err = _require_roles(event, ["HR"])
    if err: return err
    if not get_training_by_id(PG_CONFIG, training_id):
        return _response(404, {"error": f"Training record {training_id} not found"})
    delete_training(PG_CONFIG, training_id)
    return _response(204, {"message": "Training record deleted"})

def training_summary(event):
    _, err = _require_roles(event, ["HR", "Manager"])
    if err: return err
    summary = get_training_summary(PG_CONFIG)
    return _response(200, {"summary": summary})

if __name__ == "__main__":
    test_event = {
        "requestContext": {"http": {"method": "GET"}},
        "rawPath": "/training",
        "queryStringParameters": {},
        "headers": {},
    }
    print(handler(test_event))