"""
Reviews Service - Secure Enterprise RBAC Version
"""

import json
import logging
import os
import jwt

from postgres_service import (
    get_all_reviews,
    get_review_by_id,
    create_review,
    update_review,
    update_ai_summary,
    delete_review,
    get_rating_trends,
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SECRET_KEY = os.getenv("JWT_SECRET", "citi-workshop-secret-key-2026")

IS_LOCAL = os.getenv("IS_LOCAL", "true") == "true"

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
# COMMON RESPONSE
# =========================================================

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


# =========================================================
# JWT AUTH
# =========================================================

def _verify_token(event):

    headers = event.get("headers", {}) or {}

    auth = (
        headers.get("authorization")
        or headers.get("Authorization")
        or ""
    )

    if not auth.startswith("Bearer "):
        return None

    token = auth.replace("Bearer ", "")

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256"]
        )

        return payload

    except jwt.ExpiredSignatureError:
        return None

    except jwt.InvalidTokenError:
        return None


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
# ATTRITION RISK ENGINE
# =========================================================

def _calculate_attrition_risk(trends):

    if len(trends) < 2:
        return "Low"

    ratings = [t["rating"] for t in trends]

    if ratings[-1] <= 2 and ratings[-2] <= 2:
        return "High"

    if ratings[-1] <= 3:
        return "Medium"

    return "Low"


# =========================================================
# MAIN HANDLER
# =========================================================

def handler(event=None, context=None):

    logger.info("Event: %s", event)

    method = event.get(
        "requestContext",
        {}
    ).get(
        "http",
        {}
    ).get(
        "method",
        "GET"
    )

    path = event.get("rawPath", "/")

    params = event.get("queryStringParameters") or {}

    if method == "OPTIONS":
        return _response(200, {})

    try:

        # ======================================
        # GET /reviews/trends/{employee_id}
        # ======================================

        if method == "GET" and path.startswith("/reviews/trends/"):

            employee_id = int(path.split("/")[-1])

            return get_trends(event, employee_id)

        # ======================================
        # POST /reviews/{id}/ai-summary
        # ======================================

        elif method == "POST" and path.endswith("/ai-summary"):

            review_id = int(path.split("/")[-2])

            return generate_ai_summary(event, review_id)

        # ======================================
        # GET /reviews
        # ======================================

        elif method == "GET" and path == "/reviews":

            return list_reviews(event, params)

        # ======================================
        # GET /reviews/{id}
        # ======================================

        elif method == "GET" and path.startswith("/reviews/"):

            review_id = int(path.split("/")[-1])

            return get_review(event, review_id)

        # ======================================
        # POST /reviews
        # ======================================

        elif method == "POST" and path == "/reviews":

            body = json.loads(event.get("body", "{}"))

            return add_review(event, body)

        # ======================================
        # PUT /reviews/{id}
        # ======================================

        elif method == "PUT" and path.startswith("/reviews/"):

            review_id = int(path.split("/")[-1])

            body = json.loads(event.get("body", "{}"))

            return edit_review(event, review_id, body)

        # ======================================
        # DELETE /reviews/{id}
        # ======================================

        elif method == "DELETE" and path.startswith("/reviews/"):

            review_id = int(path.split("/")[-1])

            return remove_review(event, review_id)

        else:

            return _response(
                404,
                {"error": f"Route not found: {method} {path}"}
            )

    except ValueError:

        return _response(
            400,
            {"error": "Invalid ID format"}
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
# LIST REVIEWS
# =========================================================

def list_reviews(event, params):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    employee_id = params.get("employee_id")
    reviewer_id = params.get("reviewer_id")

    if employee_id:
        employee_id = int(employee_id)

    if reviewer_id:
        reviewer_id = int(reviewer_id)

    # =====================================================
    # HR ACCESS
    # =====================================================

    if role == "HR":

        reviews = get_all_reviews(
            PG_CONFIG,
            employee_id,
            reviewer_id
        )

    # =====================================================
    # EMPLOYEE ACCESS
    # =====================================================

    elif role == "Employee":

        reviews = get_all_reviews(
            PG_CONFIG,
            user_id,
            None
        )

    # =====================================================
    # MANAGER ACCESS
    # =====================================================

    elif role == "Manager":

        reviews = get_all_reviews(
            PG_CONFIG,
            employee_id,
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
            "reviews": reviews,
            "total": len(reviews),
            "role": role
        }
    )


