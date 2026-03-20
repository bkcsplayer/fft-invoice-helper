from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# Invoice Item schemas
class InvoiceItemBase(BaseModel):
    sort_order: int = 0
    quantity: Decimal = Decimal("1")
    description: str
    unit_price: Decimal = Decimal("0")
    amount: Decimal = Decimal("0")
    is_coupon: bool = False


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    id: int
    invoice_id: int

    class Config:
        from_attributes = True


# Invoice schemas
class InvoiceBase(BaseModel):
    company_id: Optional[int] = None
    service_type_id: Optional[int] = None
    bill_to_name: str
    bill_to_address: Optional[str] = None
    bill_to_phone: Optional[str] = None
    bill_to_email: Optional[str] = None
    invoice_date: date
    due_date: date
    po_number: Optional[str] = None
    code_number: Optional[str] = None
    item_type: str = "standard"
    gst_enabled: bool = True
    gst_rate: Decimal = Decimal("5.00")
    hst_enabled: bool = False
    hst_rate: Decimal = Decimal("0")
    payment_method: str = "Direct Bank"
    payment_company_name: Optional[str] = None
    payment_company_address: Optional[str] = None
    payee: Optional[str] = None
    signature_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    bank_name: Optional[str] = None
    bank_address: Optional[str] = None
    transit_number: Optional[str] = None
    institution_number: Optional[str] = None
    account_number: Optional[str] = None
    terms_conditions: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    company_id: Optional[int] = None
    service_type_id: Optional[int] = None
    bill_to_name: Optional[str] = None
    bill_to_address: Optional[str] = None
    bill_to_phone: Optional[str] = None
    bill_to_email: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    po_number: Optional[str] = None
    code_number: Optional[str] = None
    item_type: Optional[str] = None
    gst_enabled: Optional[bool] = None
    gst_rate: Optional[Decimal] = None
    hst_enabled: Optional[bool] = None
    hst_rate: Optional[Decimal] = None
    payment_method: Optional[str] = None
    payment_company_name: Optional[str] = None
    payment_company_address: Optional[str] = None
    payee: Optional[str] = None
    signature_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    bank_name: Optional[str] = None
    bank_address: Optional[str] = None
    transit_number: Optional[str] = None
    institution_number: Optional[str] = None
    account_number: Optional[str] = None
    terms_conditions: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None


class InvoiceResponse(InvoiceBase):
    id: int
    invoice_number: str
    subtotal: Decimal
    gst_amount: Decimal
    hst_amount: Decimal
    total: Decimal
    status: str
    sent_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    pdf_path: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: List[InvoiceItemResponse] = []
    company: Optional[dict] = None
    service_type: Optional[dict] = None

    class Config:
        from_attributes = True


class InvoiceStatusUpdate(BaseModel):
    status: str


class InvoiceListResponse(BaseModel):
    items: List[InvoiceResponse]
    total: int
    page: int
    page_size: int
