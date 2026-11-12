from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PageLayoutIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    page_size: Literal["A4", "A3", "Legal", "Letter"] = Field(alias="pageSize")
    orientation: Literal["portrait", "landscape"]
    margin_top: float = Field(alias="marginTop", ge=0, le=100)
    margin_right: float = Field(alias="marginRight", ge=0, le=100)
    margin_bottom: float = Field(alias="marginBottom", ge=0, le=100)
    margin_left: float = Field(alias="marginLeft", ge=0, le=100)

    @model_validator(mode="after")
    def validate_printable_area(self):
        sizes = {
            "A4": (210, 297),
            "A3": (297, 420),
            "Legal": (216, 356),
            "Letter": (216, 279),
        }
        width, height = sizes[self.page_size]
        if self.orientation == "landscape":
            width, height = height, width
        if width - self.margin_left - self.margin_right < 40:
            raise ValueError("Horizontal margins leave too little printable width")
        if height - self.margin_top - self.margin_bottom < 40:
            raise ValueError("Vertical margins leave too little printable height")
        return self


class PersistedEditorDocumentIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    schema_version: Literal[1] = Field(alias="schemaVersion")
    editor_state: dict[str, Any] = Field(alias="editorState")
    page_layout: PageLayoutIn = Field(alias="pageLayout")


class RenderExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=160)
    file_name: str | None = Field(default=None, min_length=1, max_length=120)
    output_format: Literal["docx", "pdf"]
    document: PersistedEditorDocumentIn
