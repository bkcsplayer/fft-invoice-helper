from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ContactBase(BaseModel):
    email: str
    name: Optional[str] = None


class ContactCreate(ContactBase):
    pass


class ContactResponse(ContactBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
