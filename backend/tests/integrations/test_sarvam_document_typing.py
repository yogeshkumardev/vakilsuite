from unittest.mock import MagicMock

import pytest

from app.integrations.document_typing.contracts import DocumentTypingProviderError
from app.integrations.document_typing.sarvam import SarvamParseClient, parse_result


def test_parse_result_requires_one_complete_document_with_numbered_pages():
    result = parse_result(
        {
            "documents": [
                {
                    "pages": [
                        {"page_number": 2, "markdown": "Second page"},
                        {"page_number": 1, "text": "First page"},
                    ]
                }
            ],
            "usage": {"pages_total": 2, "pages_succeeded": 2},
        },
        "sarvam-job",
    )

    assert [(page.page_number, page.text) for page in result.pages] == [
        (1, "First page"),
        (2, "Second page"),
    ]
    assert result.request_id == "sarvam-job"
    assert result.usage == {"pages_total": 2, "pages_succeeded": 2}


def test_parse_result_maps_official_parse_page_blocks_in_reading_order():
    result = parse_result(
        {
            "type": "parse",
            "status": "completed",
            "documents": [
                {
                    "status": "completed",
                    "partial": False,
                    "pages": [
                        {
                            "page_num": 1,
                            "status": "completed",
                            "blocks": [
                                {"reading_order": 2, "text": "Second paragraph"},
                                {"reading_order": 1, "text": "First paragraph"},
                                {"reading_order": 3, "layout_tag": "figure"},
                            ],
                        }
                    ],
                }
            ],
            "usage": {"pages_total": 1, "pages_succeeded": 1},
        },
        "sarvam-job",
    )

    assert [(page.page_number, page.text) for page in result.pages] == [
        (1, "First paragraph\n\nSecond paragraph"),
    ]


def test_parse_result_rejects_partial_or_failed_page_results():
    with pytest.raises(DocumentTypingProviderError):
        parse_result(
            {
                "documents": [{"partial": True, "pages": [{"page_num": 1, "blocks": []}]}]
            },
            "sarvam-job",
        )
    with pytest.raises(DocumentTypingProviderError):
        parse_result(
            {"documents": [{"pages": [{"page_num": 1, "status": "failed", "blocks": []}]}]},
            "sarvam-job",
        )


def test_only_exact_signature_commentary_in_nontext_blocks_is_filtered():
    comment = "This image contains a signature and does not contain any text."
    result = parse_result({"documents": [{"pages": [
        {"page_num": 1, "blocks": [
            {"layout_tag": "text", "text": "Printed text"},
            {"layout_tag": "figure", "text": comment},
            {"layout_tag": "text", "text": comment},
            {"layout_tag": "figure", "text": "Signature of witness: Ram"},
        ]},
        {"page_num": 2, "blocks": [{"layout_tag": "signature", "text": comment}]},
        {"page_num": 3, "is_blank": True},
    ]}]}, "job")
    assert result.pages[0].text == "Printed text\n\n" + comment + "\n\nSignature of witness: Ram"
    assert result.pages[1].text == "[No text extracted. Review the original page.]"
    assert result.pages[2].text == "[BLANK PAGE]"


@pytest.mark.parametrize("field", ["text", "markdown", "content", "blocks"])
def test_no_discernible_text_comment_does_not_become_source_text(field):
    comment = "This image contains no discernible text."
    text = f"Printed Hindi हिन्दी\n\n{comment}\n\nMore printed text"
    value = [{"text": text, "layout_tag": "figure"}] if field == "blocks" else text
    result = parse_result({"documents": [{"pages": [{"page_num": 1, field: value}]}]}, "job")
    assert comment not in result.pages[0].text
    assert "Printed Hindi हिन्दी" in result.pages[0].text
    assert "More printed text" in result.pages[0].text


def test_unreadable_page_is_not_falsely_reported_blank_and_quotes_are_preserved():
    from app.integrations.document_typing.sarvam_output import strip_empty_image_comments

    comment = "This image contains no discernible text."
    result = parse_result({"documents": [{"pages": [{"page_num": 1, "text": comment}]}]}, "job")
    assert result.pages[0].text == "[No text extracted. Review the original page.]"
    for original in [f'The report says "{comment}"', f'"{comment}"',
                     f'<table><tr><td>\n{comment}\n</td></tr></table>']:
        assert strip_empty_image_comments(original) == original
    result = parse_result({"documents": [{"pages": [{"page_num": 1, "text": comment,
                           "blocks": [{"text": "Actual readable block"}]}]}]}, "job")
    assert result.pages[0].text == "Actual readable block"


@pytest.mark.parametrize(
    "body",
    [
        {"documents": []},
        {"documents": [{"pages": []}]},
        {"documents": [{"pages": [{"page_number": 1}]}]},
        {"documents": [{"pages": [{"page_number": 1, "text": "a"}, {"page_number": 1, "text": "b"}]}]},
    ],
)
def test_parse_result_rejects_ambiguous_or_incomplete_output(body):
    with pytest.raises(DocumentTypingProviderError):
        parse_result(body, "sarvam-job")


def test_submit_parse_uses_one_multipart_original_and_server_key(monkeypatch):
    response = MagicMock(is_error=False)
    response.json.return_value = {"job_id": "job-1", "run_id": "run-1", "status": "queued"}
    client = MagicMock()
    client.__enter__.return_value = client
    client.request.return_value = response
    monkeypatch.setattr("app.integrations.document_typing.sarvam.httpx.Client", lambda **_kwargs: client)

    submitted = SarvamParseClient(api_key="server-only", base_url="https://example.test").submit_parse(
        data=b"original-bytes",
        filename="scan.pdf",
        mime_type="application/pdf",
        model="sarvam-vision-v1",
        language="hi-IN",
        content_type="printed",
    )

    assert submitted.job_id == "job-1"
    request = client.request.call_args
    assert request.args[:2] == ("POST", "https://example.test/doc-ai/v1/job/parse")
    assert request.kwargs["headers"] == {"api-subscription-key": "server-only"}
    assert request.kwargs["files"]["file"] == ("scan.pdf", b"original-bytes", "application/pdf")
    assert request.kwargs["data"] == {
        "model": "sarvam-vision-v1",
        "language": "hi-IN",
        "content_type": "printed",
    }
