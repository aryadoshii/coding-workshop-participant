"""
Competencies Service — Lambda Handler
Endpoints:
  GET    /competencies                    → list (role-filtered)
  POST   /competencies                    → create (HR/Manager)
  PUT    /competencies/{id}               → update
  DELETE /competencies/{id}               → delete (HR)
  GET    /competencies/skill-distribution → org-wide skill averages + gaps
  GET    /competencies/critical-gaps      → employees with gap >= 2
"""

import json
import os
import psycopg
import jwt

DB_URL = os.environ.get("DATABASE_URL", (
    "host=localhost port=5432 "
    "user=postgres password=postgres "
    "dbname=acme_performance connect_timeout=15"
))
JWT_SECRET = os.environ.get("JWT_SECRET", "acme-secret-key")


def get_conn():
    return psycopg.connect(DB_URL)


def decode_token(event):
    auth = (event.get("headers") or {}).get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


def resp(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body, default=str),
    }


def err(status, msg):
    return resp(status, {"error": msg})


# ── business logic ────────────────────────────────────────────────────────────

def get_skill_distribution(cur):
    """Avg current/target per skill across entire org, sorted by biggest gap."""
    cur.execute("""
        SELECT
            skill_name,
            category,
            ROUND(AVG(current_level)::NUMERIC, 2)                        AS avg_current,
            ROUND(AVG(target_level)::NUMERIC, 2)                         AS avg_target,
            COUNT(DISTINCT employee_id)                                   AS employee_count,
            ROUND((AVG(target_level) - AVG(current_level))::NUMERIC, 2)  AS avg_gap
        FROM competencies
        GROUP BY skill_name, category
        ORDER BY avg_gap DESC
    """)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def get_critical_gaps(cur):
    """Employees where current_level <= 2 AND target_level >= 4 (gap >= 2)."""
    cur.execute("""
        SELECT
            c.id,
            e.first_name || ' ' || e.last_name AS employee_name,
            e.department,
            e.designation,
            c.skill_name,
            c.category,
            c.current_level,
            c.target_level,
            (c.target_level - c.current_level) AS gap
        FROM competencies c
        JOIN employees e ON e.id = c.employee_id
        WHERE c.current_level <= 2 AND c.target_level >= 4
        ORDER BY gap DESC, e.first_name
    """)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def list_competencies(cur, claims):
    role = claims.get("role")
    employee_id = claims.get("employee_id")

    if role == "Employee":
        cur.execute("""
            SELECT c.*,
                   e.first_name || ' ' || e.last_name AS employee_name,
                   e.department
            FROM competencies c
            JOIN employees e ON e.id = c.employee_id
            WHERE c.employee_id = %s
            ORDER BY c.skill_name
        """, (employee_id,))
    elif role == "Manager":
        cur.execute("""
            SELECT c.*,
                   e.first_name || ' ' || e.last_name AS employee_name,
                   e.department
            FROM competencies c
            JOIN employees e ON e.id = c.employee_id
            WHERE e.manager_id = %s
            ORDER BY c.skill_name
        """, (employee_id,))
    else:
        cur.execute("""
            SELECT c.*,
                   e.first_name || ' ' || e.last_name AS employee_name,
                   e.department
            FROM competencies c
            JOIN employees e ON e.id = c.employee_id
            ORDER BY c.skill_name
        """)

    cols = [d[0] for d in cur.description]
    return resp(200, {"competencies": [dict(zip(cols, r)) for r in cur.fetchall()]})


def create_competency(cur, conn, body, claims):
    if claims.get("role") == "Employee":
        return err(403, "Forbidden")
    cur.execute("""
        INSERT INTO competencies
            (employee_id, skill_name, current_level, target_level, category)
        VALUES (%s,%s,%s,%s,%s)
        RETURNING id
    """, (
        body.get("employee_id"),
        body.get("skill_name"),
        body.get("current_level", 1),
        body.get("target_level", 5),
        body.get("category", "Technical"),
    ))
    new_id = cur.fetchone()[0]
    conn.commit()
    return resp(201, {"id": new_id, "message": "Competency created"})


def update_competency(cur, conn, comp_id, body, claims):
    if claims.get("role") == "Employee":
        return err(403, "Forbidden")
    cur.execute("""
        UPDATE competencies
        SET current_level=%s, target_level=%s, category=%s
        WHERE id=%s
    """, (
        body.get("current_level"),
        body.get("target_level"),
        body.get("category"),
        comp_id,
    ))
    conn.commit()
    return resp(200, {"message": "Updated"})


def delete_competency(cur, conn, comp_id, claims):
    if claims.get("role") != "HR":
        return err(403, "Forbidden")
    cur.execute("DELETE FROM competencies WHERE id=%s", (comp_id,))
    conn.commit()
    return resp(200, {"message": "Deleted"})


# ── lambda entrypoint ─────────────────────────────────────────────────────────

def lambda_handler(event, context):
    method = event.get("httpMethod", "GET")
    path   = event.get("path", "/competencies")
    body   = {}

    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    if method == "OPTIONS":
        return resp(200, {})

    try:
        claims = decode_token(event)
    except Exception:
        return err(401, "Unauthorized")

    try:
        conn = get_conn()
        cur  = conn.cursor()

        if method == "GET" and path.endswith("/skill-distribution"):
            dist = get_skill_distribution(cur)
            return resp(200, {"skill_distribution": dist})

        if method == "GET" and path.endswith("/critical-gaps"):
            if claims.get("role") == "Employee":
                return err(403, "Forbidden")
            gaps = get_critical_gaps(cur)
            return resp(200, {"critical_gaps": gaps})

        if method == "GET":
            return list_competencies(cur, claims)

        if method == "POST":
            return create_competency(cur, conn, body, claims)

        if method == "PUT":
            comp_id = int(path.split("/")[-1])
            return update_competency(cur, conn, comp_id, body, claims)

        if method == "DELETE":
            comp_id = int(path.split("/")[-1])
            return delete_competency(cur, conn, comp_id, claims)

        return err(405, "Method not allowed")

    except Exception as e:
        return err(500, str(e))