# =========================================================
# GET SINGLE REVIEW
# =========================================================

def get_review(event, review_id):

    user, err = _require_roles(
        event,
        ["HR", "Manager", "Employee"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    review = get_review_by_id(
        PG_CONFIG,
        review_id
    )

    if not review:

        return _response(
            404,
            {"error": f"Review {review_id} not found"}
        )

    # HR sees everything
    if role == "HR":
        pass

    # Employee sees own only
    elif role == "Employee":

        if review["employee_id"] != user_id:

            return _response(
                403,
                {"error": "Forbidden"}
            )

    # Manager sees only reviews created by them
    elif role == "Manager":

        if review["reviewer_id"] != user_id:

            return _response(
                403,
                {"error": "Forbidden"}
            )

    return _response(
        200,
        {"review": review}
    )


# =========================================================
# CREATE REVIEW
# =========================================================

def add_review(event, body):

    user, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    required = [
        "employee_id",
        "reviewer_id",
        "rating"
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

    rating = int(body["rating"])

    if not (1 <= rating <= 5):

        return _response(
            400,
            {
                "error":
                "Rating must be between 1 and 5"
            }
        )

    new_id = create_review(
        PG_CONFIG,
        body
    )

    return _response(
        201,
        {
            "message": "Review created successfully",
            "review_id": new_id
        }
    )


# =========================================================
# UPDATE REVIEW
# =========================================================

def edit_review(event, review_id, body):

    user, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    role = user["role"]
    user_id = user["id"]

    existing = get_review_by_id(
        PG_CONFIG,
        review_id
    )

    if not existing:

        return _response(
            404,
            {
                "error":
                f"Review {review_id} not found"
            }
        )

    # Managers can only edit their own reviews
    if role == "Manager":

        if existing["reviewer_id"] != user_id:

            return _response(
                403,
                {"error": "Forbidden"}
            )

    updated = update_review(
        PG_CONFIG,
        review_id,
        body
    )

    if not updated:

        return _response(
            400,
            {"error": "Update failed"}
        )

    return _response(
        200,
        {"message": "Review updated successfully"}
    )


# =========================================================
# DELETE REVIEW
# =========================================================

def remove_review(event, review_id):

    _, err = _require_roles(
        event,
        ["HR"]
    )

    if err:
        return err

    existing = get_review_by_id(
        PG_CONFIG,
        review_id
    )

    if not existing:

        return _response(
            404,
            {
                "error":
                f"Review {review_id} not found"
            }
        )

    deleted = delete_review(
        PG_CONFIG,
        review_id
    )

    if not deleted:

        return _response(
            400,
            {"error": "Delete failed"}
        )

    return _response(
        204,
        {"message": "Review deleted successfully"}
    )


# =========================================================
# ATTRITION TRENDS
# =========================================================

def get_trends(event, employee_id):

    _, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    trends = get_rating_trends(
        PG_CONFIG,
        employee_id
    )

    risk = _calculate_attrition_risk(trends)

    return _response(
        200,
        {
            "employee_id": employee_id,
            "trends": trends,
            "attrition_risk": risk,
            "total_reviews": len(trends)
        }
    )


# =========================================================
# AI SUMMARY
# =========================================================

def generate_ai_summary(event, review_id):

    _, err = _require_roles(
        event,
        ["HR", "Manager"]
    )

    if err:
        return err

    review = get_review_by_id(
        PG_CONFIG,
        review_id
    )

    if not review:

        return _response(
            404,
            {
                "error":
                f"Review {review_id} not found"
            }
        )

    rating = review["rating"]

    if rating >= 4:
        level = "exceeds expectations"

    elif rating == 3:
        level = "meets expectations"

    else:
        level = "requires improvement"

    summary = (
        f"{review['employee_name']} {level} "
        f"with a rating of {rating}/5 "
        f"for {review['review_period']}. "
        f"Strengths include {review['strengths']}. "
        f"Improvement areas include "
        f"{review['improvements']}."
    )

    update_ai_summary(
        PG_CONFIG,
        review_id,
        summary
    )

    return _response(
        200,
        {
            "message": "AI summary generated",
            "summary": summary,
            "review_id": review_id
        }
    )


if __name__ == "__main__":

    test_event = {
        "requestContext": {
            "http": {
                "method": "GET"
            }
        },
        "rawPath": "/reviews",
        "queryStringParameters": {},
        "headers": {},
    }

    print(handler(test_event))