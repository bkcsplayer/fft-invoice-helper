"""Invoice business logic service."""
from datetime import date, timedelta
from decimal import Decimal
from typing import List


def calculate_due_date(invoice_date: date, business_days: int = 10) -> date:
    """Calculate due date by adding business days (skip weekends)."""
    current = invoice_date
    remaining = business_days
    while remaining > 0:
        current += timedelta(days=1)
        if current.weekday() < 5:  # Monday to Friday
            remaining -= 1
    return current


def generate_invoice_number(
    company_code: str,
    service_code: str,
    invoice_date: date,
    code_number: str,
) -> str:
    """Generate invoice number: {CompanyCode}{ServiceCode}{YYYY}-{MMDD}{CodeNumber}"""
    return f"{company_code}{service_code}{invoice_date.strftime('%Y-%m%d')}{code_number}"


def calculate_totals(
    items: list,
    gst_enabled: bool,
    gst_rate: Decimal,
    hst_enabled: bool,
    hst_rate: Decimal,
) -> tuple:
    """Calculate subtotal, GST, HST, and total."""
    subtotal = sum(
        Decimal(str(item.quantity)) * Decimal(str(item.unit_price))
        for item in items
    )
    gst_amount = subtotal * (gst_rate / Decimal("100")) if gst_enabled else Decimal("0")
    hst_amount = subtotal * (hst_rate / Decimal("100")) if hst_enabled else Decimal("0")
    total = subtotal + gst_amount + hst_amount
    return subtotal, gst_amount, hst_amount, total
