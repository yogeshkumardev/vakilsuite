# VakilSuite Backend

The backend is intentionally limited to:

- authentication and authorization;
- users and case access control;
- document upload metadata and Cloudflare R2 upload/view/delete URLs.

OCR and reasoning are not implemented in this baseline. Future document processing
should call the selected Gemini or OpenAI APIs through a new, explicit integration.

For local commands, see `../LOCAL_SETUP.md`.
