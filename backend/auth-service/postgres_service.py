"""
PostgreSQL service for auth-service.
Handles all database queries related to user authentication.
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


def get_user_by_email(config, email):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, password_hash, role FROM users WHERE email = %s;",
                (email,)
            )
            return cur.fetchone()
    except Exception as e:
        logger.error("Database error in get_user_by_email: %s", str(e))
        PG_CONN = None
        raise


def get_user_by_id(config, user_id):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, role FROM users WHERE id = %s;",
                (user_id,)
            )
            return cur.fetchone()
    except Exception as e:
        logger.error("Database error in get_user_by_id: %s", str(e))
        PG_CONN = None
        raise


def create_user(config, email, password_hash, role):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, password_hash, role)
                VALUES (%s, %s, %s)
                RETURNING id;
                """,
                (email, password_hash, role)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return new_id
    except Exception as e:
        logger.error("Database error in create_user: %s", str(e))
        if PG_CONN:
            PG_CONN.rollback()
        PG_CONN = None
        raise


def get_employee_by_user_id(config, user_id):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, first_name, last_name,
                       department, manager_id
                FROM employees
                WHERE user_id = %s;
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return None
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, row))
    except Exception as e:
        logger.error("Error in get_employee_by_user_id: %s", str(e))
        PG_CONN = None
        raise