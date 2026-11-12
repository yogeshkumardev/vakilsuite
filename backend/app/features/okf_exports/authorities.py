"""Resolve approved legal authority references against current database evidence."""
import hashlib
import json
import uuid

from sqlalchemy import select

from app.core.exceptions import ConflictError, NotFoundError
from app.features.chambers.permissions import ChamberCapability
from app.features.legal_research.models import (
    AuthorityReviewAction, LegalAuthority, LegalAuthorityManifest, LegalAuthorityPassage,
    LegalAuthorityReview, LegalAuthorityVersion, LegalProposition,
)
from app.features.legal_research.service import LegalResearchService


def text_hash(text):
    return hashlib.sha256(text.encode()).hexdigest()


def validate_chain(*, reference, review, proposition, passage, version, authority, case):
    if (review.case_id != case.id or review.chamber_id != case.chamber_id
            or proposition.case_id != case.id or proposition.chamber_id != case.chamber_id
            or authority.chamber_id != case.chamber_id):
        raise ConflictError("Authority scope changed")
    if (review.action != AuthorityReviewAction.approved
            or review.version != reference["review_version"]
            or str(proposition.id) != reference["proposition_id"]
            or review.proposition_id != proposition.id
            or proposition.text_hash != reference["proposition_hash"]
            or text_hash(proposition.text) != proposition.text_hash):
        raise ConflictError("Authority review or proposition changed")
    if (proposition.passage_id != passage.id
            or proposition.authority_version_id != version.id
            or passage.authority_version_id != version.id
            or version.authority_id != authority.id
            or authority.current_version_id != version.id):
        raise ConflictError("Authority version is no longer current")
    if (not version.normalized_text or not passage.locator_valid
            or not 0 <= passage.start_offset < passage.end_offset <= len(version.normalized_text)
            or version.normalized_text[passage.start_offset:passage.end_offset] != passage.text
            or text_hash(passage.text) != passage.text_hash):
        raise ConflictError("Authority passage cannot be verified")


async def capture_authorities(db, *, case_id, user, manifest_id, expected_hash):
    case = await LegalResearchService(db)._case(case_id, user, ChamberCapability.legal_research_read)
    manifest = await db.scalar(select(LegalAuthorityManifest).where(
        LegalAuthorityManifest.id == manifest_id, LegalAuthorityManifest.case_id == case.id,
        LegalAuthorityManifest.chamber_id == case.chamber_id))
    if manifest is None:
        raise NotFoundError("Authority manifest not found")
    digest = hashlib.sha256(json.dumps(manifest.references_json, sort_keys=True,
                                       separators=(",", ":")).encode()).hexdigest()
    if manifest.is_stale or digest != manifest.context_hash or digest != expected_hash:
        raise ConflictError("Authority manifest is stale or changed")
    if not 1 <= len(manifest.references_json) <= 50:
        raise ConflictError("Authority context requires 1–50 reviewed references")
    entries, seen, size = [], set(), 0
    for ref in manifest.references_json:
        try:
            review = await db.get(LegalAuthorityReview, uuid.UUID(ref["review_id"]))
            prop = await db.get(LegalProposition, uuid.UUID(ref["proposition_id"]))
            if review is None or prop is None or review.id in seen:
                raise ConflictError("Authority reference unavailable or duplicated")
            seen.add(review.id)
            passage = await db.get(LegalAuthorityPassage, prop.passage_id)
            version = await db.get(LegalAuthorityVersion, prop.authority_version_id)
            authority = await db.get(LegalAuthority, version.authority_id) if version else None
            if passage is None or version is None or authority is None:
                raise ConflictError("Authority source unavailable")
            validate_chain(reference=ref, review=review, proposition=prop,
                           passage=passage, version=version, authority=authority, case=case)
        except (KeyError, ValueError, TypeError) as exc:
            raise ConflictError("Invalid authority reference") from exc
        size += len(prop.text.encode()) + len(passage.text.encode())
        if size > 128_000:
            raise ConflictError("Authority context exceeds byte budget")
        entries.append({"review_id": str(review.id), "review_version": review.version,
                        "proposition_id": str(prop.id), "proposition": prop.text,
                        "proposition_hash": prop.text_hash, "passage_id": str(passage.id),
                        "passage": passage.text, "passage_hash": passage.text_hash,
                        "start_offset": passage.start_offset, "end_offset": passage.end_offset,
                        "authority_version_id": str(version.id), "authority_content_hash": version.content_hash,
                        "canonical_url": authority.canonical_url})
    return {"manifest_id": str(manifest.id), "context_hash": digest, "entries": entries}
