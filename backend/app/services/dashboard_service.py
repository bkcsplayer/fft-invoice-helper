"""Dashboard statistics service."""
from datetime import date, datetime, timezone
from sqlalchemy import select, func, extract, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

from app.models.invoice import Invoice
from app.models.company import Company


async def get_stats(db: AsyncSession) -> dict:
    """Get summary statistics."""
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year

    # Total invoices
    total_result = await db.execute(select(func.count(Invoice.id)))
    total_invoices = total_result.scalar() or 0

    # Total revenue (paid invoices)
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status == "paid"
        )
    )
    total_revenue = float(revenue_result.scalar() or 0)

    # This month invoices total
    month_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            and_(
                extract("month", Invoice.invoice_date) == current_month,
                extract("year", Invoice.invoice_date) == current_year,
            )
        )
    )
    this_month = float(month_result.scalar() or 0)

    # Outstanding (sent + overdue)
    outstanding_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status.in_(["sent", "overdue"])
        )
    )
    outstanding = float(outstanding_result.scalar() or 0)

    return {
        "total_invoices": total_invoices,
        "total_revenue": total_revenue,
        "this_month": this_month,
        "outstanding": outstanding,
    }


async def get_monthly_stats(db: AsyncSession) -> list:
    """Get monthly revenue for the last 12 months."""
    result = await db.execute(
        select(
            extract("year", Invoice.invoice_date).label("year"),
            extract("month", Invoice.invoice_date).label("month"),
            func.coalesce(func.sum(Invoice.total), 0).label("amount"),
            func.count(Invoice.id).label("count"),
        )
        .group_by(
            extract("year", Invoice.invoice_date),
            extract("month", Invoice.invoice_date),
        )
        .order_by(
            extract("year", Invoice.invoice_date),
            extract("month", Invoice.invoice_date),
        )
        .limit(12)
    )
    rows = result.all()
    return [
        {
            "year": int(row.year),
            "month": int(row.month),
            "amount": float(row.amount),
            "count": int(row.count),
        }
        for row in rows
    ]


async def get_by_status(db: AsyncSession) -> list:
    """Get invoice count and amount by status."""
    result = await db.execute(
        select(
            Invoice.status,
            func.count(Invoice.id).label("count"),
            func.coalesce(func.sum(Invoice.total), 0).label("amount"),
        )
        .group_by(Invoice.status)
    )
    rows = result.all()
    return [
        {"status": row.status, "count": int(row.count), "amount": float(row.amount)}
        for row in rows
    ]


async def get_by_company(db: AsyncSession) -> list:
    """Get revenue by company."""
    result = await db.execute(
        select(
            Company.name,
            func.count(Invoice.id).label("count"),
            func.coalesce(func.sum(Invoice.total), 0).label("amount"),
        )
        .join(Company, Invoice.company_id == Company.id)
        .group_by(Company.name)
        .order_by(func.sum(Invoice.total).desc())
    )
    rows = result.all()
    return [
        {"company": row.name, "count": int(row.count), "amount": float(row.amount)}
        for row in rows
    ]


async def get_recent_invoices(db: AsyncSession, limit: int = 10) -> list:
    """Get most recent invoices."""
    result = await db.execute(
        select(Invoice)
        .options()
        .order_by(Invoice.created_at.desc())
        .limit(limit)
    )
    invoices = result.scalars().all()
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "bill_to_name": inv.bill_to_name,
            "total": float(inv.total),
            "status": inv.status,
            "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
            "company_name": inv.company.name if inv.company else None,
        }
        for inv in invoices
    ]
