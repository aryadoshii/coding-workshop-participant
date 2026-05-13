"""
PostgreSQL service for plans-service.
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

def get_plans(config, employee_id=None, status=None):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            query = """
                SELECT
                    p.id, p.employee_id,
                    e.first_name || ' ' || e.last_name AS employee_name,
                    e.department,
                    p.goal, p.description,
                    p.status, p.target_date,
                    p.created_at
                FROM development_plans p
                JOIN employees e ON p.employee_id = e.id
                WHERE 1=1
            """
            params = []
            if employee_id:
                query += " AND p.employee_id = %s"
                params.append(employee_id)
            if status:
                query += " AND p.status = %s"
                params.append(status)
            query += " ORDER BY p.target_date ASC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        logger.error("Error in get_plans: %s", str(e))
        PG_CONN = None
        raise

def get_plan_by_id(config, plan_id):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    p.id, p.employee_id,
                    e.first_name || ' ' || e.last_name AS employee_name,
                    e.department,
                    p.goal, p.description,
                    p.status, p.target_date,
                    p.created_at
                FROM development_plans p
                JOIN employees e ON p.employee_id = e.id
                WHERE p.id = %s;
            """, (plan_id,))
            row = cur.fetchone()
            if not row:
                return None
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, row))
    except Exception as e:
        logger.error("Error in get_plan_by_id: %s", str(e))
        PG_CONN = None
        raise

def create_plan(config, data):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO development_plans
                    (employee_id, goal, description, status, target_date)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                data["employee_id"],
                data["goal"],
                data.get("description"),
                data.get("status", "In Progress"),
                data.get("target_date"),
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            return new_id
    except Exception as e:
        logger.error("Error in create_plan: %s", str(e))
        if PG_CONN: PG_CONN.rollback()
        PG_CONN = None
        raise

def update_plan(config, plan_id, data):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE development_plans SET
                    goal        = %s,
                    description = %s,
                    status      = %s,
                    target_date = %s
                WHERE id = %s
                RETURNING id;
            """, (
                data["goal"],
                data.get("description"),
                data.get("status", "In Progress"),
                data.get("target_date"),
                plan_id,
            ))
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in update_plan: %s", str(e))
        if PG_CONN: PG_CONN.rollback()
        PG_CONN = None
        raise

def delete_plan(config, plan_id):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM development_plans WHERE id = %s RETURNING id;",
                (plan_id,)
            )
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in delete_plan: %s", str(e))
        if PG_CONN: PG_CONN.rollback()
        PG_CONN = None
        raise

def get_plans_summary(config):
    """Get summary of plans by status for dashboard."""
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    status,
                    COUNT(*) AS total
                FROM development_plans
                GROUP BY status
                ORDER BY total DESC;
            """)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        logger.error("Error in get_plans_summary: %s", str(e))
        PG_CONN = None
        raise

def get_promotion_ready(config):
    """
    Identify employees ready for promotion:
    - All competencies at target level
    - Last review rating >= 4
    """
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT
                    e.id, e.first_name || ' ' || e.last_name AS name,
                    e.department, e.designation,
                    ROUND(AVG(r.rating), 1) AS avg_rating
                FROM employees e
                JOIN performance_reviews r ON r.employee_id = e.id
                WHERE e.id NOT IN (
                    SELECT employee_id FROM competencies
                    WHERE current_level < target_level
                )
                GROUP BY e.id, e.first_name, e.last_name,
                         e.department, e.designation
                HAVING AVG(r.rating) >= 4
                ORDER BY avg_rating DESC;
            """)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        logger.error("Error in get_promotion_ready: %s", str(e))
        PG_CONN = None
        raise