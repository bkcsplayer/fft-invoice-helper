"""PDF generation service using WeasyPrint."""
import os
import logging
import traceback
from pathlib import Path
from decimal import Decimal
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from app.config import settings

logger = logging.getLogger(__name__)

# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))


def _to_float(val):
    """Safely convert Decimal/None to float."""
    if val is None:
        return 0.0
    if isinstance(val, Decimal):
        return float(val)
    return float(val)


def _prepare_context(invoice, company, items):
    """Convert ORM objects to plain dicts with float values for Jinja2."""
    inv_dict = {
        "invoice_number": invoice.invoice_number or "",
        "bill_to_name": invoice.bill_to_name or "",
        "bill_to_address": invoice.bill_to_address or "",
        "bill_to_phone": invoice.bill_to_phone or "",
        "invoice_date": str(invoice.invoice_date) if invoice.invoice_date else "",
        "due_date": str(invoice.due_date) if invoice.due_date else "",
        "po_number": invoice.po_number or "",
        "code_number": invoice.code_number or "",
        "item_type": invoice.item_type or "standard",
        "subtotal": _to_float(invoice.subtotal),
        "gst_enabled": invoice.gst_enabled if invoice.gst_enabled is not None else False,
        "gst_rate": _to_float(invoice.gst_rate),
        "gst_amount": _to_float(invoice.gst_amount),
        "hst_enabled": invoice.hst_enabled if invoice.hst_enabled is not None else False,
        "hst_rate": _to_float(invoice.hst_rate),
        "hst_amount": _to_float(invoice.hst_amount),
        "total": _to_float(invoice.total),
        "payment_method": invoice.payment_method or "",
        "payment_company_name": invoice.payment_company_name or "",
        "payment_company_address": invoice.payment_company_address or "",
        "payee": invoice.payee or "",
        "signature_name": invoice.signature_name or "",
        "contact_phone": invoice.contact_phone or "",
        "contact_email": invoice.contact_email or "",
        "website": invoice.website or "",
        "bank_name": invoice.bank_name or "",
        "bank_address": invoice.bank_address or "",
        "transit_number": invoice.transit_number or "",
        "institution_number": invoice.institution_number or "",
        "account_number": invoice.account_number or "",
        "terms_conditions": invoice.terms_conditions or "",
        "status": invoice.status or "draft",
    }

    comp_dict = None
    if company:
        comp_dict = {
            "code": company.code or "",
            "name": company.name or "",
            "full_name": company.full_name or "",
            "address": company.address or "",
            "phone": company.phone or "",
            "email": company.email or "",
            "website": company.website or "",
            "gst_number": company.gst_number or "",
            "logo_url": company.logo_url if hasattr(company, 'logo_url') else "",
        }

    items_list = []
    for item in (items or []):
        items_list.append({
            "sort_order": item.sort_order or 0,
            "quantity": _to_float(item.quantity),
            "description": item.description or "",
            "unit_price": _to_float(item.unit_price),
            "amount": _to_float(item.amount) if item.amount else _to_float(item.quantity) * _to_float(item.unit_price),
        })

    return inv_dict, comp_dict, items_list


def generate_invoice_pdf(invoice, company, items) -> bytes:
    """Generate PDF bytes from invoice data."""
    try:
        inv_dict, comp_dict, items_list = _prepare_context(invoice, company, items)
        logo_base64 = _get_logo_base64()
        template = jinja_env.get_template("invoice_pdf.html")
        html_content = template.render(
            invoice=inv_dict, 
            company=comp_dict, 
            items=items_list,
            logo_base64=logo_base64
        )
        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        logger.error(traceback.format_exc())
        raise


def _get_logo_base64() -> str:
    import base64
    logo_path = TEMPLATE_DIR / "logo.png"
    if logo_path.exists():
        with open(logo_path, "rb") as f:
            return f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8')}"
    return None

def generate_invoice_html(invoice, company, items, logo_base64: str = None) -> str:
    """Generate HTML string for preview."""
    inv_dict, comp_dict, items_list = _prepare_context(invoice, company, items)
    
    # If not provided explicitly, try to load it
    if not logo_base64:
        logo_base64 = _get_logo_base64()
        
    template = jinja_env.get_template("invoice_pdf.html")
    return template.render(
        invoice=inv_dict, 
        company=comp_dict, 
        items=items_list,
        logo_base64=logo_base64
    )


def save_pdf(pdf_bytes: bytes, invoice_number: str) -> str:
    """Save PDF to storage and return file path."""
    pdf_dir = Path(settings.PDF_STORAGE_PATH)
    pdf_dir.mkdir(parents=True, exist_ok=True)

    filename = f"invoice_{invoice_number}.pdf"
    filepath = pdf_dir / filename

    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    return str(filepath)
