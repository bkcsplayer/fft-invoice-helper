from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.auth import get_current_user
from app.models.smtp_settings import SmtpSettings
from app.schemas.settings import SmtpSettingsUpdate, SmtpSettingsResponse
from app.services.email_service import test_smtp_connection

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/smtp", response_model=SmtpSettingsResponse)
async def get_smtp_settings(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(SmtpSettings).where(SmtpSettings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings:
        return SmtpSettingsResponse()
    return settings


@router.put("/smtp", response_model=SmtpSettingsResponse)
async def update_smtp_settings(
    data: SmtpSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(SmtpSettings).where(SmtpSettings.id == 1))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = SmtpSettings(id=1)
        db.add(settings)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
    
    # Mark as configured if host and username are set
    if settings.smtp_host and settings.smtp_username:
        settings.is_configured = True
    
    await db.flush()
    await db.refresh(settings)
    return settings


@router.post("/smtp/test")
async def test_smtp(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(SmtpSettings).where(SmtpSettings.id == 1))
    settings = result.scalar_one_or_none()
    
    if not settings or not settings.is_configured:
        raise HTTPException(status_code=400, detail="SMTP not configured")
    
    success, message = await test_smtp_connection(settings)
    if success:
        return {"status": "ok", "message": message}
    else:
        raise HTTPException(status_code=400, detail=message)
