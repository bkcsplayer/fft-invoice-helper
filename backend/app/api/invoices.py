from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, timezone
import io

from app.database import get_db
from app.auth import get_current_user
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.company import Company
from app.models.service_type import ServiceType
from app.models.smtp_settings import SmtpSettings
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse,
    InvoiceStatusUpdate, InvoiceListResponse,
)
from app.services.invoice_service import (
    generate_invoice_number, calculate_totals, calculate_due_date,
)
from app.services.pdf_service import generate_invoice_pdf, generate_invoice_html, save_pdf
from app.services.email_service import send_invoice_email

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


def invoice_to_response(inv: Invoice) -> dict:
    """Convert Invoice ORM object to response dict."""
    data = {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "company_id": inv.company_id,
        "service_type_id": inv.service_type_id,
        "bill_to_name": inv.bill_to_name,
        "bill_to_address": inv.bill_to_address,
        "bill_to_phone": inv.bill_to_phone,
        "bill_to_email": inv.bill_to_email,
        "invoice_date": inv.invoice_date,
        "due_date": inv.due_date,
        "po_number": inv.po_number,
        "code_number": inv.code_number,
        "item_type": inv.item_type,
        "subtotal": inv.subtotal,
        "gst_enabled": inv.gst_enabled,
        "gst_rate": inv.gst_rate,
        "gst_amount": inv.gst_amount,
        "hst_enabled": inv.hst_enabled,
        "hst_rate": inv.hst_rate,
        "hst_amount": inv.hst_amount,
        "total": inv.total,
        "payment_method": inv.payment_method,
        "payment_company_name": inv.payment_company_name,
        "payment_company_address": inv.payment_company_address,
        "payee": inv.payee,
        "signature_name": inv.signature_name,
        "contact_phone": inv.contact_phone,
        "contact_email": inv.contact_email,
        "website": inv.website,
        "bank_name": inv.bank_name,
        "bank_address": inv.bank_address,
        "transit_number": inv.transit_number,
        "institution_number": inv.institution_number,
        "account_number": inv.account_number,
        "terms_conditions": inv.terms_conditions,
        "status": inv.status,
        "sent_at": inv.sent_at,
        "paid_at": inv.paid_at,
        "pdf_path": inv.pdf_path,
        "created_at": inv.created_at,
        "updated_at": inv.updated_at,
        "items": [
            {
                "id": item.id,
                "invoice_id": item.invoice_id,
                "sort_order": item.sort_order,
                "quantity": item.quantity,
                "description": item.description,
                "unit_price": item.unit_price,
                "amount": item.amount,
            }
            for item in (inv.items or [])
        ],
        "company": {
            "id": inv.company.id,
            "code": inv.company.code,
            "name": inv.company.name,
            "full_name": inv.company.full_name,
            "address": inv.company.address,
            "phone": inv.company.phone,
            "email": inv.company.email,
            "website": inv.company.website,
            "gst_number": inv.company.gst_number,
            "logo_url": inv.company.logo_url,
        } if inv.company else None,
        "service_type": {
            "id": inv.service_type.id,
            "code": inv.service_type.code,
            "name": inv.service_type.name,
        } if inv.service_type else None,
    }
    return data


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    company_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    query = select(Invoice).options(
        selectinload(Invoice.items),
        selectinload(Invoice.company),
        selectinload(Invoice.service_type),
    )

    if status_filter:
        query = query.where(Invoice.status == status_filter)
    if company_id:
        query = query.where(Invoice.company_id == company_id)
    if search:
        query = query.where(
            or_(
                Invoice.invoice_number.ilike(f"%{search}%"),
                Invoice.bill_to_name.ilike(f"%{search}%"),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(Invoice.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    invoices = result.scalars().all()

    return {
        "items": [invoice_to_response(inv) for inv in invoices],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    # Get company and service type for invoice number
    company = None
    service_type = None
    
    if data.company_id:
        result = await db.execute(select(Company).where(Company.id == data.company_id))
        company = result.scalar_one_or_none()
    if data.service_type_id:
        result = await db.execute(select(ServiceType).where(ServiceType.id == data.service_type_id))
        service_type = result.scalar_one_or_none()

    # Generate invoice number
    company_code = company.code if company else "INV"
    service_code = service_type.code if service_type else ""
    code_number = data.code_number or "0001"
    invoice_number = generate_invoice_number(
        company_code, service_code, data.invoice_date, code_number
    )

    # Create items for calculation
    class ItemCalc:
        def __init__(self, qty, price):
            self.quantity = qty
            self.unit_price = price

    calc_items = [ItemCalc(item.quantity, item.unit_price) for item in data.items]
    subtotal, gst_amount, hst_amount, total = calculate_totals(
        calc_items, data.gst_enabled, data.gst_rate, data.hst_enabled, data.hst_rate
    )

    # Create invoice
    invoice_data = data.model_dump(exclude={"items"})
    invoice = Invoice(
        **invoice_data,
        invoice_number=invoice_number,
        subtotal=subtotal,
        gst_amount=gst_amount,
        hst_amount=hst_amount,
        total=total,
    )
    db.add(invoice)

    try:
        await db.flush()

        # Create items
        for idx, item_data in enumerate(data.items):
            item = InvoiceItem(
                invoice_id=invoice.id,
                sort_order=item_data.sort_order or idx,
                quantity=item_data.quantity,
                description=item_data.description,
                unit_price=item_data.unit_price,
                amount=Decimal(str(item_data.quantity)) * Decimal(str(item_data.unit_price)),
            )
            db.add(item)

        await db.flush()
    except Exception as e:
        await db.rollback()
        error_msg = str(e)
        if "UniqueViolationError" in error_msg or "UNIQUE constraint failed: invoices.invoice_number" in error_msg or "duplicate key value violates unique constraint" in error_msg:
            raise HTTPException(status_code=400, detail="Invoice number already exists for this date. Please change the Code Number to make it unique.")
        raise HTTPException(status_code=500, detail=f"Database error while saving invoice: {error_msg}")

    # Reload with relationships
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.company),
            selectinload(Invoice.service_type),
        )
        .where(Invoice.id == invoice.id)
    )
    invoice = result.scalar_one()
    return invoice_to_response(invoice)


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.company),
            selectinload(Invoice.service_type),
        )
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice_to_response(invoice)


