from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    company = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    website = Column(String, nullable=True)
    country = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    city = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(JSON, default=list)  # ["tag1", "tag2"]
    custom_fields = Column(JSON, default=dict)  # {"field": "value"}
    status = Column(String, default="cold")  # cold, warm, hot, converted, unsubscribed, bounced
    lead_score = Column(Integer, default=0)
    source = Column(String, nullable=True)  # e.g. "Google Sheets - Sheet 1"
    imported_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_contacted = Column(DateTime, nullable=True)
    last_opened = Column(DateTime, nullable=True)
    last_clicked = Column(DateTime, nullable=True)
    is_unsubscribed = Column(Boolean, default=False)
    is_bounced = Column(Boolean, default=False)

    email_logs = relationship("EmailLog", back_populates="lead", cascade="all, delete-orphan")


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    campaign_steps = relationship("CampaignStep", back_populates="template")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="draft")  # draft, active, paused, completed
    segment_filters = Column(JSON, default=dict)  # filter config
    from_name = Column(String, nullable=True)
    reply_to = Column(String, nullable=True)
    tracking_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    total_sent = Column(Integer, default=0)
    total_opened = Column(Integer, default=0)
    total_clicked = Column(Integer, default=0)
    total_replied = Column(Integer, default=0)
    total_bounced = Column(Integer, default=0)

    steps = relationship("CampaignStep", back_populates="campaign", cascade="all, delete-orphan", order_by="CampaignStep.step_number")
    email_logs = relationship("EmailLog", back_populates="campaign", cascade="all, delete-orphan")


class CampaignStep(Base):
    __tablename__ = "campaign_steps"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=True)
    step_number = Column(Integer, default=1)
    delay_days = Column(Integer, default=0)  # days after previous step
    subject_override = Column(String, nullable=True)  # optional subject override
    ab_variant = Column(String, nullable=True)  # "A" or "B"

    campaign = relationship("Campaign", back_populates="steps")
    template = relationship("Template", back_populates="campaign_steps")


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    campaign_step_id = Column(Integer, ForeignKey("campaign_steps.id"), nullable=True)
    tracking_id = Column(String, unique=True, index=True)  # UUID for tracking
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
    opened_at = Column(DateTime, nullable=True)
    clicked_at = Column(DateTime, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    bounced_at = Column(DateTime, nullable=True)
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    status = Column(String, default="sent")  # sent, opened, clicked, replied, bounced, failed
    error_message = Column(Text, nullable=True)

    lead = relationship("Lead", back_populates="email_logs")
    campaign = relationship("Campaign", back_populates="email_logs")


class Segment(Base):
    __tablename__ = "segments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    filters = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    lead_count = Column(Integer, default=0)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    smtp_host = Column(String, default="smtp.office365.com")
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String, nullable=True)
    smtp_password = Column(String, nullable=True)  # stored as-is (local app)
    from_name = Column(String, nullable=True)
    from_email = Column(String, nullable=True)
    imap_host = Column(String, default="outlook.office365.com")
    imap_port = Column(Integer, default=993)
    daily_send_limit = Column(Integer, default=200)
    send_delay_seconds = Column(Integer, default=3)
    unsubscribe_enabled = Column(Boolean, default=True)
    tracking_base_url = Column(String, default="http://localhost:8000")
