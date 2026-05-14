"""
Competencies Service - Enterprise RBAC Version
"""

import json
import logging
import os
import jwt

from postgres_service import (
    get_competencies,
    get_competency_by_id,
    create_competency,
    update_competency,
    delete_competency,
    get_skill_gap_summary,
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
# JWT VERIFY
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
        # GET /competencies/gaps
        # =====================================

        if method == "GET" and path == "/competencies/gaps":

            return skill_gaps(event)

        # =====================================
        # GET /competencies
        # =====================================

        elif method == "GET" and path == "/competencies":

            return list_competencies(
                event,
                params
            )

        # =====================================
        # GET /competencies/{id}
        # =====================================

        elif (
            method == "GET"
            and path.startswith("/competencies/")
        ):

            comp_id = int(
                path.split("/")[-1]
            )

            return get_one(
                event,
                comp_id
            )

        # =====================================
        # POST /competencies
        # =====================================

        elif (
            method == "POST"
            and path == "/competencies"
        ):

            body = json.loads(
                event.get("body", "{}")
            )

            return add_competency(
                event,
                body
            )

        # =====================================
        # PUT /competencies/{id}
        # =====================================

        elif (
            method == "PUT"
            and path.startswith("/competencies/")
        ):

            comp_id = int(
                path.split("/")[-1]
            )

            body = json.loads(
                event.get("body", "{}")
            )

            return edit_competency(
                event,
                comp_id,
                body
            )

        # =====================================
        # DELETE /competencies/{id}
        # =====================================

        elif (
            method == "DELETE"
            and path.startswith("/competencies/")
        ):

            comp_id = int(
                path.split("/")[-1]
            )

            return remove_competency(
                event,
                comp_id
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
# LIST COMPETENCIES
# =========================================================

def list_competencies(event, params):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    category = params.get("category")

    # =====================================
    # HR ACCESS
    # =====================================

    if role == "HR":

        data = get_competencies(
            PG_CONFIG,
            None,
            category
        )

    # =====================================
    # EMPLOYEE ACCESS
    # =====================================

    elif role == "Employee":

        data = get_competencies(
            PG_CONFIG,
            user_id,
            category
        )

    # =====================================
    # MANAGER ACCESS
    # =====================================

    elif role == "Manager":

        # Future:
        # filter employees under manager

        data = get_competencies(
            PG_CONFIG,
            None,
            category
        )

    else:

        return _response(
            403,
            {"error": "Forbidden"}
        )

    return _response(
        200,
        {
            "competencies": data,
            "total": len(data),
            "role": role
        }
    )


# =========================================================
# GET SINGLE COMPETENCY
# =========================================================

def get_one(event, comp_id):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    item = get_competency_by_id(
        PG_CONFIG,
        comp_id
    )

    if not item:

        return _response(
            404,
            {
                "error":
                f"Competency {comp_id} not found"
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
        {"competency": item}
    )


# =========================================================
# CREATE COMPETENCY
# =========================================================

def add_competency(event, body):

    _, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    required = [
        "employee_id",
        "skill_name",
        "current_level",
        "target_level"
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

    new_id = create_competency(
        PG_CONFIG,
        body
    )

    return _response(
        201,
        {
            "message": "Competency created",
            "id": new_id
        }
    )


# =========================================================
# UPDATE COMPETENCY
# =========================================================

def edit_competency(event, comp_id, body):

    _, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    if not get_competency_by_id(
        PG_CONFIG,
        comp_id
    ):

        return _response(
            404,
            {
                "error":
                f"Competency {comp_id} not found"
            }
        )

    update_competency(
        PG_CONFIG,
        comp_id,
        body
    )

    return _response(
        200,
        {"message": "Competency updated"}
    )


# =========================================================
# DELETE COMPETENCY
# =========================================================

def remove_competency(event, comp_id):

    _, err = _require_roles(
        event,
        ["HR"]
    )

    if err:
        return err

    if not get_competency_by_id(
        PG_CONFIG,
        comp_id
    ):

        return _response(
            404,
            {
                "error":
                f"Competency {comp_id} not found"
            }
        )

    delete_competency(
        PG_CONFIG,
        comp_id
    )

    return _response(
        204,
        {"message": "Competency deleted"}
    )


# =========================================================
# SKILL GAPS
# =========================================================

def skill_gaps(event):

    _, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    gaps = get_skill_gap_summary(
        PG_CONFIG
    )

    return _response(
        200,
        {
            "skill_gaps": gaps,
            "total": len(gaps)
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

        "rawPath": "/competencies",

        "queryStringParameters": {},

        "headers": {},
    }

    print(handler(test_event))