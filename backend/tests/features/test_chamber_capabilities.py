from app.features.chambers.models import ChamberRole
from app.features.chambers.permissions import ChamberCapability, has_capability


def test_staff_cannot_decide_review_or_read_fees() -> None:
    assert not has_capability(ChamberRole.staff, ChamberCapability.review_decide)
    assert not has_capability(ChamberRole.staff, ChamberCapability.fee_read)
    assert has_capability(ChamberRole.staff, ChamberCapability.document_write)


def test_reviewer_can_decide_but_cannot_manage_members_or_fees() -> None:
    assert has_capability(ChamberRole.reviewer, ChamberCapability.review_decide)
    assert not has_capability(ChamberRole.reviewer, ChamberCapability.chamber_manage)
    assert not has_capability(ChamberRole.reviewer, ChamberCapability.fee_read)


def test_owner_and_admin_are_chamber_scoped_not_platform_roles() -> None:
    assert has_capability(ChamberRole.owner, ChamberCapability.provider_policy_manage)
    assert has_capability(ChamberRole.admin, ChamberCapability.chamber_manage)
