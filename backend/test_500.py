import asyncio
import json
import traceback
from decimal import Decimal
from datetime import date
from pydantic import ValidationError

from app.database import async_session_factory, engine
from app.api.invoices import create_invoice, update_invoice
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceItemCreate
from app.models.company import Company
from app.models.service_type import ServiceType
from app.models import Base

async def test_create_invoice():
    # Initialize DB schema for test just in case it's a test db
    # We will use the existing DB by just getting the session

    payload = {
        "company_id": None,
        "service_type_id": None,
        "bill_to_name": "Test Client",
        "bill_to_address": "123 Test St",
        "bill_to_phone": "1234567890",
        "bill_to_email": "test@test.com",
        "invoice_date": date.today().isoformat(),
        "due_date": date.today().isoformat(),
        "po_number": "",
        "code_number": "",
        "item_type": "standard",
        "gst_enabled": True,
        "gst_rate": "5.00",
        "hst_enabled": False,
        "hst_rate": "0",
        "payment_method": "",
        "payment_company_name": "Test Co",
        "payment_company_address": "123 Co St",
        "payee": "",
        "signature_name": "John",
        "contact_phone": "111",
        "contact_email": "",
        "website": "",
        "bank_name": "",
        "bank_address": "",
        "transit_number": "",
        "institution_number": "",
        "account_number": "",
        "terms_conditions": "",
        "items": [
            {
                "sort_order": 0,
                "quantity": "1",
                "description": "Test item",
                "unit_price": "100.00"
            }
        ]
    }

    try:
        data = InvoiceCreate(**payload)
    except ValidationError as e:
        print("Pydantic Validation Error:")
        print(e)
        return

    async with async_session_factory() as session:
        try:
            # Need to pass a dict for user dependency
            result = await create_invoice(data=data, db=session, _={"id": 1, "username": "admin"})
            print("Success!")
            print(result)
        except Exception as e:
            print("500 Error reproduced! Traceback:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create_invoice())
