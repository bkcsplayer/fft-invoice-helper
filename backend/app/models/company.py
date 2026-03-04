from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    full_name = Column(String(500))
    address = Column(String(500))
    phone = Column(String(50))
    email = Column(String(200))
    website = Column(String(200))
    gst_number = Column(String(100))
    logo_url = Column(String(1000))
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
