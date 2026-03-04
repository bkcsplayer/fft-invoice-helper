"""Saved client API routes — CRUD for client presets."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.auth import get_current_user
from app.models.saved_client import SavedClient

router = APIRouter(prefix="/api/saved-clients", tags=["saved-clients"])


class SavedClientCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class SavedClientResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("", response_model=list[SavedClientResponse])
async def list_saved_clients(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(SavedClient).order_by(SavedClient.name))
    return result.scalars().all()


@router.post("", response_model=SavedClientResponse, status_code=status.HTTP_201_CREATED)
async def create_saved_client(
    data: SavedClientCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    client = SavedClient(**data.model_dump())
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


@router.put("/{client_id}", response_model=SavedClientResponse)
async def update_saved_client(
    client_id: int,
    data: SavedClientCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(SavedClient).where(SavedClient.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for key, value in data.model_dump().items():
        setattr(client, key, value)
    await db.flush()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(SavedClient).where(SavedClient.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
