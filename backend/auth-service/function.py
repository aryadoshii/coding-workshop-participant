"""
Auth Service - Handles login, logout, and current user retrieval.
Endpoints:
  POST /login   → authenticate user, return JWT token
  POST /logout  → stateless, just confirms logout
  GET  /me      → return current user from JWT token
"""

import json
import logging
import os
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from postgres_service import get_user_by_email

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# JWT secret — in production this would come from AWS Secrets Manager
SECRET_KEY = os.getenv("JWT_SECRET", "citi-workshop-secret-key-2026")
TOKEN_EXPIRY_HOURS = 8

# PostgreSQL connection config from environment variables
PG_CONFIG = (
    f"host={os.getenv('POSTGRES_HOST', 'localhost')} "
    f"port={os.getenv('POSTGRES_PORT', '5432')} "
    f"user={os.getenv('POSTGRES_USER', 'postgres')} "
    f"password={os.getenv('POSTGRES_PASS', 'postgres')} "
    f"dbname={os.getenv('POSTGRES_NAME', 'acme_performance')} "
    f"connect_timeout=15"
)


def _response(status_code, body):
    """Helper to build consistent HTTP responses with CORS headers."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        "body": json.dumps(body),
    }


def _create_token(user_id, email, role):
    """Generate a JWT token with user info embedded."""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def _verify_token(event):
    """Extract and verify JWT token from Authorization header."""
    headers = event.get("headers", {}) or {}
    auth = headers.get("authorization") or headers.get("Authorization", "")

    if not auth.startswith("Bearer "):
        return None

    token = auth.replace("Bearer ", "")
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid token: %s", str(e))
        return None


def handler(event=None, context=None):
    """Main Lambda entry point — routes requests by method + path."""
    logger.info("Event received: %s", event)

    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/")

    # Handle CORS preflight
    if method == "OPTIONS":
        return _response(200, {})

    try:
        if method == "POST" and path == "/login":
            body = json.loads(event.get("body", "{}"))
            return login(body)

        elif method == "POST" and path == "/logout":
            return logout()

        elif method == "GET" and path == "/me":
            return get_me(event)

        else:
            return _response(404, {"error": f"Route not found: {method} {path}"})

    except Exception as e:
        logger.error("Handler error: %s", str(e), exc_info=True)
        return _response(500, {"error": "Internal server error", "message": str(e)})


def login(body):
    """Verify credentials and return JWT token."""
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")

    if not email or not password:
        return _response(400, {"error": "Email and password are required"})

    # Look up user in DB
    user = get_user_by_email(PG_CONFIG, email)
    if not user:
        logger.info("Login failed: user not found for %s", email)
        return _response(401, {"error": "Invalid email or password"})

    user_id, user_email, password_hash, role = user

    # Verify password
    if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
        logger.info("Login failed: wrong password for %s", email)
        return _response(401, {"error": "Invalid email or password"})

    # Generate token
    token = _create_token(user_id, user_email, role)
    logger.info("Login success for %s (role=%s)", email, role)

    return _response(200, {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_email,
            "role": role,
        },
    })


def logout():
    """JWT is stateless — frontend just deletes the token."""
    return _response(200, {"message": "Logged out successfully"})


def get_me(event):
    """Return current user info from the JWT token."""
    payload = _verify_token(event)
    if not payload:
        return _response(401, {"error": "Unauthorized — invalid or expired token"})

    return _response(200, {
        "user_id": payload["user_id"],
        "email": payload["email"],
        "role": payload["role"],
    })


# Main entry point for local testing
if __name__ == "__main__":
    # Test login locally
    test_event = {
        "requestContext": {"http": {"method": "POST"}},
        "rawPath": "/login",
        "body": json.dumps({"email": "admin@acme.com", "password": "Admin@123"}),
    }
    print(handler(test_event))