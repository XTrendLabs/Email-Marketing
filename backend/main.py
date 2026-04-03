from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from routers import leads, campaigns, templates, email_router, settings as settings_router, analytics

from config import settings
import os

app = FastAPI(
    title="OutreachPro API",
    description="Cold Email Outreach Platform API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    create_tables()


app.include_router(leads.router)
app.include_router(campaigns.router)
app.include_router(templates.router)
app.include_router(email_router.router)
app.include_router(settings_router.router)
app.include_router(analytics.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "OutreachPro API"}


if __name__ == "__main__":
    import uvicorn
    # Use PORT from environment variable, provided by Render
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
