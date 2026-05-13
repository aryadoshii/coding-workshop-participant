"""
Employees Service - Full CRUD for employee management.
Endpoints:
  GET    /employees              → list all (with search/filter)
  GET    /employees/{id}         → get one employee
  POST   /employees              → create employee (HR only)
  PUT    /employees/{id}         → update employee (HR/Manager)
  DELETE /employees/{id}         → delete employee (HR only)
  GET    /employees/departments  → list all departments
"""

import json
import logging
import os
import jwt
from postgres_service import (
    get_all_employees,
    get_employee_by_id,
    create_employee,
    update_employee,
    delete_employee,
    get_departments,
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
    """Consistent HTTP response with CORS headers."""
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
    """Extract and verify JWT from Authorization header."""
    headers = event.get("headers", {}) or {}
    auth = headers.get("authorization") or headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.replace("Bearer ", "")
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def _require_roles(event, allowed_roles):
    """Returns user payload if role allowed, else None."""
    user = _verify_token(event)
    if not user:
        return None, _response(401, {"error": "Unauthorized"})
    if user["role"] not in allowed_roles:
        return None, _response(403, {"error": "Forbidden — insufficient permissions"})
    return user, None


def handler(event=None, context=None):
    """Main Lambda entry point."""
    logger.info("Event: %s", event)

    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/")
    params = event.get("queryStringParameters") or {}

    # CORS preflight
    if method == "OPTIONS":
        return _response(200, {})

    try:
        # GET /employees/departments
        if method == "GET" and path == "/employees/departments":
            return list_departments(event)

        # GET /employees
        elif method == "GET" and path == "/employees":
            return list_employees(event, params)

        # GET /employees/{id}
        elif method == "GET" and path.startswith("/employees/"):
            employee_id = int(path.split("/")[-1])
            return get_employee(event, employee_id)

        # POST /employees
        elif method == "POST" and path == "/employees":
            body = json.loads(event.get("body", "{}"))
            return add_employee(event, body)

        # PUT /employees/{id}
        elif method == "PUT" and path.startswith("/employees/"):
            employee_id = int(path.split("/")[-1])
            body = json.loads(event.get("body", "{}"))
            return edit_employee(event, employee_id, body)

        # DELETE /employees/{id}
        elif method == "DELETE" and path.startswith("/employees/"):
            employee_id = int(path.split("/")[-1])
            return remove_employee(event, employee_id)

        else:
            return _response(404, {"error": f"Route not found: {method} {path}"})

    except ValueError:
        return _response(400, {"error": "Invalid employee ID"})
    except Exception as e:
        logger.error("Handler error: %s", str(e), exc_info=True)
        return _response(500, {"error": "Internal server error", "message": str(e)})


def list_employees(event, params):
    """GET /employees — all roles can view."""
    user, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err:
        return err

    department = params.get("department")
    status = params.get("status")
    search = params.get("search")

    # Managers only see their own department
    if user["role"] == "Manager" and not department:
        department = None  # manager sees all for now

    employees = get_all_employees(PG_CONFIG, department, status, search)
    return _response(200, {
        "employees": employees,
        "total": len(employees)
    })


def get_employee(event, employee_id):
    """GET /employees/{id} — all roles."""
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err:
        return err

    employee = get_employee_by_id(PG_CONFIG, employee_id)
    if not employee:
        return _response(404, {"error": f"Employee {employee_id} not found"})

    return _response(200, {"employee": employee})


def add_employee(event, body):
    """POST /employees — HR only."""
    _, err = _require_roles(event, ["HR"])
    if err:
        return err

    # Validate required fields
    required = ["first_name", "last_name", "email"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return _response(400, {"error": f"Missing required fields: {missing}"})

    new_id = create_employee(PG_CONFIG, body)
    return _response(201, {
        "message": "Employee created successfully",
        "employee_id": new_id
    })


def edit_employee(event, employee_id, body):
    """PUT /employees/{id} — HR and Manager."""
    _, err = _require_roles(event, ["HR", "Manager"])
    if err:
        return err

    existing = get_employee_by_id(PG_CONFIG, employee_id)
    if not existing:
        return _response(404, {"error": f"Employee {employee_id} not found"})

    updated = update_employee(PG_CONFIG, employee_id, body)
    if not updated:
        return _response(400, {"error": "Update failed"})

    return _response(200, {"message": "Employee updated successfully"})


def remove_employee(event, employee_id):
    """DELETE /employees/{id} — HR only."""
    _, err = _require_roles(event, ["HR"])
    if err:
        return err

    existing = get_employee_by_id(PG_CONFIG, employee_id)
    if not existing:
        return _response(404, {"error": f"Employee {employee_id} not found"})

    deleted = delete_employee(PG_CONFIG, employee_id)
    if not deleted:
        return _response(400, {"error": "Delete failed"})

    return _response(204, {"message": "Employee deleted successfully"})


def list_departments(event):
    """GET /employees/departments — all roles."""
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err:
        return err

    departments = get_departments(PG_CONFIG)
    return _response(200, {"departments": departments})


# Local testing
if __name__ == "__main__":
    # Test: list employees (no token — should get 401)
    test_event = {
        "requestContext": {"http": {"method": "GET"}},
        "rawPath": "/employees",
        "queryStringParameters": {},
        "headers": {},
    }
    print(handler(test_event))