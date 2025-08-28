"""Database configuration and lightweight SQLite migrations."""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "sqlite:///./contracts.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def apply_lightweight_migrations():
    """Apply minimal in-place migrations (adds optional columns if missing)."""
    with engine.connect() as conn:
        # Contracts table optional columns
        columns = [
            ("needs_review", "INTEGER DEFAULT 0"),
            ("extraction_notes", "TEXT"),
            ("uncertain_fields", "TEXT"),
            ("candidate_dates", "TEXT"),
        ]
        for name, coltype in columns:
            try:
                conn.execute(text(f"ALTER TABLE contracts ADD COLUMN {name} {coltype}"))
            except Exception:
                # Ignore if column already exists
                pass