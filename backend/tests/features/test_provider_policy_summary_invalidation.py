import uuid
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock

import pytest

from app.features.chambers import provider_policy_service as policies
from app.features.chambers.schemas import ChamberProviderPolicyIn


@pytest.mark.asyncio
async def test_policy_replacement_stales_pending_summary_runs(monkeypatch):
    chamber_id, owner_id, old_policy_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    chamber = NS(id=chamber_id)
    current = NS(id=old_policy_id, version=2, is_active=True)
    db = NS(
        scalar=AsyncMock(side_effect=[chamber, current]),
        add=lambda _: None,
        flush=AsyncMock(),
        execute=AsyncMock(),
    )
    monkeypatch.setattr(policies, "policy_out", lambda policy, **kwargs: kwargs)

    await policies.replace_policy(
        db,
        chamber_id=chamber_id,
        actor_user_id=owner_id,
        policy=ChamberProviderPolicyIn(),
    )

    assert current.is_active is False
    db.execute.assert_awaited_once()
