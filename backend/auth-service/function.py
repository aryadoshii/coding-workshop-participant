"""
Auth Service - Enterprise RBAC Version
"""

import json
import logging
import os
import jwt
import bcrypt

from datetime import (
    datetime,
    timedelta,
    timezone
)

from postgres_service import (
    get_user_by_email
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SECRET_KEY = os.getenv(
    "JWT_SECRET",
    "citi-workshop-secret-key-2026"
)

TOKEN_EXPIRY_HOURS = 8

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
        "body": json.dumps(body),
    }


# =========================================================
# CREATE JWT TOKEN
# =========================================================

def _create_token(user_id, email, role):

    payload = {

        # IMPORTANT FIX
        "id": user_id,

        "email": email,

        "role": role,

        "exp":
            datetime.now(timezone.utc)
            + timedelta(hours=TOKEN_EXPIRY_HOURS),

        "iat":
            datetime.now(timezone.utc),
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm="HS256"
    )


# =========================================================
# VERIFY JWT TOKEN
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

        logger.warning("Token expired")

        return None

    except jwt.InvalidTokenError as e:

        logger.warning(
            "Invalid token: %s",
            str(e)
        )

        return None


# =========================================================
# MAIN HANDLER
# =========================================================

def handler(event=None, context=None):

    logger.info(
        "Event received: %s",
        event
    )

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

    # CORS PRE-FLIGHT
    if method == "OPTIONS":

        return _response(200, {})

    try:

        # LOGIN
        if method == "POST" and path == "/login":

            body = json.loads(
                event.get("body", "{}")
            )

            return login(body)

        # LOGOUT
        elif method == "POST" and path == "/logout":

            return logout()

        # CURRENT USER
        elif method == "GET" and path == "/me":

            return get_me(event)

        else:

            return _response(
                404,
                {
                    "error":
                    f"Route not found: {method} {path}"
                }
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
# LOGIN
# =========================================================

def login(body):

    email = body.get(
        "email",
        ""
    ).strip().lower()

    password = body.get(
        "password",
        ""
    )

    if not email or not password:

        return _response(
            400,
            {
                "error":
                "Email and password are required"
            }
        )

    # LOOKUP USER
    user = get_user_by_email(
        PG_CONFIG,
        email
    )

    if not user:

        logger.info(
            "Login failed: user not found for %s",
            email
        )

        return _response(
            401,
            {
                "error":
                "Invalid email or password"
            }
        )

    user_id, user_email, password_hash, role = user

    # PASSWORD VERIFY
    if not bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8")
    ):

        logger.info(
            "Login failed: wrong password for %s",
            email
        )

        return _response(
            401,
            {
                "error":
                "Invalid email or password"
            }
        )

    # GENERATE JWT
    token = _create_token(
        user_id,
        user_email,
        role
    )

    logger.info(
        "Login success for %s (role=%s)",
        email,
        role
    )

    return _response(
        200,
        {
            "token": token,

            "user": {
                "id": user_id,
                "email": user_email,
                "role": role,
            }
        }
    )


# =========================================================
# LOGOUT
# =========================================================

def logout():

    return _response(
        200,
        {
            "message":
            "Logged out successfully"
        }
    )


# =========================================================
# CURRENT USER
# =========================================================

def get_me(event):

    payload = _verify_token(event)

    if not payload:

        return _response(
            401,
            {"error": "Unauthorized"}
        )

    from postgres_service import (
        get_employee_by_user_id
    )

    employee = get_employee_by_user_id(
        PG_CONFIG,
        payload["id"]
    )

    return _response(
        200,
        {
            "id": payload["id"],
            "email": payload["email"],
            "role": payload["role"],
            "employee": employee
        }
    )


# =========================================================
# LOCAL TEST
# =========================================================

if __name__ == "__main__":

    test_event = {
        "requestContext": {
            "http": {
                "method": "POST"
            }
        },

        "rawPath": "/login",

        "body": json.dumps({
            "email": "admin@acme.com",
            "password": "Admin@123"
        }),
    }

    print(handler(test_event))