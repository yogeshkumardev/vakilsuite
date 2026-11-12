"""Bounded draft output, provenance validation and deterministic Lexical projection."""

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.features.revisions.lexical import validate_editor_document

PROMPT_VERSION = "s528-grounded-draft-v2"
SYSTEM = """You are an expert Indian Senior Advocate specializing in criminal defense and High Court miscellaneous petition drafting.
Your task is to draft a comprehensive, highly articulate, and filing-ready Section 528 BNSS application (Criminal Miscellaneous Quashing Petition, erstwhile Section 482 Cr.P.C.) for an Indian High Court.

MANDATORY LEGAL STRUCTURE:
The output must contain exactly the following 5 structured sections:

1. "CAUSE TITLE & MEMO OF PARTIES":
   - Court Header: "IN THE HIGH COURT OF JUDICATURE AT [HIGH COURT NAME/BENCH]"
   - Case Classification: "CRIMINAL MISC. APPLICATION NO. ________ OF [YEAR]"
   - Provision Clause: "Under Section 528 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (Erstwhile Section 482 of Code of Criminal Procedure, 1973)"
   - District Clause: "District: [District Name]"
   - Memo of Parties:
     "IN THE MATTER OF:
     [Applicant Name], S/o [Father Name], Aged about [Age] years, R/o [Address] ... APPLICANT
     VERSUS
     1. State of [State Name] through Principal Secretary (Home) / S.H.O. P.S. [Police Station]
     2. [Informant Name], S/o [...], R/o [...] ... OPPOSITE PARTIES"

2. "APPLICATION & STATEMENT OF FACTS":
   - Formal opening: "TO, THE HON'BLE THE CHIEF JUSTICE AND HIS COMPANION JUDGES OF THE HON'BLE HIGH COURT. THE HUMBLE APPLICATION OF THE APPLICANT ABOVE NAMED MOST RESPECTFULLY SHOWETH:"
   - Numbered legal paragraphs (e.g., "1. That the applicant above named is preferring the present application...", "2. That the brief factual matrix giving rise to the present dispute is...", "3. That...").
   - Clearly delineate: FIR details, alleged offences under BNS/IPC, date of occurrence, role of the applicant, delay in lodging, absence of ingredients of offences, and any subsequent settlement/compromise deed.
   - Use kind 'fact' for paragraphs containing confirmed case facts. Attach the corresponding fact_ids.

3. "GROUNDS OF APPLICATION":
   - Articulate, persuasive, High Court caliber legal grounds.
   - Formatted in classical High Court pleading style starting with "A. BECAUSE ...", "B. BECAUSE ...", "C. BECAUSE ...".
   - Weave established Supreme Court quashing principles:
     * Abuse of judicial process and no prima facie cognizable offence disclosed (State of Haryana v. Bhajan Lal, 1992 Supp (1) SCC 335).
     * Cloaking civil/commercial dispute in criminal color (Indian Oil Corp. v. NEPC India Ltd., (2006) 6 SCC 736).
     * Mechanical summoning without judicial application of mind.
     * Quashing on the ground of amicable settlement/compromise between parties (Gian Singh v. State of Punjab, (2012) 10 SCC 303), if applicable.
   - Use kind 'argument'. Attach fact_ids and/or authority_ids.

4. "PRAYER":
   - Dignified, comprehensive formal prayer:
     "WHEREFORE, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to:
     (a) Allow the present application and quash the impugned First Information Report / Charge-Sheet No. [Number] dated [Date] arising out of Case Crime No. [Number] registered at Police Station [PS], District [District], along with all consequential proceedings pending before the learned trial court;
     (b) Stay the further proceedings / coercive action against the applicant in Criminal Case No. [Number] during the pendency of the present application before this Hon'ble Court;
     (c) Pass such other and further order(s) as this Hon'ble Court may deem fit and proper in the interest of justice."
   - Use kind 'procedural'.

5. "SUPPORTING AFFIDAVIT & VERIFICATION":
   - Complete formal affidavit by the deponent:
     "AFFIDAVIT
     I, [Deponent Name], aged about [Age] years, S/o [Father Name], R/o [Address], do hereby solemnly affirm and declare on oath as under:
     1. That the deponent is the applicant in the accompanying application and is fully conversant with the facts of the case.
     2. That the contents of the accompanying application have been drafted under my instructions and the same are true to my knowledge and belief.
     VERIFICATION:
     Verified at [District] on this [Date] day of [Month], [Year] that the contents of paragraphs 1 to [...] are true to my personal knowledge, and paragraphs [...] to [...] are based on legal advice received from counsel, and nothing material has been concealed therefrom.
     DEPONENT"
   - Use kind 'procedural'.

DRAFTING RULES:
- Write in flawless, elegant Indian legal English (formal court pleading register).
- Never use markdown syntax (like **, ##, or bullet dashes) inside the JSON text strings.
- Synthesize facts into a flowing narrative rather than disjointed 1-line sentences.
- Every factual assertion must be grounded in the supplied confirmed facts with valid fact_ids.
- Return strictly valid JSON conforming to the schema."""