@router.put("/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.items))
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = data.model_dump(exclude_unset=True, exclude={"items"})
    for key, value in update_data.items():
        setattr(invoice, key, value)

    # Update items if provided
    if data.items is not None:
        # Delete existing items
        for item in invoice.items:
            await db.delete(item)
        
        # Add new items
        for idx, item_data in enumerate(data.items):
            item = InvoiceItem(
                invoice_id=invoice.id,
                sort_order=item_data.sort_order or idx,
                quantity=item_data.quantity,
                description=item_data.description,
                unit_price=item_data.unit_price,
                amount=Decimal(str(item_data.quantity)) * Decimal(str(item_data.unit_price)),
            )
            db.add(item)

    # Recalculate totals
    class ItemCalc:
        def __init__(self, qty, price):
            self.quantity = qty
            self.unit_price = price

    items_for_calc = data.items or []
    if items_for_calc:
        calc_items = [ItemCalc(i.quantity, i.unit_price) for i in items_for_calc]
    else:
        calc_items = [ItemCalc(i.quantity, i.unit_price) for i in invoice.items]

    gst_enabled = data.gst_enabled if data.gst_enabled is not None else invoice.gst_enabled
    gst_rate = data.gst_rate if data.gst_rate is not None else invoice.gst_rate
    hst_enabled = data.hst_enabled if data.hst_enabled is not None else invoice.hst_enabled
    hst_rate = data.hst_rate if data.hst_rate is not None else invoice.hst_rate

    subtotal, gst_amount, hst_amount, total = calculate_totals(
        calc_items, gst_enabled, Decimal(str(gst_rate)), hst_enabled, Decimal(str(hst_rate))
    )
    invoice.subtotal = subtotal
    invoice.gst_amount = gst_amount
    invoice.hst_amount = hst_amount
    invoice.total = total

    try:
        await db.flush()
    except Exception as e:
        await db.rollback()
        error_msg = str(e)
        if "UniqueViolationError" in error_msg or "UNIQUE constraint failed: invoices.invoice_number" in error_msg or "duplicate key value violates unique constraint" in error_msg:
            raise HTTPException(status_code=400, detail="Invoice number already exists for this date. Please change the Code Number to make it unique.")
        raise HTTPException(status_code=500, detail=f"Database error while updating invoice: {error_msg}")

    # Reload
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.company),
            selectinload(Invoice.service_type),
        )
        .where(Invoice.id == invoice.id)
    )
    invoice = result.scalar_one()
    return invoice_to_response(invoice)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    await db.delete(invoice)


