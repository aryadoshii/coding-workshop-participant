"""
Seed script — populates acme_performance database with realistic dummy data.
Run once: python3 backend/seed.py
"""

import psycopg
import bcrypt
from datetime import date

PG_CONFIG = (
    "host=localhost port=5432 "
    "user=postgres password=postgres "
    "dbname=acme_performance connect_timeout=15"
)

def seed():
    conn = psycopg.connect(PG_CONFIG)
    cur = conn.cursor()

    print("🌱 Seeding database...")

    # ── Users ────────────────────────────────────────────────
    print("Creating users...")
    password = bcrypt.hashpw("Admin@123".encode(), bcrypt.gensalt()).decode()

    users = [
        ("admin@acme.com",       password, "HR"),
        ("sarah.hr@acme.com",    password, "HR"),
        ("john.mgr@acme.com",    password, "Manager"),
        ("priya.mgr@acme.com",   password, "Manager"),
        ("alex.emp@acme.com",    password, "Employee"),
        ("maria.emp@acme.com",   password, "Employee"),
        ("james.emp@acme.com",   password, "Employee"),
        ("nina.emp@acme.com",    password, "Employee"),
        ("ravi.emp@acme.com",    password, "Employee"),
        ("lisa.emp@acme.com",    password, "Employee"),
    ]

    cur.execute("DELETE FROM training_records;")
    cur.execute("DELETE FROM competencies;")
    cur.execute("DELETE FROM development_plans;")
    cur.execute("DELETE FROM performance_reviews;")
    cur.execute("DELETE FROM employees;")
    cur.execute("DELETE FROM users;")

    user_ids = []
    for email, pw, role in users:
        cur.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s) RETURNING id;",
            (email, pw, role)
        )
        user_ids.append(cur.fetchone()[0])

    # ── Employees ─────────────────────────────────────────────
    print("Creating employees...")
    employees = [
        # (first, last, email, dept, designation, manager_id, join_date, status, user_id)
        ("Admin",  "User",    "admin@acme.com",      "HR",          "HR Director",       None, date(2020,1,15), "Active", user_ids[0]),
        ("Sarah",  "Johnson", "sarah.hr@acme.com",   "HR",          "HR Manager",        None, date(2020,3,10), "Active", user_ids[1]),
        ("John",   "Smith",   "john.mgr@acme.com",   "Engineering", "Engineering Manager",None, date(2019,6,1),  "Active", user_ids[2]),
        ("Priya",  "Patel",   "priya.mgr@acme.com",  "Product",     "Product Manager",   None, date(2020,9,15), "Active", user_ids[3]),
        ("Alex",   "Chen",    "alex.emp@acme.com",   "Engineering", "Senior Developer",  None, date(2021,2,1),  "Active", user_ids[4]),
        ("Maria",  "Garcia",  "maria.emp@acme.com",  "Engineering", "Developer",         None, date(2022,1,10), "Active", user_ids[5]),
        ("James",  "Wilson",  "james.emp@acme.com",  "Product",     "Product Analyst",   None, date(2021,7,20), "Active", user_ids[6]),
        ("Nina",   "Roberts", "nina.emp@acme.com",   "Engineering", "Junior Developer",  None, date(2023,3,5),  "Active", user_ids[7]),
        ("Ravi",   "Kumar",   "ravi.emp@acme.com",   "Product",     "UX Designer",       None, date(2022,5,15), "Active", user_ids[8]),
        ("Lisa",   "Wong",    "lisa.emp@acme.com",   "Engineering", "DevOps Engineer",   None, date(2021,11,1), "Active", user_ids[9]),
    ]

    emp_ids = []
    for first, last, email, dept, designation, mgr, join, status, uid in employees:
        cur.execute("""
            INSERT INTO employees
                (first_name, last_name, email, department, designation,
                 manager_id, join_date, status, user_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id;
        """, (first, last, email, dept, designation, mgr, join, status, uid))
        emp_ids.append(cur.fetchone()[0])

    # Set managers
    john_id  = emp_ids[2]   # Engineering Manager
    priya_id = emp_ids[3]   # Product Manager

    # Engineering team reports to John
    for i in [4, 5, 7, 9]:  # Alex, Maria, Nina, Lisa
        cur.execute("UPDATE employees SET manager_id=%s WHERE id=%s;", (john_id, emp_ids[i]))

    # Product team reports to Priya
    for i in [6, 8]:  # James, Ravi
        cur.execute("UPDATE employees SET manager_id=%s WHERE id=%s;", (priya_id, emp_ids[i]))

    # ── Performance Reviews ────────────────────────────────────
    print("Creating performance reviews...")
    reviews = [
        # (employee_id, reviewer_id, rating, period, strengths, improvements, comments)
        (emp_ids[4], john_id,  5, "Q1 2026", "Excellent problem solving, strong leadership", "Could mentor juniors more", "Outstanding performer, promotion ready"),
        (emp_ids[4], john_id,  4, "Q4 2025", "Delivered project ahead of schedule", "Communication with stakeholders", "Consistently high performer"),
        (emp_ids[5], john_id,  3, "Q1 2026", "Good technical skills", "Needs to improve code review speed", "Meeting expectations"),
        (emp_ids[5], john_id,  2, "Q4 2025", "Shows initiative", "Deadlines need improvement", "Below expectations this quarter"),
        (emp_ids[6], priya_id, 4, "Q1 2026", "Great analytical skills", "Could improve presentation skills", "Strong contributor"),
        (emp_ids[7], john_id,  2, "Q1 2026", "Eager to learn", "Needs more technical depth", "Junior level, needs improvement"),
        (emp_ids[7], john_id,  2, "Q4 2025", "Good attitude", "Quality of work needs improvement", "At risk — consistent low ratings"),
        (emp_ids[8], priya_id, 5, "Q1 2026", "Creative designs, user-focused", "Could learn more about dev constraints", "Exceptional UX work"),
        (emp_ids[9], john_id,  4, "Q1 2026", "Strong DevOps skills", "Documentation could be better", "Reliable and skilled"),
    ]

    for emp, rev, rating, period, strengths, improvements, comments in reviews:
        cur.execute("""
            INSERT INTO performance_reviews
                (employee_id, reviewer_id, rating, review_period,
                 strengths, improvements, comments, review_date)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s);
        """, (emp, rev, rating, period, strengths, improvements, comments, date(2026,3,31)))

    # ── Competencies ───────────────────────────────────────────
    print("Creating competencies...")
    competencies = [
        # (employee_id, skill, current, target, category)
        (emp_ids[4], "Python",          5, 5, "Technical"),
        (emp_ids[4], "System Design",   4, 5, "Technical"),
        (emp_ids[4], "Leadership",      4, 5, "Soft Skills"),
        (emp_ids[5], "Python",          3, 4, "Technical"),
        (emp_ids[5], "React",           2, 4, "Technical"),
        (emp_ids[5], "Communication",   2, 4, "Soft Skills"),
        (emp_ids[6], "Data Analysis",   4, 5, "Technical"),
        (emp_ids[6], "Presentation",    3, 4, "Soft Skills"),
        (emp_ids[7], "Python",          2, 4, "Technical"),
        (emp_ids[7], "Problem Solving", 2, 4, "Technical"),
        (emp_ids[8], "Figma",           5, 5, "Technical"),
        (emp_ids[8], "User Research",   4, 5, "Technical"),
        (emp_ids[9], "AWS",             4, 5, "Technical"),
        (emp_ids[9], "Docker",          4, 5, "Technical"),
        (emp_ids[9], "CI/CD",           3, 5, "Technical"),
    ]

    for emp, skill, current, target, cat in competencies:
        cur.execute("""
            INSERT INTO competencies
                (employee_id, skill_name, current_level, target_level, category)
            VALUES (%s,%s,%s,%s,%s);
        """, (emp, skill, current, target, cat))

    # ── Development Plans ──────────────────────────────────────
    print("Creating development plans...")
    plans = [
        (emp_ids[4], "Complete AWS Solutions Architect certification", "Focus on cloud architecture", "In Progress", date(2026,6,30)),
        (emp_ids[5], "Improve React skills to senior level",           "Complete React advanced course", "In Progress", date(2026,5,31)),
        (emp_ids[5], "Improve communication and presentation",         "Join Toastmasters club",        "In Progress", date(2026,7,31)),
        (emp_ids[6], "Get certified in Data Analytics",                "Complete Google Data Analytics", "Completed",   date(2026,2,28)),
        (emp_ids[7], "Build stronger Python fundamentals",             "Complete Python bootcamp",      "Overdue",     date(2026,3,31)),
        (emp_ids[8], "Learn design systems at scale",                  "Study Material Design system",  "In Progress", date(2026,8,31)),
        (emp_ids[9], "Master Kubernetes",                              "Complete CKA certification",    "In Progress", date(2026,9,30)),
    ]

    for emp, goal, desc, status, target in plans:
        cur.execute("""
            INSERT INTO development_plans
                (employee_id, goal, description, status, target_date)
            VALUES (%s,%s,%s,%s,%s);
        """, (emp, goal, desc, status, target))

    # ── Training Records ───────────────────────────────────────
    print("Creating training records...")
    training = [
        (emp_ids[4], "AWS Solutions Architect",     "Amazon",   "Cloud",      "In Progress", None),
        (emp_ids[4], "Leadership Essentials",        "Coursera", "Leadership", "Completed",   date(2025,12,15)),
        (emp_ids[5], "React Advanced Patterns",      "Udemy",    "Frontend",   "In Progress", None),
        (emp_ids[5], "Effective Communication",      "LinkedIn", "Soft Skills","Completed",   date(2026,1,20)),
        (emp_ids[6], "Google Data Analytics",        "Google",   "Analytics",  "Completed",   date(2026,2,10)),
        (emp_ids[7], "Python for Beginners",         "Codecademy","Backend",   "Completed",   date(2026,1,5)),
        (emp_ids[7], "Clean Code Principles",        "Udemy",    "Technical",  "Planned",     None),
        (emp_ids[8], "Advanced Figma",               "Figma",    "Design",     "Completed",   date(2025,11,20)),
        (emp_ids[9], "Certified Kubernetes Admin",   "CNCF",     "DevOps",     "In Progress", None),
        (emp_ids[9], "Terraform Associate",          "HashiCorp","DevOps",     "Completed",   date(2026,1,15)),
    ]

    for emp, name, provider, skill_cat, status, completed in training:
        cur.execute("""
            INSERT INTO training_records
                (employee_id, training_name, provider,
                 skill_category, status, completed_date)
            VALUES (%s,%s,%s,%s,%s,%s);
        """, (emp, name, provider, skill_cat, status, completed))

    conn.commit()
    cur.close()
    conn.close()

    print("✅ Database seeded successfully!")
    print(f"   👥 {len(users)} users created")
    print(f"   🏢 {len(employees)} employees created")
    print(f"   ⭐ {len(reviews)} performance reviews created")
    print(f"   🎯 {len(competencies)} competencies created")
    print(f"   📋 {len(plans)} development plans created")
    print(f"   📚 {len(training)} training records created")
    print("\n🔑 All users login with password: Admin@123")
    print("   admin@acme.com     → HR Admin")
    print("   john.mgr@acme.com  → Manager (Engineering)")
    print("   priya.mgr@acme.com → Manager (Product)")
    print("   alex.emp@acme.com  → Employee (Senior Dev)")

if __name__ == "__main__":
    seed()