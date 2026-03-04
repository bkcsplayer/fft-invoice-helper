from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.seed import seed_data

from app.api.auth import router as auth_router
from app.api.invoices import router as invoices_router
from app.api.companies import router as companies_router
from app.api.service_types import router as service_types_router
from app.api.contacts import router as contacts_router
from app.api.settings import router as settings_router
from app.api.dashboard import router as dashboard_router
from app.api.saved_clients import router as saved_clients_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and seed data
    await init_db()
    await seed_data()
    yield
    # Shutdown


app = FastAPI(
    title="Invoice Generator API",
    description="Full-stack invoice generation, management, and PDF export",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(invoices_router)
app.include_router(companies_router)
app.include_router(service_types_router)
app.include_router(contacts_router)
app.include_router(settings_router)
app.include_router(dashboard_router)
app.include_router(saved_clients_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Invoice Generator API is running"}
