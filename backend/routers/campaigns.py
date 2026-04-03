from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
from routers.leads import apply_filters
from routers.email_router import send_campaign_email
import datetime
import json

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


@router.get("", response_model=List[schemas.CampaignOut])
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(models.Campaign).order_by(models.Campaign.created_at.desc()).all()


@router.get("/preview/leads")
def preview_campaign_leads(
    filters: str = "{}",
    db: Session = Depends(get_db),
):
    """Preview which leads would be targeted by given filters."""
    try:
        filter_dict = json.loads(filters)
    except Exception:
        filter_dict = {}
    query = db.query(models.Lead)
    query = apply_filters(query, filter_dict, db)
    count = query.count()
    sample = query.limit(5).all()
    return {
        "count": count,
        "sample": [{"email": l.email, "name": f"{l.first_name or ''} {l.last_name or ''}".strip(), "company": l.company} for l in sample],
    }


@router.post("", response_model=schemas.CampaignOut)
def create_campaign(campaign: schemas.CampaignCreate, db: Session = Depends(get_db)):
    steps_data = campaign.steps
    camp_data = campaign.model_dump(exclude={"steps"})
    db_campaign = models.Campaign(**camp_data)
    db.add(db_campaign)
    db.flush()

    for step_data in steps_data:
        step = models.CampaignStep(campaign_id=db_campaign.id, **step_data.model_dump())
        db.add(step)

    db.commit()
    db.refresh(db_campaign)
    return db_campaign


@router.get("/{campaign_id}", response_model=schemas.CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.put("/{campaign_id}", response_model=schemas.CampaignOut)
def update_campaign(campaign_id: int, update: schemas.CampaignUpdate, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    update_data = update.model_dump(exclude_unset=True)
    new_steps = update_data.pop("steps", None)

    for field, value in update_data.items():
        setattr(campaign, field, value)

    if new_steps is not None:
        # Replace steps
        for old_step in campaign.steps:
            db.delete(old_step)
        db.flush()
        for step_data in new_steps:
            step = models.CampaignStep(campaign_id=campaign_id, **step_data)
            db.add(step)

    campaign.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"ok": True}


@router.post("/{campaign_id}/send")
def send_campaign(campaign_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Trigger sending campaign step 1 to all matching leads."""
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == "active":
        raise HTTPException(status_code=400, detail="Campaign is already active/sending")

    settings = db.query(models.Settings).first()
    if not settings or not settings.smtp_user:
        raise HTTPException(status_code=400, detail="SMTP not configured. Go to Settings first.")

    # Get step 1
    steps = sorted(campaign.steps, key=lambda s: s.step_number)
    if not steps:
        raise HTTPException(status_code=400, detail="No steps configured for this campaign")

    # Get matching leads
    query = db.query(models.Lead)
    query = apply_filters(query, campaign.segment_filters or {}, db)
    leads = query.all()

    if not leads:
        raise HTTPException(status_code=400, detail="No leads match the campaign filters")

    campaign.status = "active"
    campaign.started_at = datetime.datetime.utcnow()
    db.commit()

    # Send in background
    background_tasks.add_task(
        _send_campaign_background,
        campaign_id=campaign_id,
        step_id=steps[0].id,
        lead_ids=[l.id for l in leads],
    )

    return {"message": f"Sending to {len(leads)} leads in background", "lead_count": len(leads)}


async def _send_campaign_background(campaign_id: int, step_id: int, lead_ids: list):
    """Background task to send emails."""
    from database import SessionLocal
    import asyncio
    db = SessionLocal()
    try:
        campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
        step = db.query(models.CampaignStep).filter(models.CampaignStep.id == step_id).first()
        settings = db.query(models.Settings).first()

        if not campaign or not step or not settings:
            return

        sent_count = 0
        for lead_id in lead_ids:
            lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
            if not lead:
                continue

            success, error = await send_campaign_email(lead, step, campaign, settings, db)
            if success:
                sent_count += 1
                campaign.total_sent += 1
                lead.last_contacted = datetime.datetime.utcnow()
                db.commit()
            
            await asyncio.sleep(settings.send_delay_seconds or 3)

        campaign.status = "completed"
        campaign.completed_at = datetime.datetime.utcnow()
        db.commit()

    finally:
        db.close()


@router.get("/{campaign_id}/stats")
def get_campaign_stats(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    logs = db.query(models.EmailLog).filter(models.EmailLog.campaign_id == campaign_id).all()
    total = len(logs)

    open_rate = (campaign.total_opened / total * 100) if total > 0 else 0
    click_rate = (campaign.total_clicked / total * 100) if total > 0 else 0
    reply_rate = (campaign.total_replied / total * 100) if total > 0 else 0
    bounce_rate = (campaign.total_bounced / total * 100) if total > 0 else 0

    return {
        "campaign_id": campaign_id,
        "name": campaign.name,
        "status": campaign.status,
        "total_sent": campaign.total_sent,
        "total_opened": campaign.total_opened,
        "total_clicked": campaign.total_clicked,
        "total_replied": campaign.total_replied,
        "total_bounced": campaign.total_bounced,
        "open_rate": round(open_rate, 1),
        "click_rate": round(click_rate, 1),
        "reply_rate": round(reply_rate, 1),
        "bounce_rate": round(bounce_rate, 1),
    }


@router.post("/{campaign_id}/pause")
def pause_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = "paused"
    db.commit()
    return {"ok": True}


