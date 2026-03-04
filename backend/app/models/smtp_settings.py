from sqlalchemy import Column, Integer, String, Boolean, DateTime, CheckConstraint, func
from app.database import Base


class SmtpSettings(Base):
    __tablename__ = "smtp_settings"

    id = Column(Integer, primary_key=True, default=1)
    smtp_host = Column(String(200))
    smtp_port = Column(Integer, default=587)
    smtp_username = Column(String(200))
    smtp_password = Column(String(200))  # Encrypted
    smtp_use_tls = Column(Boolean, default=True)
    from_email = Column(String(200))
    from_name = Column(String(200))
    is_configured = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("id = 1", name="singleton_check"),
    )
