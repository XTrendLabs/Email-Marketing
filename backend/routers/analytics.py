from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
import datetime

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    total_leads = db.query(models.Lead).count()
    cold_leads = db.query(models.Lead).filter(models.Lead.status == "cold").count()
    warm_leads = db.query(models.Lead).filter(models.Lead.status == "warm").count()
    hot_leads = db.query(models.Lead).filter(models.Lead.status == "hot").count()
    converted_leads = db.query(models.Lead).filter(models.Lead.status == "converted").count()
    unsubscribed = db.query(models.Lead).filter(models.Lead.is_unsubscribed == True).count()

    total_campaigns = db.query(models.Campaign).count()
    active_campaigns = db.query(models.Campaign).filter(models.Campaign.status == "active").count()

    # Email stats
    total_sent = db.query(func.sum(models.Campaign.total_sent)).scalar() or 0
    total_opened = db.query(func.sum(models.Campaign.total_opened)).scalar() or 0
    total_clicked = db.query(func.sum(models.Campaign.total_clicked)).scalar() or 0
    total_replied = db.query(func.sum(models.Campaign.total_replied)).scalar() or 0
    total_bounced = db.query(func.sum(models.Campaign.total_bounced)).scalar() or 0

    open_rate = round((total_opened / total_sent * 100) if total_sent > 0 else 0, 1)
    click_rate = round((total_clicked / total_sent * 100) if total_sent > 0 else 0, 1)
    reply_rate = round((total_replied / total_sent * 100) if total_sent > 0 else 0, 1)
    bounce_rate = round((total_bounced / total_sent * 100) if total_sent > 0 else 0, 1)

    return {
        "total_leads": total_leads,
        "cold_leads": cold_leads,
        "warm_leads": warm_leads,
        "hot_leads": hot_leads,
        "converted_leads": converted_leads,
        "unsubscribed": unsubscribed,
        "total_campaigns": total_campaigns,
        "active_campaigns": active_campaigns,
        "total_sent": total_sent,
        "total_opened": total_opened,
        "total_clicked": total_clicked,
        "total_replied": total_replied,
        "total_bounced": total_bounced,
        "open_rate": open_rate,
        "click_rate": click_rate,
        "reply_rate": reply_rate,
        "bounce_rate": bounce_rate,
    }


@router.get("/campaigns")
def get_campaigns_analytics(db: Session = Depends(get_db)):
    campaigns = db.query(models.Campaign).order_by(models.Campaign.created_at.desc()).limit(20).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "status": c.status,
            "sent": c.total_sent,
            "opened": c.total_opened,
            "clicked": c.total_clicked,
            "replied": c.total_replied,
            "bounced": c.total_bounced,
            "open_rate": round((c.total_opened / c.total_sent * 100) if c.total_sent > 0 else 0, 1),
        }
        for c in campaigns
    ]


@router.get("/leads/timeline")
def leads_over_time(db: Session = Depends(get_db)):
    """Return daily lead import counts for last 30 days."""
    since = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    leads = db.query(models.Lead).filter(models.Lead.imported_at >= since).all()

    daily = {}
    for lead in leads:
        day = lead.imported_at.strftime("%Y-%m-%d")
        daily[day] = daily.get(day, 0) + 1

    return [{"date": k, "count": v} for k, v in sorted(daily.items())]


@router.get("/leads/status-breakdown")
def status_breakdown(db: Session = Depends(get_db)):
    statuses = ["cold", "warm", "hot", "converted", "unsubscribed", "bounced"]
    return [
        {"status": s, "count": db.query(models.Lead).filter(models.Lead.status == s).count()}
        for s in statuses
    ]


@router.get("/segments")
def list_segments(db: Session = Depends(get_db)):
    segments = db.query(models.Segment).all()
    return segments


@router.post("/segments")
def create_segment(segment: dict, db: Session = Depends(get_db)):
    from schemas import SegmentCreate
    seg = models.Segment(**segment)
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


@router.delete("/segments/{segment_id}")
def delete_segment(segment_id: int, db: Session = Depends(get_db)):
    seg = db.query(models.Segment).filter(models.Segment.id == segment_id).first()
    if seg:
        db.delete(seg)
        db.commit()
    return {"ok": True}
