from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from database import get_db
import models, schemas
import csv, io, json, chardet, datetime

router = APIRouter(prefix="/api/leads", tags=["leads"])


def apply_filters(query, filters: dict, db: Session):
    """Apply dynamic filter rules to lead query."""
    if not filters:
        return query

    status = filters.get("status")
    if status:
        if isinstance(status, list):
            query = query.filter(models.Lead.status.in_(status))
        else:
            query = query.filter(models.Lead.status == status)

    search = filters.get("search")
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                models.Lead.email.ilike(s),
                models.Lead.first_name.ilike(s),
                models.Lead.last_name.ilike(s),
                models.Lead.company.ilike(s),
            )
        )

    company = filters.get("company")
    if company:
        query = query.filter(models.Lead.company.ilike(f"%{company}%"))

    job_title = filters.get("job_title")
    if job_title:
        query = query.filter(models.Lead.job_title.ilike(f"%{job_title}%"))

    country = filters.get("country")
    if country:
        if isinstance(country, list):
            query = query.filter(models.Lead.country.in_(country))
        else:
            query = query.filter(models.Lead.country.ilike(f"%{country}%"))

    industry = filters.get("industry")
    if industry:
        if isinstance(industry, list):
            query = query.filter(models.Lead.industry.in_(industry))
        else:
            query = query.filter(models.Lead.industry.ilike(f"%{industry}%"))

    tags = filters.get("tags")
    if tags:
        if isinstance(tags, list):
            for tag in tags:
                query = query.filter(models.Lead.tags.contains([tag]))
        else:
            query = query.filter(models.Lead.tags.contains([tags]))

    source = filters.get("source")
    if source:
        query = query.filter(models.Lead.source.ilike(f"%{source}%"))

    min_score = filters.get("min_score")
    if min_score is not None:
        query = query.filter(models.Lead.lead_score >= int(min_score))

    not_contacted_days = filters.get("not_contacted_days")
    if not_contacted_days:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=int(not_contacted_days))
        query = query.filter(
            or_(models.Lead.last_contacted == None, models.Lead.last_contacted < cutoff)
        )

    exclude_unsubscribed = filters.get("exclude_unsubscribed", True)
    if exclude_unsubscribed:
        query = query.filter(models.Lead.is_unsubscribed == False)

    exclude_bounced = filters.get("exclude_bounced", True)
    if exclude_bounced:
        query = query.filter(models.Lead.is_bounced == False)

    return query


@router.get("", response_model=dict)
def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    status: Optional[str] = None,
    search: Optional[str] = None,
    company: Optional[str] = None,
    job_title: Optional[str] = None,
    country: Optional[str] = None,
    industry: Optional[str] = None,
    tags: Optional[str] = None,
    source: Optional[str] = None,
    min_score: Optional[int] = None,
    not_contacted_days: Optional[int] = None,
    exclude_unsubscribed: bool = True,
    exclude_bounced: bool = True,
    sort_by: str = "imported_at",
    sort_dir: str = "desc",
    db: Session = Depends(get_db),
):
    filters = {
        "status": status,
        "search": search,
        "company": company,
        "job_title": job_title,
        "country": country,
        "industry": industry,
        "tags": tags.split(",") if tags else None,
        "source": source,
        "min_score": min_score,
        "not_contacted_days": not_contacted_days,
        "exclude_unsubscribed": exclude_unsubscribed,
        "exclude_bounced": exclude_bounced,
    }
    # Remove None values
    filters = {k: v for k, v in filters.items() if v is not None}

    query = db.query(models.Lead)
    query = apply_filters(query, filters, db)

    total = query.count()

    # Sorting
    sort_col = getattr(models.Lead, sort_by, models.Lead.imported_at)
    if sort_dir == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    leads = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "leads": [schemas.LeadOut.model_validate(l) for l in leads],
    }


