from sqlalchemy import create_engine, text
engine = create_engine("postgresql://upkeep:upkeep@localhost:5432/upkeep")
with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT typname FROM pg_type WHERE typname IN ('biketype','componentcategory')"
    )).fetchall()
    print("Types found:", rows)
    tables = conn.execute(text(
        "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    )).fetchall()
    print("Tables:", tables)