@router.patch("/{invoice_id}/status")
async def update_status(
    invoice_id: int,
    data: InvoiceStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    valid_statuses = ["draft", "sent", "paid", "overdue", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    invoice.status = data.status
    if data.status == "sent":
        invoice.sent_at = datetime.now(timezone.utc)
    elif data.status == "paid":
        invoice.paid_at = datetime.now(timezone.utc)

    await db.flush()
    return {"status": invoice.status}


@router.post("/{invoice_id}/generate-pdf")
async def generate_pdf(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.company),
            selectinload(Invoice.service_type),
        )
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    try:
        pdf_bytes = generate_invoice_pdf(invoice, invoice.company, invoice.items)
        pdf_path = save_pdf(pdf_bytes, invoice.invoice_number)
        invoice.pdf_path = pdf_path
        await db.flush()
        return {"message": "PDF generated successfully", "pdf_path": pdf_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.get("/{invoice_id}/download-pdf")
async def download_pdf(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.company),
            selectinload(Invoice.service_type),
        )
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Generate PDF on-the-fly
    try:
        pdf_bytes = generate_invoice_pdf(invoice, invoice.company, invoice.items)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.get("/{invoice_id}/preview-html", response_class=HTMLResponse)
async def preview_html(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.company),
            selectinload(Invoice.service_type),
        )
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    html = generate_invoice_html(invoice, invoice.company, invoice.items)
    return HTMLResponse(content=html)


from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request

@router.post("/{invoice_id}/send-email")
async def send_email(
    invoice_id: int,
    request: Request,
    body: Optional[dict] = None,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    from app.config import settings as app_settings
    
    # Check SMTP is configured via env
    if not app_settings.SMTP_HOST or not app_settings.SMTP_USERNAME:
        raise HTTPException(status_code=400, detail="SMTP not configured. Please set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD in environment variables.")

    # Get invoice
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.company),
            selectinload(Invoice.service_type),
        )
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Determine recipient emails
    emails = []
    if body and body.get("emails"):
        emails = body["emails"]
    elif invoice.bill_to_email:
        emails = [invoice.bill_to_email]
    
    if not emails:
        raise HTTPException(status_code=400, detail="No recipient email address. Please add client email to the invoice.")

    # Build a simple smtp_settings-like object from env
    class EnvSmtp:
        def __init__(self):
            self.smtp_host = app_settings.SMTP_HOST
            self.smtp_port = app_settings.SMTP_PORT
            self.smtp_username = app_settings.SMTP_USERNAME
            self.smtp_password = app_settings.SMTP_PASSWORD
            self.smtp_use_tls = app_settings.SMTP_USE_TLS
            self.from_email = app_settings.SMTP_FROM_EMAIL or app_settings.SMTP_USERNAME
            self.from_name = app_settings.SMTP_FROM_NAME or "Invoice Generator"

    smtp_cfg = EnvSmtp()

    # Determine public logo URL to prevent email clients from blocking base64 image strings
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.url.netloc)
    if not host:
        host = request.headers.get("host", "localhost")
    logo_url = f"{scheme}://{host}/logo.png"

    # Generate HTML content using native pdf_service handling
    try:
        html_content = generate_invoice_html(invoice, invoice.company, invoice.items, logo_base64=logo_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HTML generation failed: {str(e)}")

    # Send email
    success, message = await send_invoice_email(
        smtp_cfg, emails, invoice, invoice.company, html_content
    )

    if success:
        invoice.status = "sent"
        invoice.sent_at = datetime.now(timezone.utc)
        await db.flush()
        return {"message": message, "status": "sent"}
    else:
        raise HTTPException(status_code=500, detail=message)

