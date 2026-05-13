"""
PostgreSQL service for competencies-service.
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

def get_competencies(config, employee_id=None, category=None):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            query = """
                SELECT
                    c.id, c.employee_id,
                    e.first_name || ' ' || e.last_name AS employee_name,
                    e.department,
                    c.skill_name, c.current_level,
                    c.target_level, c.category,
                    c.target_level - c.current_level AS gap,
                    c.created_at
                FROM competencies c
                JOIN employees e ON c.employee_id = e.id
                WHERE 1=1
            """
            params = []
            if employee_id:
                query += " AND c.employee_id = %s"
                params.append(employee_id)
            if category:
                query += " AND c.category = %s"
                params.append(category)
            query += " ORDER BY gap DESC, c.skill_name;"
            cur.execute(query, params)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        logger.error("Error in get_competencies: %s", str(e))
        PG_CONN = None
        raise

def get_competency_by_id(config, comp_id):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.id, c.employee_id,
                    e.first_name || ' ' || e.last_name AS employee_name,
                    c.skill_name, c.current_level,
                    c.target_level, c.category,
                    c.target_level - c.current_level AS gap,
                    c.created_at
                FROM competencies c
                JOIN employees e ON c.employee_id = e.id
                WHERE c.id = %s;
            """, (comp_id,))
            row = cur.fetchone()
            if not row:
                return None
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, row))
    except Exception as e:
        logger.error("Error in get_competency_by_id: %s", str(e))
        PG_CONN = None
        raise

def create_competency(config, data):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO competencies
                    (employee_id, skill_name, current_level, target_level, category)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                data["employee_id"],
                data["skill_name"],
                data["current_level"],
                data["target_level"],
                data.get("category", "Technical"),
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            return new_id
    except Exception as e:
        logger.error("Error in create_competency: %s", str(e))
        if PG_CONN: PG_CONN.rollback()
        PG_CONN = None
        raise

def update_competency(config, comp_id, data):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE competencies SET
                    skill_name    = %s,
                    current_level = %s,
                    target_level  = %s,
                    category      = %s
                WHERE id = %s
                RETURNING id;
            """, (
                data["skill_name"],
                data["current_level"],
                data["target_level"],
                data.get("category", "Technical"),
                comp_id,
            ))
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in update_competency: %s", str(e))
        if PG_CONN: PG_CONN.rollback()
        PG_CONN = None
        raise

def delete_competency(config, comp_id):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM competencies WHERE id = %s RETURNING id;",
                (comp_id,)
            )
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in delete_competency: %s", str(e))
        if PG_CONN: PG_CONN.rollback()
        PG_CONN = None
        raise

def get_skill_gap_summary(config):
    """Get org-wide skill gap summary for dashboard heatmap."""
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    e.department,
                    c.skill_name,
                    ROUND(AVG(c.current_level), 1) AS avg_current,
                    ROUND(AVG(c.target_level), 1)  AS avg_target,
                    ROUND(AVG(c.target_level - c.current_level), 1) AS avg_gap
                FROM competencies c
                JOIN employees e ON c.employee_id = e.id
                GROUP BY e.department, c.skill_name
                ORDER BY avg_gap DESC;
            """)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        logger.error("Error in get_skill_gap_summary: %s", str(e))
        PG_CONN = None
        raise