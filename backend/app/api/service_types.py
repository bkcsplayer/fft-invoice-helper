from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models.service_type import ServiceType
from app.schemas.settings import ServiceTypeCreate, ServiceTypeResponse

router = APIRouter(prefix="/api/service-types", tags=["service-types"])


@router.get("", response_model=List[ServiceTypeResponse])
async def list_service_types(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(ServiceType).order_by(ServiceType.id))
    return result.scalars().all()


@router.post("", response_model=ServiceTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_service_type(
    data: ServiceTypeCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    service_type = ServiceType(**data.model_dump())
    db.add(service_type)
    await db.flush()
    await db.refresh(service_type)
    return service_type


@router.delete("/{service_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_type(
    service_type_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(ServiceType).where(ServiceType.id == service_type_id))
    st = result.scalar_one_or_none()
    if not st:
        raise HTTPException(status_code=404, detail="Service type not found")
    await db.delete(st)
