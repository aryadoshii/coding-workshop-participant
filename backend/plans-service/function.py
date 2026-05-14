"""
Plans Service - Enterprise RBAC Version
"""

import json
import logging
import os
import jwt

from postgres_service import (
    get_plans,
    get_plan_by_id,
    create_plan,
    update_plan,
    delete_plan,
    get_plans_summary,
    get_promotion_ready,
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

    except:
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
        # GET /plans/summary
        # =====================================

        if (
            method == "GET"
            and path == "/plans/summary"
        ):

            return plans_summary(event)

        # =====================================
        # GET /plans/promotion-ready
        # =====================================

        elif (
            method == "GET"
            and path == "/plans/promotion-ready"
        ):

            return promotion_ready(event)

        # =====================================
        # GET /plans
        # =====================================

        elif (
            method == "GET"
            and path == "/plans"
        ):

            return list_plans(
                event,
                params
            )

        # =====================================
        # GET /plans/{id}
        # =====================================

        elif (
            method == "GET"
            and path.startswith("/plans/")
        ):

            plan_id = int(
                path.split("/")[-1]
            )

            return get_one(
                event,
                plan_id
            )

        # =====================================
        # POST /plans
        # =====================================

        elif (
            method == "POST"
            and path == "/plans"
        ):

            body = json.loads(
                event.get("body", "{}")
            )

            return add_plan(
                event,
                body
            )

        # =====================================
        # PUT /plans/{id}
        # =====================================

        elif (
            method == "PUT"
            and path.startswith("/plans/")
        ):

            plan_id = int(
                path.split("/")[-1]
            )

            body = json.loads(
                event.get("body", "{}")
            )

            return edit_plan(
                event,
                plan_id,
                body
            )

        # =====================================
        # DELETE /plans/{id}
        # =====================================

        elif (
            method == "DELETE"
            and path.startswith("/plans/")
        ):

            plan_id = int(
                path.split("/")[-1]
            )

            return remove_plan(
                event,
                plan_id
            )

        else:

            return _response(
                404,
                {"error": "Route not found"}
            )

    except ValueError:

        return _response(
            400,
            {"error": "Invalid ID"}
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
# LIST PLANS
# =========================================================

def list_plans(event, params):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    status = params.get("status")

    # =====================================
    # HR ACCESS
    # =====================================

    if role == "HR":

        data = get_plans(
            PG_CONFIG,
            None,
            status
        )

    # =====================================
    # EMPLOYEE ACCESS
    # =====================================

    elif role == "Employee":

        data = get_plans(
            PG_CONFIG,
            user_id,
            status
        )

    # =====================================
    # MANAGER ACCESS
    # =====================================

    elif role == "Manager":

        # Future:
        # filter team hierarchy

        data = get_plans(
            PG_CONFIG,
            None,
            status
        )

    else:

        return _response(
            403,
            {"error": "Forbidden"}
        )

    return _response(
        200,
        {
            "plans": data,
            "total": len(data),
            "role": role
        }
    )


# =========================================================
# GET SINGLE PLAN
# =========================================================

def get_one(event, plan_id):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    item = get_plan_by_id(
        PG_CONFIG,
        plan_id
    )

    if not item:

        return _response(
            404,
            {
                "error":
                f"Plan {plan_id} not found"
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

        if item["employee_id"] != user_id:

            return _response(
                403,
                {"error": "Forbidden"}
            )

    # =====================================
    # MANAGER ACCESS
    # =====================================

    elif role == "Manager":

        pass

    return _response(
        200,
        {"plan": item}
    )


# =========================================================
# CREATE PLAN
# =========================================================

def add_plan(event, body):

    _, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    required = [
        "employee_id",
        "goal"
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
                f"Missing fields: {missing}"
            }
        )

    new_id = create_plan(
        PG_CONFIG,
        body
    )

    return _response(
        201,
        {
            "message":
            "Development plan created",

            "id": new_id
        }
    )


# =========================================================
# UPDATE PLAN
# =========================================================

def edit_plan(event, plan_id, body):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    existing = get_plan_by_id(
        PG_CONFIG,
        plan_id
    )

    if not existing:

        return _response(
            404,
            {
                "error":
                f"Plan {plan_id} not found"
            }
        )

    # Employee can edit only own plan
    if role == "Employee":

        if existing["employee_id"] != user_id:

            return _response(
                403,
                {"error": "Forbidden"}
            )

    update_plan(
        PG_CONFIG,
        plan_id,
        body
    )

    return _response(
        200,
        {"message": "Development plan updated"}
    )


# =========================================================
# DELETE PLAN
# =========================================================

def remove_plan(event, plan_id):

    _, err = _require_roles(
        event,
        ["HR"]
    )

    if err:
        return err

    if not get_plan_by_id(
        PG_CONFIG,
        plan_id
    ):

        return _response(
            404,
            {
                "error":
                f"Plan {plan_id} not found"
            }
        )

    delete_plan(
        PG_CONFIG,
        plan_id
    )

    return _response(
        204,
        {"message": "Development plan deleted"}
    )


# =========================================================
# PLAN SUMMARY
# =========================================================

def plans_summary(event):

    _, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    summary = get_plans_summary(
        PG_CONFIG
    )

    return _response(
        200,
        {"summary": summary}
    )


# =========================================================
# PROMOTION READY
# =========================================================

def promotion_ready(event):

    _, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    employees = get_promotion_ready(
        PG_CONFIG
    )

    return _response(
        200,
        {
            "promotion_ready": employees,
            "total": len(employees)
        }
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

        "rawPath": "/plans",

        "queryStringParameters": {},

        "headers": {},
    }

    print(handler(test_event))