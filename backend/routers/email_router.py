from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
import smtplib, imaplib, email as email_lib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import datetime, uuid, re
from typing import Optional, Tuple

router = APIRouter(prefix="/api", tags=["email"])

# ─── Token Personalization ─────────────────────────────────────────────────────

PERSONAL_TOKENS = {
    "{{first_name}}": lambda l: l.first_name or "there",
    "{{last_name}}": lambda l: l.last_name or "",
    "{{full_name}}": lambda l: f"{l.first_name or ''} {l.last_name or ''}".strip() or "there",
    "{{company}}": lambda l: l.company or "your company",
    "{{job_title}}": lambda l: l.job_title or "",
    "{{email}}": lambda l: l.email,
    "{{industry}}": lambda l: l.industry or "",
    "{{country}}": lambda l: l.country or "",
}


def personalize(text: str, lead: models.Lead) -> str:
    for token, fn in PERSONAL_TOKENS.items():
        text = text.replace(token, fn(lead))
    return text


# ─── Send via SMTP ─────────────────────────────────────────────────────────────

async def send_campaign_email(
    lead: models.Lead,
    step: models.CampaignStep,
    campaign: models.Campaign,
    settings: models.Settings,
    db: Session,
) -> Tuple[bool, Optional[str]]:
    """Send a single email. Returns (success, error_message)."""
    template = step.template
    if not template:
        return False, "No template attached to step"

    tracking_id = str(uuid.uuid4())
    base_url = settings.tracking_base_url or "http://localhost:8000"

    subject = personalize(step.subject_override or template.subject, lead)
    body_html = personalize(template.body_html, lead)

    # Inject open tracking pixel
    if campaign.tracking_enabled:
        pixel = f'<img src="{base_url}/api/track/open/{tracking_id}" width="1" height="1" style="display:none" />'
        body_html += pixel

    # Inject unsubscribe link
    if settings.unsubscribe_enabled:
        unsub_link = f'{base_url}/api/track/unsubscribe/{tracking_id}'
        unsub_html = f'<br/><br/><p style="font-size:11px;color:#999;">Don\'t want to receive these emails? <a href="{unsub_link}">Unsubscribe</a></p>'
        body_html += unsub_html

    from_email = settings.from_email or settings.smtp_user
    from_name = campaign.from_name or settings.from_name or from_email

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = lead.email
        if campaign.reply_to:
            msg["Reply-To"] = campaign.reply_to

        msg.attach(MIMEText(template.body_text or "", "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.sendmail(from_email, [lead.email], msg.as_string())

        # Log
        log = models.EmailLog(
            lead_id=lead.id,
            campaign_id=campaign.id,
            campaign_step_id=step.id,
            tracking_id=tracking_id,
            status="sent",
        )
        db.add(log)
        db.commit()
        return True, None

    except Exception as e:
        log = models.EmailLog(
            lead_id=lead.id,
            campaign_id=campaign.id,
            campaign_step_id=step.id,
            tracking_id=tracking_id,
            status="failed",
            error_message=str(e),
        )
        db.add(log)
        db.commit()
        return False, str(e)


# ─── Test SMTP Connection ──────────────────────────────────────────────────────

@router.post("/email/test")
def test_smtp(db: Session = Depends(get_db)):
    settings = db.query(models.Settings).first()
    if not settings or not settings.smtp_user:
        raise HTTPException(status_code=400, detail="SMTP settings not configured")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(settings.smtp_user, settings.smtp_password)
        return {"ok": True, "message": "SMTP connection successful!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP error: {str(e)}")


@router.post("/email/send-test")
def send_test_email(to_email: str, db: Session = Depends(get_db)):
    settings = db.query(models.Settings).first()
    if not settings or not settings.smtp_user:
        raise HTTPException(status_code=400, detail="SMTP settings not configured")
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "🚀 OutreachPro Test Email"
        msg["From"] = f"{settings.from_name or 'OutreachPro'} <{settings.from_email or settings.smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText("This is a test email from OutreachPro!", "plain"))
        msg.attach(MIMEText("<h2>🚀 OutreachPro Test Email</h2><p>Your email sending is working correctly!</p>", "html"))
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.sendmail(settings.smtp_user, [to_email], msg.as_string())
        return {"ok": True, "message": f"Test email sent to {to_email}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Send error: {str(e)}")


# ─── Tracking Endpoints ────────────────────────────────────────────────────────

@router.get("/track/open/{tracking_id}")
def track_open(tracking_id: str, db: Session = Depends(get_db)):
    log = db.query(models.EmailLog).filter(models.EmailLog.tracking_id == tracking_id).first()
    if log:
        if not log.opened_at:
            log.opened_at = datetime.datetime.utcnow()
            log.status = "opened"
            # Update campaign total
            campaign = db.query(models.Campaign).filter(models.Campaign.id == log.campaign_id).first()
            if campaign:
                campaign.total_opened += 1
            # Update lead score and status
            lead = db.query(models.Lead).filter(models.Lead.id == log.lead_id).first()
            if lead:
                lead.last_opened = datetime.datetime.utcnow()
                lead.lead_score = min(lead.lead_score + 10, 100)
                if lead.status == "cold":
                    lead.status = "warm"
        log.open_count += 1
        db.commit()

    # Return 1x1 transparent GIF
    pixel = b"GIF89a\x01\x00\x01\x00\x00\xff\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x00;"
    return Response(content=pixel, media_type="image/gif")


@router.get("/track/click/{tracking_id}")
def track_click(tracking_id: str, url: str = "", db: Session = Depends(get_db)):
    log = db.query(models.EmailLog).filter(models.EmailLog.tracking_id == tracking_id).first()
    if log:
        if not log.clicked_at:
            log.clicked_at = datetime.datetime.utcnow()
            log.status = "clicked"
            campaign = db.query(models.Campaign).filter(models.Campaign.id == log.campaign_id).first()
            if campaign:
                campaign.total_clicked += 1
            lead = db.query(models.Lead).filter(models.Lead.id == log.lead_id).first()
            if lead:
                lead.lead_score = min(lead.lead_score + 20, 100)
                if lead.status in ["cold", "warm"]:
                    lead.status = "warm"
        log.click_count += 1
        db.commit()

    return RedirectResponse(url=url or "/")


@router.get("/track/unsubscribe/{tracking_id}")
def track_unsubscribe(tracking_id: str, db: Session = Depends(get_db)):
    log = db.query(models.EmailLog).filter(models.EmailLog.tracking_id == tracking_id).first()
    if log:
        lead = db.query(models.Lead).filter(models.Lead.id == log.lead_id).first()
        if lead:
            lead.is_unsubscribed = True
            lead.status = "unsubscribed"
            db.commit()
    return Response(
        content="<html><body><h2>You have been unsubscribed successfully.</h2></body></html>",
        media_type="text/html"
    )
