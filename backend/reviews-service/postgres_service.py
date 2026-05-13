"""
PostgreSQL service for reviews-service.
Handles all database queries for performance review CRUD operations.
"""

import logging
from psycopg import connect

logger = logging.getLogger()

PG_CONN = None


def _get_connection(config):
    global PG_CONN
    if PG_CONN is None or PG_CONN.closed:
        PG_CONN = connect(config)
    return PG_CONN


def get_all_reviews(config, employee_id=None, reviewer_id=None):
    """Get all reviews with optional filters."""
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            query = """
                SELECT
                    r.id,
                    r.employee_id,
                    e.first_name || ' ' || e.last_name AS employee_name,
                    e.department,
                    r.reviewer_id,
                    rv.first_name || ' ' || rv.last_name AS reviewer_name,
                    r.rating,
                    r.review_period,
                    r.strengths,
                    r.improvements,
                    r.comments,
                    r.ai_summary,
                    r.review_date,
                    r.created_at
                FROM performance_reviews r
                JOIN employees e  ON r.employee_id  = e.id
                JOIN employees rv ON r.reviewer_id  = rv.id
                WHERE 1=1
            """
            params = []

            if employee_id:
                query += " AND r.employee_id = %s"
                params.append(employee_id)

            if reviewer_id:
                query += " AND r.reviewer_id = %s"
                params.append(reviewer_id)

            query += " ORDER BY r.review_date DESC, r.created_at DESC;"

            cur.execute(query, params)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]

    except Exception as e:
        logger.error("Error in get_all_reviews: %s", str(e))
        PG_CONN = None
        raise


def get_review_by_id(config, review_id):
    """Get a single review by ID."""
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    r.id,
                    r.employee_id,
                    e.first_name || ' ' || e.last_name AS employee_name,
                    e.department,
                    r.reviewer_id,
                    rv.first_name || ' ' || rv.last_name AS reviewer_name,
                    r.rating,
                    r.review_period,
                    r.strengths,
                    r.improvements,
                    r.comments,
                    r.ai_summary,
                    r.review_date,
                    r.created_at
                FROM performance_reviews r
                JOIN employees e  ON r.employee_id  = e.id
                JOIN employees rv ON r.reviewer_id  = rv.id
                WHERE r.id = %s;
            """, (review_id,))
            row = cur.fetchone()
            if not row:
                return None
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, row))
    except Exception as e:
        logger.error("Error in get_review_by_id: %s", str(e))
        PG_CONN = None
        raise


def create_review(config, data):
    """Create a new performance review."""
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO performance_reviews
                    (employee_id, reviewer_id, rating, review_period,
                     strengths, improvements, comments, review_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                data["employee_id"],
                data["reviewer_id"],
                data["rating"],
                data.get("review_period"),
                data.get("strengths"),
                data.get("improvements"),
                data.get("comments"),
                data.get("review_date"),
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            return new_id
    except Exception as e:
        logger.error("Error in create_review: %s", str(e))
        if PG_CONN:
            PG_CONN.rollback()
        PG_CONN = None
        raise


def update_review(config, review_id, data):
    """Update an existing review."""
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE performance_reviews SET
                    rating        = %s,
                    review_period = %s,
                    strengths     = %s,
                    improvements  = %s,
                    comments      = %s,
                    review_date   = %s
                WHERE id = %s
                RETURNING id;
            """, (
                data["rating"],
                data.get("review_period"),
                data.get("strengths"),
                data.get("improvements"),
                data.get("comments"),
                data.get("review_date"),
                review_id,
            ))
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in update_review: %s", str(e))
        if PG_CONN:
            PG_CONN.rollback()
        PG_CONN = None
        raise


def update_ai_summary(config, review_id, summary):
    """Save AI-generated summary for a review."""
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE performance_reviews
                SET ai_summary = %s
                WHERE id = %s
                RETURNING id;
            """, (summary, review_id))
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in update_ai_summary: %s", str(e))
        PG_CONN = None
        raise


def delete_review(config, review_id):
    """Delete a review by ID."""
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM performance_reviews WHERE id = %s RETURNING id;",
                (review_id,)
            )
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in delete_review: %s", str(e))
        if PG_CONN:
            PG_CONN.rollback()
        PG_CONN = None
        raise


def get_rating_trends(config, employee_id):
    """
    Get rating history for an employee — used for attrition risk calculation.
    Returns list of ratings ordered by date (oldest first).
    """
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT rating, review_period, review_date
                FROM performance_reviews
                WHERE employee_id = %s
                ORDER BY review_date ASC;
            """, (employee_id,))
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        logger.error("Error in get_rating_trends: %s", str(e))
        PG_CONN = None
        raise