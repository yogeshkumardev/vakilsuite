"""Retired entry point: the RAG subsystem was removed in the backend reset.

No files are read and no database/storage writes are performed. Draft knowledge
will use reviewed OKF bundles in S07/S08, not embeddings or vector retrieval.
"""


def main() -> None:
    raise SystemExit(
        "This RAG importer is retired. Do not run corpus imports; "
        "see SPRINT_DEVELOPMENT_PLAN.md for the OKF workflow."
    )


if __name__ == "__main__":
    main()
