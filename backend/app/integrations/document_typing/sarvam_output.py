"""Narrow cleanup of Sarvam image-region commentary, not source prose."""

import re

EMPTY_IMAGE_COMMENT = "this image contains no discernible text."
NO_TEXT_EXTRACTED = "[No text extracted. Review the original page.]"


def strip_empty_image_comments(text: str) -> str:
    """Remove only the exact standalone provider sentence; retain all other text.

    In particular, quoted mentions, longer sentences and table-cell contents
    must not be stripped by a loose substring replacement.
    """
    parts = re.split(r"(<table\b[^>]*>.*?(?:</table\s*>|$))", text, flags=re.I | re.S)
    return "".join(part if index % 2 else "".join(
        line for line in part.splitlines(keepends=True)
        if " ".join(line.casefold().split()) != EMPTY_IMAGE_COMMENT
    ) for index, part in enumerate(parts))
