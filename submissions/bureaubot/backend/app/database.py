from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
elif "postgresql" in settings.database_url:
    connect_args["connect_timeout"] = 2

import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bureaubot.db"))
fallback_url = f"sqlite:///{db_path}"
try:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        future=True,
        connect_args=connect_args,
    )
    with engine.connect() as conn:
        pass
except Exception:
    engine = create_engine(
        fallback_url,
        pool_pre_ping=True,
        future=True,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
