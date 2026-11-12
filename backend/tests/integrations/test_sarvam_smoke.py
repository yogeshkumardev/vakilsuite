"""Offline checks for the deliberately small Sarvam connectivity script."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from scripts import sarvam_smoke


def test_missing_key_stops_before_client_creation(capsys) -> None:
    with (
        patch.object(sarvam_smoke.settings, "SARVAM_API_KEY", ""),
        patch.object(sarvam_smoke, "SarvamAI") as client_class,
    ):
        assert sarvam_smoke.main() == 2

    client_class.assert_not_called()
    captured = capsys.readouterr()
    assert "SARVAM_API_KEY is missing" in captured.err


def test_success_prints_only_reply(capsys) -> None:
    client = MagicMock()
    client.chat.completions.return_value = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content="Sarvam connected"),
            )
        ]
    )

    with (
        patch.object(sarvam_smoke.settings, "SARVAM_API_KEY", "secret-key"),
        patch.object(
            sarvam_smoke.settings,
            "SARVAM_CHAT_MODEL",
            "sarvam-105b-conversations",
        ),
        patch.object(sarvam_smoke, "SarvamAI", return_value=client) as client_class,
    ):
        assert sarvam_smoke.main() == 0

    client_class.assert_called_once_with(api_subscription_key="secret-key")
    call = client.chat.completions.call_args.kwargs
    assert call["model"] == "sarvam-105b-conversations"
    captured = capsys.readouterr()
    assert captured.out == "Sarvam connected\n"
    assert "secret-key" not in captured.out + captured.err