@router.post("/import", response_model=dict)
async def import_leads(
    file: UploadFile = File(...),
    mapping: str = Form(...),  # JSON string of LeadImportMapping
    db: Session = Depends(get_db),
):
    """Import leads from a CSV file with field mapping."""
    raw = await file.read()

    # Detect encoding
    detected = chardet.detect(raw)
    encoding = detected.get("encoding", "utf-8") or "utf-8"
    content = raw.decode(encoding, errors="replace")

    try:
        mapping_data = schemas.LeadImportMapping(**json.loads(mapping))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid mapping: {e}")

    VALID_FIELDS = {
        "email", "first_name", "last_name", "company", "job_title",
        "phone", "linkedin", "website", "country", "industry", "city", "notes", "tags", "source"
    }

    reader = csv.DictReader(io.StringIO(content))
    created = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader):
        lead_data = {}
        custom_fields = {}

        for csv_col, lead_field in mapping_data.mappings.items():
            value = row.get(csv_col, "").strip()
            if not value:
                continue
            if lead_field in VALID_FIELDS:
                lead_data[lead_field] = value
            else:
                # Any unmapped field goes to custom_fields
                custom_fields[lead_field] = value

        email = lead_data.get("email")
        if not email:
            errors.append(f"Row {i+2}: Missing email, skipped.")
            skipped += 1
            continue

        # Handle tags
        tags_raw = lead_data.pop("tags", "")
        tags = [t.strip() for t in tags_raw.split(",") if t.strip()] if tags_raw else []

        if mapping_data.skip_duplicates:
            existing = db.query(models.Lead).filter(models.Lead.email == email).first()
            if existing:
                skipped += 1
                continue

        lead = models.Lead(
            **lead_data,
            tags=tags,
            custom_fields=custom_fields,
            source=mapping_data.source_name,
        )
        db.add(lead)
        created += 1

    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors}


@router.get("/meta/sources", response_model=List[str])
def get_sources(db: Session = Depends(get_db)):
    rows = db.query(models.Lead.source).distinct().filter(models.Lead.source != None).all()
    return [r[0] for r in rows]


@router.get("/meta/tags", response_model=List[str])
def get_all_tags(db: Session = Depends(get_db)):
    leads = db.query(models.Lead.tags).filter(models.Lead.tags != None).all()
    tag_set = set()
    for (tags,) in leads:
        if tags:
            tag_set.update(tags)
    return sorted(tag_set)


@router.get("/meta/countries", response_model=List[str])
def get_countries(db: Session = Depends(get_db)):
    rows = db.query(models.Lead.country).distinct().filter(models.Lead.country != None).all()
    return sorted([r[0] for r in rows])


@router.get("/meta/industries", response_model=List[str])
def get_industries(db: Session = Depends(get_db)):
    rows = db.query(models.Lead.industry).distinct().filter(models.Lead.industry != None).all()
    return sorted([r[0] for r in rows])


@router.get("/{lead_id}", response_model=schemas.LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.put("/{lead_id}", response_model=schemas.LeadOut)
def update_lead(lead_id: int, update: schemas.LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"ok": True}


@router.post("/bulk")
def bulk_action(action: schemas.BulkAction, db: Session = Depends(get_db)):
    leads = db.query(models.Lead).filter(models.Lead.id.in_(action.lead_ids)).all()

    if action.action == "delete":
        for lead in leads:
            db.delete(lead)

    elif action.action == "set_status":
        for lead in leads:
            lead.status = action.value

    elif action.action == "tag":
        for lead in leads:
            tags = lead.tags or []
            if action.value and action.value not in tags:
                lead.tags = tags + [action.value]

    elif action.action == "untag":
        for lead in leads:
            tags = lead.tags or []
            lead.tags = [t for t in tags if t != action.value]

    db.commit()
    return {"affected": len(leads)}


@router.get("/count/by-filter")
def count_by_filter(
    filters: str = Query("{}"),
    db: Session = Depends(get_db),
):
    """Return the count of leads matching a filter JSON (used by campaign builder)."""
    try:
        filter_dict = json.loads(filters)
    except Exception:
        filter_dict = {}
    query = db.query(models.Lead)
    query = apply_filters(query, filter_dict, db)
    return {"count": query.count()}