class Paragraph(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=6000)
    kind: Literal["fact", "argument", "procedural"]
    fact_ids: list[str] = Field(max_length=30)
    authority_ids: list[str] = Field(max_length=30)

    @model_validator(mode="before")
    @classmethod
    def normalize_kind_and_defaults(cls, data: Any) -> Any:
        if isinstance(data, dict):
            raw_kind = str(data.get("kind", "")).strip().lower()
            fact_ids = data.get("fact_ids") or []
            auth_ids = data.get("authority_ids") or []

            if raw_kind in ("fact", "argument", "procedural"):
                data["kind"] = raw_kind
            elif raw_kind in (
                "statement_of_facts",
                "chronology_item",
            ):
                data["kind"] = "fact" if fact_ids else "procedural"
            elif raw_kind in (
                "ground",
                "grounds",
                "plea",
                "pleading",
                "submission",
            ):
                data["kind"] = "argument" if (fact_ids or auth_ids) else "procedural"
            elif raw_kind in (
                "heading",
                "prayer",
                "verification",
                "title",
                "cause_title",
                "deponent_description",
                "deponent_capacity",
                "procedure",
            ):
                data["kind"] = "procedural"
            elif fact_ids:
                data["kind"] = "fact"
            elif auth_ids:
                data["kind"] = "argument"
            else:
                data["kind"] = "procedural"
        return data


class Section(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    paragraphs: list[Paragraph] = Field(min_length=1, max_length=50)


class DraftOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sections: list[Section] = Field(min_length=1, max_length=15)
    missing_facts: list[str] = Field(max_length=100)


# Gemini-compatible inlined schema without $defs, $ref or additionalProperties
DRAFT_RESPONSE_SCHEMA: dict[str, object] = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "paragraphs": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "kind": {
                                    "type": "string",
                                    "enum": ["fact", "argument", "procedural"],
                                },
                                "fact_ids": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                                "authority_ids": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                            },
                            "required": ["text", "kind", "fact_ids", "authority_ids"],
                        },
                    },
                },
                "required": ["title", "paragraphs"],
            },
        },
        "missing_facts": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["sections", "missing_facts"],
}


def contents(context, bindings, relief):
    return json.dumps(
        {
            "context": context,
            "confirmed_fact_bindings": bindings,
            "requested_relief": relief,
        },
        ensure_ascii=False,
        sort_keys=True,
    )


