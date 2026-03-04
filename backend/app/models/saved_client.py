"""SavedClient model — pre-saved client info for quick invoice creation."""
from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base


class SavedClient(Base):
    __tablename__ = "saved_clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
