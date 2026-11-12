"""Run periodically by the worker/ops scheduler to abort abandoned R2 uploads."""

import asyncio

from app.db.session import AsyncSessionLocal
from app.features.documents.service import DocumentService


async def main() -> None:
    async with AsyncSessionLocal() as db:
        cleaned = await DocumentService(db).cleanup_expired_multipart_uploads()
        await db.commit()
    print(f"Expired multipart uploads cleaned: {cleaned}")


if __name__ == "__main__":
    asyncio.run(main())
