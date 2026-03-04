from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime,
    Numeric, Text, ForeignKey, func
)
from sqlalchemy.orm import relationship
from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), unique=True, nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    service_type_id = Column(Integer, ForeignKey("service_types.id"))

    # Client info
    bill_to_name = Column(String(200), nullable=False)
    bill_to_address = Column(String(500))
    bill_to_phone = Column(String(50))
    bill_to_email = Column(String(200))

    # Invoice details
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    po_number = Column(String(100))
    code_number = Column(String(20))

    # Item type
    item_type = Column(String(20), default="standard")

    # Amounts
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    gst_enabled = Column(Boolean, default=True)
    gst_rate = Column(Numeric(5, 2), default=5.00)
    gst_amount = Column(Numeric(12, 2), default=0)
    hst_enabled = Column(Boolean, default=False)
    hst_rate = Column(Numeric(5, 2), default=0)
    hst_amount = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)

    # Payment info
    payment_method = Column(String(100), default="Direct Bank")
    payment_company_name = Column(String(200))
    payment_company_address = Column(String(500))
    payee = Column(String(200))
    signature_name = Column(String(200))
    contact_phone = Column(String(50))
    contact_email = Column(String(200))
    website = Column(String(200))

    # Bank info
    bank_name = Column(String(200))
    bank_address = Column(String(500))
    transit_number = Column(String(20))
    institution_number = Column(String(20))
    account_number = Column(String(50))

    # Terms
    terms_conditions = Column(Text)

    # Status
    status = Column(String(20), default="draft", index=True)
    sent_at = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))

    # PDF
    pdf_path = Column(String(500))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan", order_by="InvoiceItem.sort_order")
    company = relationship("Company", lazy="selectin")
    service_type = relationship("ServiceType", lazy="selectin")
