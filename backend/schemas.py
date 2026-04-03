from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any, Dict
import datetime


# ─── Lead Schemas ─────────────────────────────────────────────────────────────

class LeadBase(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    custom_fields: Optional[Dict[str, Any]] = {}
    status: Optional[str] = "cold"
    source: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    source: Optional[str] = None


class LeadOut(LeadBase):
    id: int
    lead_score: int
    imported_at: datetime.datetime
    last_contacted: Optional[datetime.datetime] = None
    last_opened: Optional[datetime.datetime] = None
    is_unsubscribed: bool
    is_bounced: bool

    class Config:
        from_attributes = True


class LeadImportMapping(BaseModel):
    """Maps CSV column name → Lead field name"""
    mappings: Dict[str, str]  # {"CSV Column": "lead_field"}
    source_name: Optional[str] = "CSV Import"
    skip_duplicates: bool = True


class BulkAction(BaseModel):
    lead_ids: List[int]
    action: str  # "delete", "tag", "untag", "set_status", "add_to_campaign"
    value: Optional[str] = None  # the tag or status value


# ─── Template Schemas ─────────────────────────────────────────────────────────

class TemplateBase(BaseModel):
    name: str
    subject: str
    body_html: str
    body_text: Optional[str] = None


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None


class TemplateOut(TemplateBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# ─── Campaign Step Schemas ─────────────────────────────────────────────────────

class CampaignStepCreate(BaseModel):
    template_id: int
    step_number: int = 1
    delay_days: int = 0
    subject_override: Optional[str] = None
    ab_variant: Optional[str] = None


class CampaignStepOut(CampaignStepCreate):
    id: int
    campaign_id: int

    class Config:
        from_attributes = True


# ─── Campaign Schemas ──────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str
    segment_filters: Optional[Dict[str, Any]] = {}
    from_name: Optional[str] = None
    reply_to: Optional[str] = None
    tracking_enabled: bool = True
    steps: List[CampaignStepCreate] = []


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    segment_filters: Optional[Dict[str, Any]] = None
    from_name: Optional[str] = None
    reply_to: Optional[str] = None
    tracking_enabled: Optional[bool] = None
    status: Optional[str] = None
    steps: Optional[List[CampaignStepCreate]] = None


class CampaignOut(BaseModel):
    id: int
    name: str
    status: str
    segment_filters: Dict[str, Any]
    from_name: Optional[str]
    reply_to: Optional[str]
    tracking_enabled: bool
    created_at: datetime.datetime
    started_at: Optional[datetime.datetime]
    completed_at: Optional[datetime.datetime]
    total_sent: int
    total_opened: int
    total_clicked: int
    total_replied: int
    total_bounced: int
    steps: List[CampaignStepOut] = []

    class Config:
        from_attributes = True


# ─── Settings Schemas ─────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    imap_host: Optional[str] = None
    imap_port: Optional[int] = None
    daily_send_limit: Optional[int] = None
    send_delay_seconds: Optional[int] = None
    unsubscribe_enabled: Optional[bool] = None
    tracking_base_url: Optional[str] = None


class SettingsOut(BaseModel):
    id: int
    smtp_host: str
    smtp_port: int
    smtp_user: Optional[str]
    from_name: Optional[str]
    from_email: Optional[str]
    imap_host: str
    imap_port: int
    daily_send_limit: int
    send_delay_seconds: int
    unsubscribe_enabled: bool
    tracking_base_url: str

    class Config:
        from_attributes = True


# ─── Segment Schemas ──────────────────────────────────────────────────────────

class SegmentCreate(BaseModel):
    name: str
    filters: Dict[str, Any] = {}


class SegmentOut(SegmentCreate):
    id: int
    created_at: datetime.datetime
    lead_count: int

    class Config:
        from_attributes = True


# ─── Analytics ────────────────────────────────────────────────────────────────

class OverviewStats(BaseModel):
    total_leads: int
    cold_leads: int
    warm_leads: int
    hot_leads: int
    converted_leads: int
    total_campaigns: int
    total_emails_sent: int
    avg_open_rate: float
    avg_click_rate: float
    avg_reply_rate: float
