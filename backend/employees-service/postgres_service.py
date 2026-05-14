"""
PostgreSQL service for employees-service.
Handles all database queries for employee CRUD operations.
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


def get_all_employees(config, department=None, status=None, search=None, manager_id=None):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            query = """
                SELECT
                    e.id, e.first_name, e.last_name, e.email,
                    e.department, e.designation, e.status,
                    e.join_date, e.created_at,
                    m.first_name || ' ' || m.last_name AS manager_name
                FROM employees e
                LEFT JOIN employees m ON e.manager_id = m.id
                WHERE 1=1
            """
            params = []

            if department:
                query += " AND e.department = %s"
                params.append(department)

            if status:
                query += " AND e.status = %s"
                params.append(status)

            if search:
                query += " AND (e.first_name ILIKE %s OR e.last_name ILIKE %s OR e.email ILIKE %s)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

            if manager_id:
                query += " AND e.manager_id = %s"
                params.append(manager_id)

            query += " ORDER BY e.created_at DESC;"

            cur.execute(query, params)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]

    except Exception as e:
        logger.error("Error in get_all_employees: %s", str(e))
        PG_CONN = None
        raise


def get_employee_by_id(config, employee_id):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    e.id, e.first_name, e.last_name, e.email,
                    e.department, e.designation, e.status,
                    e.join_date, e.created_at, e.manager_id,
                    m.first_name || ' ' || m.last_name AS manager_name
                FROM employees e
                LEFT JOIN employees m ON e.manager_id = m.id
                WHERE e.id = %s;
            """, (employee_id,))
            row = cur.fetchone()
            if not row:
                return None
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, row))
    except Exception as e:
        logger.error("Error in get_employee_by_id: %s", str(e))
        PG_CONN = None
        raise


def create_employee(config, data):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO employees
                    (first_name, last_name, email, department,
                     designation, manager_id, join_date, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                data["first_name"],
                data["last_name"],
                data["email"],
                data.get("department"),
                data.get("designation"),
                data.get("manager_id"),
                data.get("join_date"),
                data.get("status", "Active"),
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            return new_id
    except Exception as e:
        logger.error("Error in create_employee: %s", str(e))
        if PG_CONN:
            PG_CONN.rollback()
        PG_CONN = None
        raise


def update_employee(config, employee_id, data):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE employees SET
                    first_name  = %s,
                    last_name   = %s,
                    email       = %s,
                    department  = %s,
                    designation = %s,
                    manager_id  = %s,
                    status      = %s
                WHERE id = %s
                RETURNING id;
            """, (
                data["first_name"],
                data["last_name"],
                data["email"],
                data.get("department"),
                data.get("designation"),
                data.get("manager_id"),
                data.get("status", "Active"),
                employee_id,
            ))
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in update_employee: %s", str(e))
        if PG_CONN:
            PG_CONN.rollback()
        PG_CONN = None
        raise


def delete_employee(config, employee_id):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM employees WHERE id = %s RETURNING id;",
                (employee_id,)
            )
            result = cur.fetchone()
            conn.commit()
            return result is not None
    except Exception as e:
        logger.error("Error in delete_employee: %s", str(e))
        if PG_CONN:
            PG_CONN.rollback()
        PG_CONN = None
        raise


def get_departments(config):
    global PG_CONN
    try:
        conn = _get_connection(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT department
                FROM employees
                WHERE department IS NOT NULL
                ORDER BY department;
            """)
            return [row[0] for row in cur.fetchall()]
    except Exception as e:
        logger.error("Error in get_departments: %s", str(e))
        PG_CONN = None
        raise