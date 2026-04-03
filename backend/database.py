from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from config import settings

# For SQLite, the URL is sqlite:///./outreach.db
# For PostgreSQL on Render, it starts with postgres:// or postgresql://
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# On Render, the PostgreSQL URL might start with 'postgres://' which SQLAlchemy needs as 'postgresql://'
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # Only use connect_args for SQLite
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from models import Lead, Campaign, EmailLog, Template, Settings, Segment, CampaignStep
    Base.metadata.create_all(bind=engine)
