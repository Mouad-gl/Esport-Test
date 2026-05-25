from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.config import settings

# SQLite needs connect_args; PostgreSQL does not
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from backend.models import team, player, pose, generation  # noqa: F401 — registers models
    Base.metadata.create_all(bind=engine)
