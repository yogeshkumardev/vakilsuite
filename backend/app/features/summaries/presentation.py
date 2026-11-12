"""One canonical projection for web/native review and stable OKF selections."""

from pydantic import BaseModel, Field
from .structured import (
    StructuredSummary,
    SECTION_TITLES,
    Fact,
    Analysis,
    FactGroup,
    TimelineEvent,
    MatrixRow,
    MissingItem,
    AdvocateAction,
    EventDate,
)


class SourceLink(BaseModel):
    finding_id: str
    citation_index: int
    document_id: str
    page_number: int
    filename: str | None = None


class SummaryCell(BaseModel):
    label: str
    text: str
    sources: list[SourceLink] = Field(default_factory=list)


class SummaryBlock(BaseModel):
    kind: str
    title: str
    cells: list[SummaryCell]


class SummaryViewSection(BaseModel):
    key: str
    number: int
    title: str
    blocks: list[SummaryBlock]


class SelectableSummaryFact(BaseModel):
    id: str
    text: str
    status: str
    sources: list[SourceLink]


class SummaryView(BaseModel):
    schema_version: str
    executive_word_count: int
    sections: list[SummaryViewSection]
    selectable_facts: list[SelectableSummaryFact]
    uncertainties: list[str]


def sources(fact):
    return [
        SourceLink(
            finding_id=fact.id,
            citation_index=i,
            document_id=c.document_id,
            page_number=c.page_number,
        )
        for i, c in enumerate(fact.citations)
    ]


def present_summary(payload: StructuredSummary) -> SummaryView:
    facts = {f.id: f for f in payload.facts()}

    def refs(ids):
        return [source for ident in ids for source in sources(facts[ident])]

    def ref_text(ids):
        return (
            "\n".join(facts[i].text for i in ids)
            or "Not supplied in selected source set"
        )

    def collect(value, title):
        if isinstance(value, Fact):
            return [
                SummaryBlock(
                    kind="fact",
                    title=title,
                    cells=[
                        SummaryCell(
                            label=value.status.replace("_", " ").title(),
                            text=value.text,
                            sources=sources(value),
                        )
                    ],
                )
            ]
        if isinstance(value, FactGroup):
            if not value.findings:
                return [
                    SummaryBlock(
                        kind="availability",
                        title=title,
                        cells=[
                            SummaryCell(
                                label="Availability",
                                text=value.availability.replace("_", " ").title(),
                            )
                        ],
                    )
                ]
            return [b for f in value.findings for b in collect(f, title)]
        if isinstance(value, Analysis):
            return [
                SummaryBlock(
                    kind="analysis",
                    title=title,
                    cells=[
                        SummaryCell(
                            label="AI analysis · requires verification",
                            text=value.text,
                            sources=refs(value.basis_fact_ids),
                        )
                    ],
                )
            ]
        if isinstance(value, TimelineEvent):
            d = value.date_time
            date = " · ".join(x for x in (d.source_wording, d.time, d.precision) if x)
            involved = (
                "\n".join(f.text for f in value.persons_involved.findings)
                or "Not available"
            )
            significant = value.legal_significance
            source_links = sources(value.event)
            return [
                SummaryBlock(
                    kind="timeline",
                    title=title,
                    cells=[
                        SummaryCell(
                            label="Date / Time", text=date, sources=source_links
                        ),
                        SummaryCell(
                            label="Event description",
                            text=value.event.text,
                            sources=source_links,
                        ),
                        SummaryCell(
                            label="Person involved",
                            text=involved,
                            sources=[
                                s
                                for f in value.persons_involved.findings
                                for s in sources(f)
                            ],
                        ),
                        SummaryCell(
                            label="Source document",
                            text=", ".join(
                                dict.fromkeys(
                                    c.document_id for c in value.event.citations
                                )
                            ),
                            sources=source_links,
                        ),
                        SummaryCell(
                            label="Page number",
                            text=", ".join(
                                str(c.page_number) for c in value.event.citations
                            ),
                            sources=source_links,
                        ),
                        SummaryCell(
                            label="Event status",
                            text=value.event_status.title()
                            + (
                                " · conflict " + value.conflict_id
                                if value.conflict_id
                                else ""
                            ),
                        ),
                        SummaryCell(
                            label="Legal significance · AI analysis",
                            text=significant.text if significant else "Not available",
                            sources=refs(significant.basis_fact_ids)
                            if significant
                            else [],
                        ),
                    ],
                )
            ]
        if isinstance(value, MatrixRow):
            observation = value.defence_observation
            return [
                SummaryBlock(
                    kind="matrix",
                    title="Allegation vs Evidence vs Defence",
                    cells=[
                        SummaryCell(
                            label="Prosecution allegation",
                            text=ref_text([value.allegation_fact_id]),
                            sources=refs([value.allegation_fact_id]),
                        ),
                        SummaryCell(
                            label="Supporting material",
                            text=ref_text(value.supporting_fact_ids),
                            sources=refs(value.supporting_fact_ids),
                        ),
                        SummaryCell(
                            label="Actual defence account",
                            text=ref_text(value.defence_fact_ids),
                            sources=refs(value.defence_fact_ids),
                        ),
                        SummaryCell(
                            label="Defence observation · AI analysis",
                            text=observation.text if observation else "Not available",
                            sources=refs(observation.basis_fact_ids)
                            if observation
                            else [],
                        ),
                        SummaryCell(
                            label="Verification / research required",
                            text=value.research_required,
                            sources=refs([value.allegation_fact_id]),
                        ),
                    ],
                )
            ]
        if isinstance(value, MissingItem):
            return [
                SummaryBlock(
                    kind="missing",
                    title=value.availability.replace("_", " ").title(),
                    cells=[
                        SummaryCell(
                            label=title,
                            text=value.description,
                            sources=refs(value.related_fact_ids),
                        )
                    ],
                )
            ]
        if isinstance(value, AdvocateAction):
            return [
                SummaryBlock(
                    kind="action",
                    title=value.category.replace("_", " ").title(),
                    cells=[
                        SummaryCell(
                            label=title,
                            text=value.instruction,
                            sources=refs(value.related_fact_ids),
                        )
                    ],
                )
            ]
        if isinstance(value, list):
            if not value:
                return [
                    SummaryBlock(
                        kind="availability",
                        title=title,
                        cells=[SummaryCell(label="Availability", text="Not available")],
                    )
                ]
            if all(isinstance(x, str) and x in facts for x in value):
                return [b for ident in value for b in collect(facts[ident], title)]
            return [b for item in value for b in collect(item, title)]
        if isinstance(value, BaseModel) and not isinstance(value, EventDate):
            return [
                b
                for field in type(value).model_fields
                for b in collect(getattr(value, field), field.replace("_", " ").title())
            ]
        return []

    return SummaryView(
        schema_version=payload.schema_version,
        executive_word_count=len(
            " ".join(
                f.text for f in payload.sections.executive_summary.sentences
            ).split()
        ),
        sections=[
            SummaryViewSection(
                key=key,
                number=i,
                title=title,
                blocks=collect(getattr(payload.sections, key), title),
            )
            for i, (key, title) in enumerate(SECTION_TITLES.items(), 1)
        ],
        selectable_facts=[
            SelectableSummaryFact(
                id=f.id, text=f.text, status=f.status, sources=sources(f)
            )
            for f in facts.values()
        ],
        uncertainties=payload.uncertainties,
    )
