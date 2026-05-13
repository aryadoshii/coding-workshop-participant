"""
Reviews Service - Full CRUD for performance reviews + AI summary generation.
Endpoints:
  GET    /reviews                    → list all reviews (filterable)
  GET    /reviews/{id}               → get one review
  POST   /reviews                    → create review (HR/Manager only)
  PUT    /reviews/{id}               → update review (HR/Manager only)
  DELETE /reviews/{id}               → delete review (HR only)
  POST   /reviews/{id}/ai-summary    → generate AI summary (HR/Manager)
  GET    /reviews/trends/{emp_id}    → rating trend for attrition risk
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
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def _require_roles(event, allowed_roles):
    user = _verify_token(event)
    if not user:
        return None, _response(401, {"error": "Unauthorized"})
    if user["role"] not in allowed_roles:
        return None, _response(403, {"error": "Forbidden"})
    return user, None


def _calculate_attrition_risk(trends):
    """
    Simple attrition risk engine.
    Rule: 2+ consecutive ratings of 1 or 2 = At Risk
    """
    if len(trends) < 2:
        return "Low"
    ratings = [t["rating"] for t in trends]
    # Check last 2 ratings
    if ratings[-1] <= 2 and ratings[-2] <= 2:
        return "High"
    if ratings[-1] <= 3:
        return "Medium"
    return "Low"


def handler(event=None, context=None):
    logger.info("Event: %s", event)

    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/")
    params = event.get("queryStringParameters") or {}

    if method == "OPTIONS":
        return _response(200, {})

    try:
        # GET /reviews/trends/{employee_id}
        if method == "GET" and path.startswith("/reviews/trends/"):
            employee_id = int(path.split("/")[-1])
            return get_trends(event, employee_id)

        # POST /reviews/{id}/ai-summary
        elif method == "POST" and path.endswith("/ai-summary"):
            review_id = int(path.split("/")[-2])
            return generate_ai_summary(event, review_id)

        # GET /reviews
        elif method == "GET" and path == "/reviews":
            return list_reviews(event, params)

        # GET /reviews/{id}
        elif method == "GET" and path.startswith("/reviews/"):
            review_id = int(path.split("/")[-1])
            return get_review(event, review_id)

        # POST /reviews
        elif method == "POST" and path == "/reviews":
            body = json.loads(event.get("body", "{}"))
            return add_review(event, body)

        # PUT /reviews/{id}
        elif method == "PUT" and path.startswith("/reviews/"):
            review_id = int(path.split("/")[-1])
            body = json.loads(event.get("body", "{}"))
            return edit_review(event, review_id, body)

        # DELETE /reviews/{id}
        elif method == "DELETE" and path.startswith("/reviews/"):
            review_id = int(path.split("/")[-1])
            return remove_review(event, review_id)

        else:
            return _response(404, {"error": f"Route not found: {method} {path}"})

    except ValueError:
        return _response(400, {"error": "Invalid ID format"})
    except Exception as e:
        logger.error("Handler error: %s", str(e), exc_info=True)
        return _response(500, {"error": "Internal server error", "message": str(e)})


def list_reviews(event, params):
    """GET /reviews — all roles, filtered by employee or reviewer."""
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err:
        return err

    employee_id = params.get("employee_id")
    reviewer_id = params.get("reviewer_id")

    if employee_id:
        employee_id = int(employee_id)
    if reviewer_id:
        reviewer_id = int(reviewer_id)

    reviews = get_all_reviews(PG_CONFIG, employee_id, reviewer_id)
    return _response(200, {"reviews": reviews, "total": len(reviews)})


def get_review(event, review_id):
    """GET /reviews/{id}"""
    _, err = _require_roles(event, ["HR", "Manager", "Employee"])
    if err:
        return err

    review = get_review_by_id(PG_CONFIG, review_id)
    if not review:
        return _response(404, {"error": f"Review {review_id} not found"})
    return _response(200, {"review": review})


def add_review(event, body):
    """POST /reviews — HR and Manager only."""
    _, err = _require_roles(event, ["HR", "Manager"])
    if err:
        return err

    required = ["employee_id", "reviewer_id", "rating"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return _response(400, {"error": f"Missing required fields: {missing}"})

    if not (1 <= int(body["rating"]) <= 5):
        return _response(400, {"error": "Rating must be between 1 and 5"})

    new_id = create_review(PG_CONFIG, body)
    return _response(201, {
        "message": "Review created successfully",
        "review_id": new_id
    })


def edit_review(event, review_id, body):
    """PUT /reviews/{id} — HR and Manager only."""
    _, err = _require_roles(event, ["HR", "Manager"])
    if err:
        return err

    existing = get_review_by_id(PG_CONFIG, review_id)
    if not existing:
        return _response(404, {"error": f"Review {review_id} not found"})

    updated = update_review(PG_CONFIG, review_id, body)
    if not updated:
        return _response(400, {"error": "Update failed"})

    return _response(200, {"message": "Review updated successfully"})


def remove_review(event, review_id):
    """DELETE /reviews/{id} — HR only."""
    _, err = _require_roles(event, ["HR"])
    if err:
        return err

    existing = get_review_by_id(PG_CONFIG, review_id)
    if not existing:
        return _response(404, {"error": f"Review {review_id} not found"})

    deleted = delete_review(PG_CONFIG, review_id)
    if not deleted:
        return _response(400, {"error": "Delete failed"})

    return _response(204, {"message": "Review deleted successfully"})


def get_trends(event, employee_id):
    """GET /reviews/trends/{employee_id} — attrition risk calculation."""
    _, err = _require_roles(event, ["HR", "Manager"])
    if err:
        return err

    trends = get_rating_trends(PG_CONFIG, employee_id)
    risk = _calculate_attrition_risk(trends)

    return _response(200, {
        "employee_id": employee_id,
        "trends": trends,
        "attrition_risk": risk,
        "total_reviews": len(trends)
    })


def generate_ai_summary(event, review_id):
    """
    POST /reviews/{id}/ai-summary
    Generates an AI summary of the review using available LLM.
    HR and Manager only.
    """
    _, err = _require_roles(event, ["HR", "Manager"])
    if err:
        return err

    review = get_review_by_id(PG_CONFIG, review_id)
    if not review:
        return _response(404, {"error": f"Review {review_id} not found"})

    # Build AI prompt from review data
    prompt = f"""
    Generate a professional performance review summary for:
    Employee: {review['employee_name']}
    Department: {review['department']}
    Rating: {review['rating']}/5
    Review Period: {review['review_period']}
    Strengths: {review['strengths']}
    Areas for Improvement: {review['improvements']}
    Comments: {review['comments']}

    Write a concise 3-4 sentence professional summary suitable
    for an HR record. Be constructive and specific.
    """

    try:
        # Try OpenAI first
        import urllib.request
        api_key = os.getenv("OPENAI_API_KEY", "")

        if api_key:
            data = json.dumps({
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 200
            }).encode()

            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=data,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read())
                summary = result["choices"][0]["message"]["content"].strip()
        else:
            # Fallback: rule-based summary if no API key
            rating = review["rating"]
            name = review["employee_name"]
            if rating >= 4:
                level = "exceeds expectations"
            elif rating == 3:
                level = "meets expectations"
            else:
                level = "requires improvement"

            summary = (
                f"{name} {level} with a rating of {rating}/5 "
                f"for {review['review_period']}. "
                f"Key strengths include: {review['strengths']}. "
                f"Focus areas: {review['improvements']}."
            )

        # Save to database
        update_ai_summary(PG_CONFIG, review_id, summary)
        return _response(200, {
            "message": "AI summary generated",
            "summary": summary,
            "review_id": review_id
        })

    except Exception as e:
        logger.error("AI summary error: %s", str(e))
        return _response(500, {"error": "Failed to generate summary", "message": str(e)})


if __name__ == "__main__":
    test_event = {
        "requestContext": {"http": {"method": "GET"}},
        "rawPath": "/reviews",
        "queryStringParameters": {},
        "headers": {},
    }
    print(handler(test_event))