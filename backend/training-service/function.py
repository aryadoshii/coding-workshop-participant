"""
Training Service - Enterprise RBAC Version
"""

import json
import logging
import os
import jwt

from postgres_service import (
    get_training_records,
    get_training_by_id,
    create_training,
    update_training,
    delete_training,
    get_training_summary,
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
        # GET /training/summary
        # =====================================

        if (
            method == "GET"
            and path == "/training/summary"
        ):

            return training_summary(event)

        # =====================================
        # GET /training
        # =====================================

        elif (
            method == "GET"
            and path == "/training"
        ):

            return list_training(
                event,
                params
            )

        # =====================================
        # GET /training/{id}
        # =====================================

        elif (
            method == "GET"
            and path.startswith("/training/")
        ):

            training_id = int(
                path.split("/")[-1]
            )

            return get_one(
                event,
                training_id
            )

        # =====================================
        # POST /training
        # =====================================

        elif (
            method == "POST"
            and path == "/training"
        ):

            body = json.loads(
                event.get("body", "{}")
            )

            return add_training(
                event,
                body
            )

        # =====================================
        # PUT /training/{id}
        # =====================================

        elif (
            method == "PUT"
            and path.startswith("/training/")
        ):

            training_id = int(
                path.split("/")[-1]
            )

            body = json.loads(
                event.get("body", "{}")
            )

            return edit_training(
                event,
                training_id,
                body
            )

        # =====================================
        # DELETE /training/{id}
        # =====================================

        elif (
            method == "DELETE"
            and path.startswith("/training/")
        ):

            training_id = int(
                path.split("/")[-1]
            )

            return remove_training(
                event,
                training_id
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
# LIST TRAINING
# =========================================================

def list_training(event, params):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    status = params.get("status")
    skill_category = params.get("skill_category")

    # =====================================
    # HR ACCESS
    # =====================================

    if role == "HR":

        data = get_training_records(
            PG_CONFIG,
            None,
            status,
            skill_category
        )

    # =====================================
    # EMPLOYEE ACCESS
    # =====================================

    elif role == "Employee":

        data = get_training_records(
            PG_CONFIG,
            user_id,
            status,
            skill_category
        )

    # =====================================
    # MANAGER ACCESS
    # =====================================

    elif role == "Manager":

        # Future:
        # filter managed employees

        data = get_training_records(
            PG_CONFIG,
            None,
            status,
            skill_category
        )

    else:

        return _response(
            403,
            {"error": "Forbidden"}
        )

    return _response(
        200,
        {
            "training": data,
            "total": len(data),
            "role": role
        }
    )


# =========================================================
# GET SINGLE TRAINING
# =========================================================

def get_one(event, training_id):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    item = get_training_by_id(
        PG_CONFIG,
        training_id
    )

    if not item:

        return _response(
            404,
            {
                "error":
                f"Training record {training_id} not found"
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
        {"training": item}
    )


# =========================================================
# CREATE TRAINING
# =========================================================

def add_training(event, body):

    _, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    required = [
        "employee_id",
        "training_name"
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

    new_id = create_training(
        PG_CONFIG,
        body
    )

    return _response(
        201,
        {
            "message":
            "Training record created",

            "id": new_id
        }
    )


# =========================================================
# UPDATE TRAINING
# =========================================================

def edit_training(event, training_id, body):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    existing = get_training_by_id(
        PG_CONFIG,
        training_id
    )

    if not existing:

        return _response(
            404,
            {
                "error":
                f"Training record {training_id} not found"
            }
        )

    # Employee can update only own training
    if role == "Employee":

        if existing["employee_id"] != user_id:

            return _response(
                403,
                {"error": "Forbidden"}
            )

    update_training(
        PG_CONFIG,
        training_id,
        body
    )

    return _response(
        200,
        {"message": "Training record updated"}
    )


# =========================================================
# DELETE TRAINING
# =========================================================

def remove_training(event, training_id):

    _, err = _require_roles(
        event,
        ["HR"]
    )

    if err:
        return err

    if not get_training_by_id(
        PG_CONFIG,
        training_id
    ):

        return _response(
            404,
            {
                "error":
                f"Training record {training_id} not found"
            }
        )

    delete_training(
        PG_CONFIG,
        training_id
    )

    return _response(
        204,
        {"message": "Training record deleted"}
    )


# =========================================================
# TRAINING SUMMARY
# =========================================================

def training_summary(event):

    _, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    summary = get_training_summary(
        PG_CONFIG
    )

    return _response(
        200,
        {"summary": summary}
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

        "rawPath": "/training",

        "queryStringParameters": {},

        "headers": {},
    }

    print(handler(test_event))