from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return await dashboard_service.get_stats(db)


@router.get("/monthly")
async def get_monthly(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return await dashboard_service.get_monthly_stats(db)


@router.get("/by-status")
async def get_by_status(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return await dashboard_service.get_by_status(db)


@router.get("/by-company")
async def get_by_company(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return await dashboard_service.get_by_company(db)


@router.get("/recent")
async def get_recent(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return await dashboard_service.get_recent_invoices(db)
