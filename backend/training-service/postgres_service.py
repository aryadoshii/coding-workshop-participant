"""
PostgreSQL service for training-service.
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

def get_training_records(config, employee_id=None, status=None, skill_category=None):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            query = """
                SELECT
                    t.id, t.employee_id,
                    e.first_name || ' ' || e.last_name AS employee_name,
                    e.department,
                    t.training_name, t.provider,
                    t.skill_category, t.status,
                    t.completed_date, t.created_at
                FROM training_records t
                JOIN employees e ON t.employee_id = e.id
                WHERE 1=1
            """
            params = []
            if employee_id:
                query += " AND t.employee_id = %s"
                params.append(employee_id)
            if status:
                query += " AND t.status = %s"
                params.append(status)
            if skill_category:
                query += " AND t.skill_category = %s"
                params.append(skill_category)
            query += " ORDER BY t.created_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        logger.error("Error in get_training_records: %s", str(e))
        PG_CONN = None
        raise

def get_training_by_id(config, training_id):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    t.id, t.employee_id,
                    e.first_name || ' ' || e.last_name AS employee_name,
                    t.training_name, t.provider,
                    t.skill_category, t.status,
                    t.completed_date, t.created_at
                FROM training_records t
                JOIN employees e ON t.employee_id = e.id
                WHERE t.id = %s;
            """, (training_id,))
            row = cur.fetchone()
            if not row:
                return None
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, row))
    except Exception as e:
        logger.error("Error in get_training_by_id: %s", str(e))
        PG_CONN = None
        raise

def create_training(config, data):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO training_records
                    (employee_id, training_name, provider,
                     skill_category, status, completed_date)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                data["employee_id"],
                data["training_name"],
                data.get("provider"),
                data.get("skill_category"),
                data.get("status", "Planned"),
                data.get("completed_date"),
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            return new_id
    except Exception as e:
        logger.error("Error in create_training: %s", str(e))
        if PG_CONN: PG_CONN.rollback()
        PG_CONN = None
        raise

def update_training(config, training_id, data):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE training_records SET
                    training_name  = %s,
                    provider       = %s,
                    skill_category = %s,
                    status         = %s,
                    completed_date = %s
                WHERE id = %s
                RETURNING id;
            """, (
                data["training_name"],
                data.get("provider"),
                data.get("skill_category"),
                data.get("status", "Planned"),
                data.get("completed_date"),
                training_id,
            ))
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in update_training: %s", str(e))
        if PG_CONN: PG_CONN.rollback()
        PG_CONN = None
        raise

def delete_training(config, training_id):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM training_records WHERE id = %s RETURNING id;",
                (training_id,)
            )
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in delete_training: %s", str(e))
        if PG_CONN: PG_CONN.rollback()
        PG_CONN = None
        raise

def get_training_summary(config):
    """Get org-wide training completion summary for dashboard."""
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    skill_category,
                    COUNT(*) AS total,
                    SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN status='In Progress' THEN 1 ELSE 0 END) AS in_progress,
                    SUM(CASE WHEN status='Planned' THEN 1 ELSE 0 END) AS planned
                FROM training_records
                GROUP BY skill_category
                ORDER BY total DESC;
            """)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        logger.error("Error in get_training_summary: %s", str(e))
        PG_CONN = None
        raise