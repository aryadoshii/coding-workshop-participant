"""
Employees Service - Enterprise RBAC Version
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

SECRET_KEY = os.getenv(
    "JWT_SECRET",
    "citi-workshop-secret-key-2026"
)

IS_LOCAL = os.getenv(
    "IS_LOCAL",
    "true"
) == "true"

PG_CONFIG = (
    f"host={os.getenv('POSTGRES_HOST', 'localhost')} "
    f"port={os.getenv('POSTGRES_PORT', '5432')} "
    f"user={os.getenv('POSTGRES_USER', 'postgres')} "
    f"password={os.getenv('POSTGRES_PASS', 'postgres')} "
    f"dbname={os.getenv('POSTGRES_NAME', 'acme_performance')} "
    f"connect_timeout=15 "
    f"{'sslmode=require' if not IS_LOCAL else ''}"
)


# =========================================================
# RESPONSE HELPER
# =========================================================

def _response(status_code, body):

    return {
        "statusCode": status_code,

        "headers": {
            "Content-Type": "application/json",

            "Access-Control-Allow-Origin": "*",

            "Access-Control-Allow-Methods":
                "GET, POST, PUT, DELETE, OPTIONS",

            "Access-Control-Allow-Headers":
                "Content-Type, Authorization",
        },

        "body": json.dumps(body, default=str),
    }


# =========================================================
# VERIFY JWT
# =========================================================

def _verify_token(event):

    headers = event.get("headers", {}) or {}

    auth = (
        headers.get("authorization")
        or headers.get("Authorization", "")
    )

    if not auth.startswith("Bearer "):
        return None

    token = auth.replace("Bearer ", "")

    try:

        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256"]
        )

    except jwt.ExpiredSignatureError:

        return None

    except jwt.InvalidTokenError:

        return None


# =========================================================
# RBAC
# =========================================================

def _require_roles(event, allowed_roles):

    user = _verify_token(event)

    if not user:

        return None, _response(
            401,
            {"error": "Unauthorized"}
        )

    if user["role"] not in allowed_roles:

        return None, _response(
            403,
            {"error": "Forbidden"}
        )

    return user, None


# =========================================================
# MAIN HANDLER
# =========================================================

def handler(event=None, context=None):

    logger.info("Event: %s", event)

    method = (
        event.get(
            "requestContext",
            {}
        ).get(
            "http",
            {}
        ).get(
            "method",
            "GET"
        )
    )

    path = event.get("rawPath", "/")

    params = (
        event.get("queryStringParameters")
        or {}
    )

    if method == "OPTIONS":

        return _response(200, {})

    try:

        # =====================================
        # GET /employees/departments
        # =====================================

        if (
            method == "GET"
            and path == "/employees/departments"
        ):

            return list_departments(event)

        # =====================================
        # GET /employees
        # =====================================

        elif (
            method == "GET"
            and path == "/employees"
        ):

            return list_employees(
                event,
                params
            )

        # =====================================
        # GET /employees/{id}
        # =====================================

        elif (
            method == "GET"
            and path.startswith("/employees/")
        ):

            employee_id = int(
                path.split("/")[-1]
            )

            return get_employee(
                event,
                employee_id
            )

        # =====================================
        # POST /employees
        # =====================================

        elif (
            method == "POST"
            and path == "/employees"
        ):

            body = json.loads(
                event.get("body", "{}")
            )

            return add_employee(
                event,
                body
            )

        # =====================================
        # PUT /employees/{id}
        # =====================================

        elif (
            method == "PUT"
            and path.startswith("/employees/")
        ):

            employee_id = int(
                path.split("/")[-1]
            )

            body = json.loads(
                event.get("body", "{}")
            )

            return edit_employee(
                event,
                employee_id,
                body
            )

        # =====================================
        # DELETE /employees/{id}
        # =====================================

        elif (
            method == "DELETE"
            and path.startswith("/employees/")
        ):

            employee_id = int(
                path.split("/")[-1]
            )

            return remove_employee(
                event,
                employee_id
            )

        else:

            return _response(
                404,
                {
                    "error":
                    f"Route not found: {method} {path}"
                }
            )

    except ValueError:

        return _response(
            400,
            {"error": "Invalid employee ID"}
        )

    except Exception as e:

        logger.error(
            "Handler error: %s",
            str(e),
            exc_info=True
        )

        return _response(
            500,
            {
                "error": "Internal server error",
                "message": str(e)
            }
        )


# =========================================================
# LIST EMPLOYEES
# =========================================================

def list_employees(event, params):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    department = params.get("department")
    status = params.get("status")
    search = params.get("search")

    # =====================================
    # HR ACCESS
    # =====================================

    if role == "HR":

        employees = get_all_employees(
            PG_CONFIG,
            department,
            status,
            search,
            None
        )

    # =====================================
    # EMPLOYEE ACCESS
    # =====================================

    elif role == "Employee":

        employee = get_employee_by_id(
            PG_CONFIG,
            user_id
        )

        employees = [employee] if employee else []

    # =====================================
    # MANAGER ACCESS
    # =====================================

    elif role == "Manager":

        employees = get_all_employees(
            PG_CONFIG,
            department,
            status,
            search,
            user_id
        )

    else:

        return _response(
            403,
            {"error": "Forbidden"}
        )

    return _response(
        200,
        {
            "employees": employees,
            "total": len(employees),
            "role": role
        }
    )


# =========================================================
# GET EMPLOYEE
# =========================================================

def get_employee(event, employee_id):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    employee = get_employee_by_id(
        PG_CONFIG,
        employee_id
    )

    if not employee:

        return _response(
            404,
            {
                "error":
                f"Employee {employee_id} not found"
            }
        )

    # =====================================
    # HR ACCESS
    # =====================================

    if role == "HR":
        pass

    # =====================================
    # EMPLOYEE ACCESS
    # =====================================

    elif role == "Employee":

        if employee["id"] != user_id:

            return _response(
                403,
                {"error": "Forbidden"}
            )

    # =====================================
    # MANAGER ACCESS
    # =====================================

    elif role == "Manager":

        if employee.get("manager_id") != user_id:

            return _response(
                403,
                {"error": "Forbidden"}
            )

    return _response(
        200,
        {"employee": employee}
    )


# =========================================================
# CREATE EMPLOYEE
# =========================================================

def add_employee(event, body):

    _, err = _require_roles(
        event,
        ["HR"]
    )

    if err:
        return err

    required = [
        "first_name",
        "last_name",
        "email"
    ]

    missing = [
        f for f in required
        if not body.get(f)
    ]

    if missing:

        return _response(
            400,
            {
                "error":
                f"Missing required fields: {missing}"
            }
        )

    new_id = create_employee(
        PG_CONFIG,
        body
    )

    return _response(
        201,
        {
            "message":
            "Employee created successfully",

            "employee_id": new_id
        }
    )


# =========================================================
# UPDATE EMPLOYEE
# =========================================================

def edit_employee(event, employee_id, body):

    user, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    existing = get_employee_by_id(
        PG_CONFIG,
        employee_id
    )

    if not existing:

        return _response(
            404,
            {
                "error":
                f"Employee {employee_id} not found"
            }
        )

    # Managers can edit only their team
    if role == "Manager":

        if existing.get("manager_id") != user_id:

            return _response(
                403,
                {"error": "Forbidden"}
            )

    updated = update_employee(
        PG_CONFIG,
        employee_id,
        body
    )

    if not updated:

        return _response(
            400,
            {"error": "Update failed"}
        )

    return _response(
        200,
        {"message": "Employee updated successfully"}
    )


# =========================================================
# DELETE EMPLOYEE
# =========================================================

def remove_employee(event, employee_id):

    _, err = _require_roles(
        event,
        ["HR"]
    )

    if err:
        return err

    existing = get_employee_by_id(
        PG_CONFIG,
        employee_id
    )

    if not existing:

        return _response(
            404,
            {
                "error":
                f"Employee {employee_id} not found"
            }
        )

    deleted = delete_employee(
        PG_CONFIG,
        employee_id
    )

    if not deleted:

        return _response(
            400,
            {"error": "Delete failed"}
        )

    return _response(
        204,
        {"message": "Employee deleted successfully"}
    )


# =========================================================
# LIST DEPARTMENTS
# =========================================================

def list_departments(event):

    _, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    departments = get_departments(
        PG_CONFIG
    )

    return _response(
        200,
        {"departments": departments}
    )


# =========================================================
# LOCAL TEST
# =========================================================

if __name__ == "__main__":

    test_event = {
        "requestContext": {
            "http": {
                "method": "GET"
            }
        },

        "rawPath": "/employees",

        "queryStringParameters": {},

        "headers": {},
    }

    print(handler(test_event))