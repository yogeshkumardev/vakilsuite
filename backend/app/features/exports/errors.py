from app.core.exceptions import AppError


class ExportInputError(AppError):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message, "EXPORT_INPUT_INVALID", 422, details)


class ExportUnavailableError(AppError):
    def __init__(self, message: str = "PDF export is temporarily unavailable"):
        super().__init__(message, "EXPORT_UNAVAILABLE", 503)
