import uuid

import pytest

from app.core.exceptions import ValidationError
from app.features.auth.recovery import flow_token, parse_flow


def test_verification_flow_is_purpose_bound():
    token = flow_token(uuid.uuid4(), "email_verification")
    assert parse_flow(token, "email_verification")
    with pytest.raises(ValidationError):
        parse_flow(token, "password_reset")


def test_verification_flow_rejects_tampering():
    token = flow_token(uuid.uuid4(), "email_verification")
    with pytest.raises(ValidationError):
        parse_flow(token[:-1] + ("0" if token[-1] != "0" else "1"), "email_verification")
