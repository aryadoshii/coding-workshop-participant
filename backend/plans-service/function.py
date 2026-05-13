"""
Plans Service - Development plans and promotion readiness.
Endpoints:
  GET    /plans                  → list all plans
  GET    /plans/{id}             → get one plan
  POST   /plans                  → create plan (HR/Manager)
  PUT    /plans/{id}             → update plan (HR/Manager/Employee)
  DELETE /plans/{id}             → delete plan (HR only)
  GET    /plans/summary          → plans by status summary
  GET    /plans/promotion-ready  → employees ready for promotion
"""

import json
import logging
import os
import jwt
from postgres_service import (
    get_plans, get_plan_by_id,
    create_plan, update_plan,
    delete_plan, get_plans_summary,
    get_promotion_ready,
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
        if method == "GET" and path == "/plans/summary":
            return plans_summary(event)
        elif method == "GET" and path == "/plans/promotion-ready":
            return promotion_ready(event)
        elif method == "GET" and path == "/plans":
            return list_plans(event, params)
        elif method == "GET" and path.startswith("/plans/"):
            return get_one(event, int(path.split("/")[-1]))
        elif method == "POST" and path == "/plans":
            return add_plan(event, json.loads(event.get("body", "{}")))
        elif method == "PUT" and path.startswith("/plans/"):
            return edit_plan(event, int(path.split("/")[-1]), json.loads(event.get("body", "{}")))
        elif method == "DELETE" and path.startswith("/plans/"):
            return remove_plan(event, int(path.split("/")[-1]))
        else:
            return _response(404, {"error": "Route not found"})
    except ValueError:
        return _response(400, {"error": "Invalid ID"})
    except Exception as e:
        logger.error("Handler error: %s", str(e), exc_info=True)
        return _response(500, {"error": "Internal server error", "message": str(e)})

def list_plans(event, params):
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err: return err
    employee_id = int(params["employee_id"]) if params.get("employee_id") else None
    status = params.get("status")
    data = get_plans(PG_CONFIG, employee_id, status)
    return _response(200, {"plans": data, "total": len(data)})

def get_one(event, plan_id):
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err: return err
    item = get_plan_by_id(PG_CONFIG, plan_id)
    if not item:
        return _response(404, {"error": f"Plan {plan_id} not found"})
    return _response(200, {"plan": item})

def add_plan(event, body):
    _, err = _require_roles(event, ["HR", "Manager"])
    if err: return err
    required = ["employee_id", "goal"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return _response(400, {"error": f"Missing fields: {missing}"})
    new_id = create_plan(PG_CONFIG, body)
    return _response(201, {"message": "Development plan created", "id": new_id})

def edit_plan(event, plan_id, body):
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err: return err
    if not get_plan_by_id(PG_CONFIG, plan_id):
        return _response(404, {"error": f"Plan {plan_id} not found"})
    update_plan(PG_CONFIG, plan_id, body)
    return _response(200, {"message": "Development plan updated"})

def remove_plan(event, plan_id):
    _, err = _require_roles(event, ["HR"])
    if err: return err
    if not get_plan_by_id(PG_CONFIG, plan_id):
        return _response(404, {"error": f"Plan {plan_id} not found"})
    delete_plan(PG_CONFIG, plan_id)
    return _response(204, {"message": "Development plan deleted"})

def plans_summary(event):
    _, err = _require_roles(event, ["HR", "Manager"])
    if err: return err
    summary = get_plans_summary(PG_CONFIG)
    return _response(200, {"summary": summary})

def promotion_ready(event):
    _, err = _require_roles(event, ["HR", "Manager"])
    if err: return err
    employees = get_promotion_ready(PG_CONFIG)
    return _response(200, {
        "promotion_ready": employees,
        "total": len(employees)
    })

if __name__ == "__main__":
    test_event = {
        "requestContext": {"http": {"method": "GET"}},
        "rawPath": "/plans",
        "queryStringParameters": {},
        "headers": {},
    }
    print(handler(test_event))