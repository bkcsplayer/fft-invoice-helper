"""Seed data for initial database population."""
import asyncio
from sqlalchemy import select
from app.database import async_session_factory, init_db
from app.models.company import Company
from app.models.service_type import ServiceType
from app.models.smtp_settings import SmtpSettings


async def seed_data():
    """Insert default seed data if tables are empty."""
    await init_db()

    async with async_session_factory() as session:
        # Check if companies already exist
        result = await session.execute(select(Company).limit(1))
        if result.scalar_one_or_none() is not None:
            print("Seed data already exists, skipping...")
            return

        # Companies
        companies = [
            Company(
                code="FFT",
                name="FutureFrontier Technology",
                full_name="FutureFrontier Technology Ltd.",
                address="4838 Richard Road SW, Suite 300, Calgary, AB T3E6L1",
                phone="403-399-0959",
                email="info@khtain.com",
                website="myfuturefrontier.com",
                gst_number="GST #742899552 RT 0001",
                is_default=True,
            ),
            Company(
                code="ULT",
                name="SiliconFlow Ltd.",
                full_name="SiliconFlow Ltd.",
            ),
            Company(
                code="ECO",
                name="Khtain Digital Ltd",
                full_name="Khtain Digital Ltd.",
            ),
        ]
        session.add_all(companies)

        # Service Types
        service_types = [
            ServiceType(code="SLI", name="Solar Install"),
            ServiceType(code="EVC", name="EV Charger"),
            ServiceType(code="BAT", name="Battery Storage"),
            ServiceType(code="CON", name="Consulting"),
        ]
        session.add_all(service_types)

        # Default SMTP Settings (empty/unconfigured)
        smtp = SmtpSettings(
            id=1,
            smtp_host="",
            smtp_port=587,
            smtp_username="",
            smtp_password="",
            smtp_use_tls=True,
            from_email="",
            from_name="",
            is_configured=False,
        )
        session.add(smtp)

        await session.commit()
        print("Seed data inserted successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())
