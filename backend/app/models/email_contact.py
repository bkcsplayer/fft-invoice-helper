from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base


class EmailContact(Base):
    __tablename__ = "email_contacts"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, nullable=False)
    name = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
