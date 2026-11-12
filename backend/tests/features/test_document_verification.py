import pytest

from app.core.exceptions import ValidationError
from app.features.documents.models import DocumentContentClassification
from app.features.documents.verification import classify_pdf_pages, verify_uploaded_bytes


def test_rejects_mime_type_spoofing():
    with pytest.raises(ValidationError, match="does not match"):
        verify_uploaded_bytes(declared_mime_type="application/pdf", payload=b"\x89PNG\r\n\x1a\n")


def test_rejects_unsupported_signature():
    with pytest.raises(ValidationError, match="Unsupported or corrupt"):
        verify_uploaded_bytes(declared_mime_type="image/png", payload=b"not an image")


def test_rejects_invalid_pdf():
    with pytest.raises(ValidationError, match="corrupt or unsupported"):
        verify_uploaded_bytes(declared_mime_type="application/pdf", payload=b"%PDF-1.7\ninvalid")


class _Page:
    def __init__(self, text: str):
        self.text = text

    def extract_text(self):
        return self.text


class _Reader:
    def __init__(self, *pages: str):
        self.pages = [_Page(page) for page in pages]


def test_pdf_page_classification_is_a_text_layer_hint_only():
    kind, hints = classify_pdf_pages(_Reader("Enough selectable text to cross the technical threshold.", ""))
    assert kind == DocumentContentClassification.mixed
    assert hints == [
        {"page_number": 1, "text_layer": "present"},
        {"page_number": 2, "text_layer": "absent"},
    ]


def test_pdf_without_embedded_text_is_classified_scanned_not_approved():
    kind, hints = classify_pdf_pages(_Reader("", " \n "))
    assert kind == DocumentContentClassification.scanned
    assert all(hint["text_layer"] == "absent" for hint in hints)