def editor_from_output(output: DraftOutput, context: dict) -> dict:
    app = context["application"]
    facts = {f["id"]: f for f in app["confirmed_facts"]}
    authorities = {
        a["review_id"]: a
        for a in app.get("verified_authorities", {}).get("entries", [])
    }
    
    children: list[dict[str, Any]] = []

    # 1. Unreviewed badge header
    children.append({
        "type": "paragraph",
        "version": 1,
        "direction": None,
        "format": "center",
        "indent": 0,
        "children": [{
            "type": "text",
            "version": 1,
            "text": "UNREVIEWED AI WORKING DRAFT — Advocate verification required",
            "format": 2,  # italic
            "detail": 0,
            "mode": "normal",
            "style": "",
        }]
    })

    used_facts, used_authorities = set(), set()
    for section in output.sections:
        # Section Header
        children.append({
            "type": "paragraph",
            "version": 1,
            "direction": None,
            "format": "center",
            "indent": 0,
            "children": [{
                "type": "text",
                "version": 1,
                "text": section.title.upper(),
                "format": 1,  # bold
                "detail": 0,
                "mode": "normal",
                "style": "",
            }]
        })
        for p in section.paragraphs:
            if (
                not set(p.fact_ids) <= facts.keys()
                or not set(p.authority_ids) <= authorities.keys()
            ):
                raise ValueError("UNKNOWN_SOURCE_REFERENCE")
            if p.kind == "fact" and not p.fact_ids:
                raise ValueError("FACT_REQUIRES_SOURCE")
            if p.kind == "argument" and not (p.fact_ids or p.authority_ids):
                raise ValueError("ARGUMENT_REQUIRES_SUPPORT")
            if "http://" in p.text.lower() or "https://" in p.text.lower():
                raise ValueError("PROVIDER_URL_NOT_ALLOWED")
            used_facts.update(p.fact_ids)
            used_authorities.update(p.authority_ids)

            p_text = p.text.strip()
            is_center = any(
                p_text.upper().startswith(kw) for kw in [
                    "IN THE HIGH COURT",
                    "CRIMINAL MISC",
                    "UNDER SECTION",
                    "DISTRICT:",
                    "IN THE MATTER OF:",
                    "VERSUS",
                    "AFFIDAVIT",
                    "DEPONENT",
                ]
            ) or p_text.upper() in ["VERSUS", "APPLICANT", "OPPOSITE PARTY", "OPPOSITE PARTIES"]

            is_prayer_item = p_text.startswith("(") and len(p_text) > 3 and (p_text[2] in [")", "."] or p_text[3] in [")", "."])
            is_prayer_header = p_text.upper().startswith("WHEREFORE")

            p_format = "center" if is_center else "justify"
            p_indent = 1 if is_prayer_item else 0

            text_nodes: list[dict[str, Any]] = []
            if is_center or is_prayer_header:
                text_nodes.append({
                    "type": "text",
                    "version": 1,
                    "text": p_text,
                    "format": 1,
                    "detail": 0,
                    "mode": "normal",
                    "style": "",
                })
            elif any(p_text.startswith(f"{letter}. BECAUSE") for letter in "ABCDEFGHIJ"):
                prefix = p_text[:11]
                rest = p_text[11:]
                text_nodes.append({"type": "text", "version": 1, "text": prefix, "format": 1, "detail": 0, "mode": "normal", "style": ""})
                if rest:
                    text_nodes.append({"type": "text", "version": 1, "text": rest, "format": 0, "detail": 0, "mode": "normal", "style": ""})
            elif p_text.upper().startswith("VERIFICATION:"):
                text_nodes.append({"type": "text", "version": 1, "text": "VERIFICATION: ", "format": 1, "detail": 0, "mode": "normal", "style": ""})
                rest = p_text[13:].strip()
                if rest:
                    text_nodes.append({"type": "text", "version": 1, "text": rest, "format": 0, "detail": 0, "mode": "normal", "style": ""})
            else:
                text_nodes.append({
                    "type": "text",
                    "version": 1,
                    "text": p_text,
                    "format": 0,
                    "detail": 0,
                    "mode": "normal",
                    "style": "",
                })

            children.append({
                "type": "paragraph",
                "version": 1,
                "direction": None,
                "format": p_format,
                "indent": p_indent,
                "children": text_nodes,
            })

    if output.missing_facts:
        children.append({
            "type": "paragraph",
            "version": 1,
            "direction": None,
            "format": "left",
            "indent": 0,
            "children": [{"type": "text", "version": 1, "text": "Missing information — resolve before filing:", "format": 1, "detail": 0, "mode": "normal", "style": ""}]
        })
        for mf in output.missing_facts:
            children.append({
                "type": "paragraph",
                "version": 1,
                "direction": None,
                "format": "left",
                "indent": 1,
                "children": [{"type": "text", "version": 1, "text": f"• {mf}", "format": 0, "detail": 0, "mode": "normal", "style": ""}]
            })

    if used_facts or used_authorities:
        children.append({
            "type": "paragraph",
            "version": 1,
            "direction": None,
            "format": "left",
            "indent": 0,
            "children": [{"type": "text", "version": 1, "text": "Annexure / Source Document Reference (Advocate Working Index)", "format": 1, "detail": 0, "mode": "normal", "style": ""}]
        })
        for ident in sorted(used_facts):
            fact_data = facts[ident]
            cits = fact_data.get("citations", [])
            cit_strs = []
            for c in cits:
                doc_id = c.get("source_document_id", "Unknown")
                pg = c.get("page_number", 1)
                cit_strs.append(f"Document {doc_id} (Page {pg})")
            c_desc = ", ".join(cit_strs) if cit_strs else "Verified summary finding"
            children.append({
                "type": "paragraph",
                "version": 1,
                "direction": None,
                "format": "left",
                "indent": 1,
                "children": [{"type": "text", "version": 1, "text": f"Fact Reference {ident}: {c_desc}", "format": 0, "detail": 0, "mode": "normal", "style": ""}]
            })
        for ident in sorted(used_authorities):
            a = authorities[ident]
            children.append({
                "type": "paragraph",
                "version": 1,
                "direction": None,
                "format": "left",
                "indent": 1,
                "children": [{"type": "text", "version": 1, "text": f"Authority {ident}: {a.get('proposition', '')} — {a.get('canonical_url', '')}", "format": 0, "detail": 0, "mode": "normal", "style": ""}]
            })

    doc = {
        "schemaVersion": 1,
        "pageLayout": {
            "pageSize": "A4",
            "orientation": "portrait",
            "marginTop": 25,
            "marginRight": 20,
            "marginBottom": 25,
            "marginLeft": 35,
        },
        "editorState": {
            "root": {
                "type": "root",
                "version": 1,
                "direction": None,
                "format": "",
                "indent": 0,
                "children": children,
            }
        },
    }
    validate_editor_document(doc)
    return doc
