from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SmtpSettingsBase(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_use_tls: bool = True
    from_email: Optional[str] = None
    from_name: Optional[str] = None


class SmtpSettingsUpdate(SmtpSettingsBase):
    smtp_password: Optional[str] = None


class SmtpSettingsResponse(SmtpSettingsBase):
    is_configured: bool = False
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ServiceTypeBase(BaseModel):
    code: str
    name: str


class ServiceTypeCreate(ServiceTypeBase):
    pass


class ServiceTypeResponse(ServiceTypeBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
