from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Auto-migration: add bill_to_email if it doesn't exist
        try:
            await conn.execute(text(
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bill_to_email VARCHAR(200)"
            ))
        except Exception:
            pass  # Column already exists or DB doesn't support IF NOT EXISTS
        # Auto-migration: add is_coupon if it doesn't exist
        try:
            await conn.execute(text(
                "ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS is_coupon BOOLEAN DEFAULT FALSE"
            ))
        except Exception:
            pass
