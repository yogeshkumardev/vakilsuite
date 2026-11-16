// Generated from API v1 by scripts/sync-api-contract.mjs. Do not edit.
// OpenAPI SHA-256: 9bb1ca557c97683f114a9a6849af780185a1c06f2750f8e0ab61800ebe5b07a3

export interface paths {
    "/api/v1/annexures/{annexure_id}/assignment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Assign Annexure */
        put: operations["annexures_assign_version"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/change-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Change Password */
        post: operations["auth_change_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/email-verification/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Confirm Email Verification */
        post: operations["auth_confirm_email_verification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/email-verification/request": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Request Email Verification */
        post: operations["auth_request_email_verification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/forgot-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Forgot Password */
        post: operations["auth_forgot_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/google": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Google */
        post: operations["auth_google_alias"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Login */
        post: operations["auth_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login/google": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Login Google */
        post: operations["auth_login_google"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Logout */
        post: operations["auth_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Logout All */
        post: operations["auth_logout_all"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Refresh */
        post: operations["auth_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Register */
        post: operations["auth_register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/reset-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reset Password */
        post: operations["auth_reset_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Sessions */
        get: operations["auth_sessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions/{session_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Revoke Session */
        delete: operations["auth_revoke_session"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/case-numbers/{number_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete case number */
        delete: operations["case_numbers_delete"];
        options?: never;
        head?: never;
        /** Update case number */
        patch: operations["case_numbers_update"];
        trace?: never;
    };
    "/api/v1/case-sections/{section_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Soft-remove section */
        delete: operations["case_sections_remove"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List cases */
        get: operations["cases_list"];
        put?: never;
        /** Create a new case */
        post: operations["cases_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/review-inbox": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Review Inbox */
        get: operations["working_documents_review_inbox"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get case detail */
        get: operations["cases_get"];
        put?: never;
        post?: never;
        /** Archive case */
        delete: operations["cases_archive"];
        options?: never;
        head?: never;
        /** Update case */
        patch: operations["cases_update"];
        trace?: never;
    };
    "/api/v1/cases/{case_id}/access": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Grant case access */
        post: operations["cases_grant_access"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/access/{user_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Revoke case access */
        delete: operations["cases_revoke_access"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/annexures": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Annexure */
        post: operations["annexures_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/authority-manifests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Authority Manifests */
        get: operations["legal_research_list_authority_manifests"];
        put?: never;
        /** Create Authority Manifest */
        post: operations["legal_research_create_authority_manifest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/clients": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Case Clients */
        get: operations["case_clients_list"];
        put?: never;
        /** Link Case Client */
        post: operations["case_clients_link"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/clients/{client_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Unlink Case Client */
        delete: operations["case_clients_unlink"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/court-drafts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Court Draft */
        post: operations["drafts_create_court_draft"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/court-drafts/{draft_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Court Draft */
        get: operations["drafts_get_court_draft"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Court Draft */
        patch: operations["drafts_update_court_draft"];
        trace?: never;
    };
    "/api/v1/cases/{case_id}/court-drafts/{draft_id}/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Enqueue Court Draft Export */
        post: operations["drafts_enqueue_court_draft_export"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/court-drafts/{draft_id}/exports/{job_id}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download Court Draft Export */
        get: operations["drafts_download_court_draft_export"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/court-drafts/{draft_id}/generate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Generate Court Draft */
        post: operations["drafts_generate_court_draft"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/court-drafts/{draft_id}/word-editor": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Materialize Court Draft Word Editor */
        post: operations["drafts_materialize_court_draft_word_editor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Documents */
        get: operations["documents_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/documents/presign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Presign Upload */
        post: operations["documents_presign"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/draft-readiness": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Draft Readiness */
        get: operations["drafts_readiness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/fact-card-coverage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Fact Card Coverage */
        get: operations["summaries_fact_card_coverage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/fact-cards/{card_id}/sources/{section_index}/{finding_index}/{citation_index}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Fact Card Source */
        get: operations["summaries_fact_card_source"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/legal-research/authorities/{authority_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Authority */
        get: operations["legal_research_get_authority"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/legal-research/authorities/{authority_id}/passages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Passage */
        post: operations["legal_research_create_passage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/legal-research/authorities/{upstream_document_id}/checks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Fetch Authority */
        post: operations["legal_research_fetch_authority"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/legal-research/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Config */
        get: operations["legal_research_get_config"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/legal-research/propositions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Proposition */
        post: operations["legal_research_create_proposition"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/legal-research/reviews/{review_id}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Decide Review */
        post: operations["legal_research_decide_review"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/legal-research/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Runs */
        get: operations["legal_research_list_runs"];
        put?: never;
        /** Create Run */
        post: operations["legal_research_create_run"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/legal-research/runs/{run_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Run */
        get: operations["legal_research_get_run"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/legal-research/runs/{run_id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Submit Run */
        post: operations["legal_research_submit_run"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/numbers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add case number */
        post: operations["case_numbers_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/okf-annexure-candidates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Okf Annexure Candidates */
        get: operations["okf_exports_list_annexure_candidates"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/okf-contexts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Save Okf Context */
        post: operations["okf_contexts_save"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/okf-contexts/{snapshot_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Okf Context */
        get: operations["okf_contexts_read"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/okf-contexts/{snapshot_id}/draft-generation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Draft Status */
        get: operations["okf_draft_status"];
        put?: never;
        /** Draft Submit */
        post: operations["okf_draft_submit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/okf-contexts/{snapshot_id}/draft-preflight": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Draft Preflight */
        post: operations["okf_contexts_draft_preflight"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/okf-contexts/{snapshot_id}/draft-quote": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Draft Quote */
        post: operations["okf_draft_quote"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/okf-export-preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Prepare Okf Export Preview */
        post: operations["okf_exports_prepare_preview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/okf-templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Okf Templates */
        get: operations["okf_exports_list_templates"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/parties": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add party */
        post: operations["parties_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Case Permissions */
        get: operations["cases_permissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/proceedings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Proceedings */
        get: operations["proceedings_list"];
        put?: never;
        /** Create Proceeding */
        post: operations["proceedings_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/sections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add section */
        post: operations["case_sections_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/sections/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Section history */
        get: operations["case_sections_history"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/soft-delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Soft-delete case and its documents */
        post: operations["cases_soft_delete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/summary-runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Summary Runs */
        get: operations["summaries_list_runs"];
        put?: never;
        /** Prepare Summary Run */
        post: operations["summaries_prepare_run"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/summary-runs/{run_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Summary Run */
        get: operations["summaries_get_run"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/summary-runs/{run_id}/editor": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Save Summary Editor */
        patch: operations["summaries_save_review_editor"];
        trace?: never;
    };
    "/api/v1/cases/{case_id}/summary-runs/{run_id}/fact-cards/{card_id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Retry Fact Card */
        post: operations["summaries_retry_fact_card"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/summary-runs/{run_id}/regenerate-incomplete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Regenerate Incomplete */
        post: operations["summaries_regenerate_incomplete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/summary-runs/{run_id}/resume-fact-card-deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Resume Fact Card Deliveries */
        post: operations["summaries_resume_fact_card_deliveries"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/summary-runs/{run_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Decide Summary Review */
        post: operations["summaries_review_decide"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/summary-runs/{run_id}/sources/{finding_id}/{citation_index}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Open Summary Original */
        get: operations["summaries_open_original_source"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/summary-runs/{run_id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Submit Summary Run */
        post: operations["summaries_submit_run"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/summary-source-candidates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Summary Source Candidates */
        get: operations["summaries_list_source_candidates"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/working-documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Working Documents */
        get: operations["working_documents_list_for_case"];
        put?: never;
        /** Create Working Document */
        post: operations["working_documents_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chambers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List My Chambers */
        get: operations["chambers_list_mine"];
        put?: never;
        /** Create Chamber Route */
        post: operations["chambers_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chambers/{chamber_id}/audit-events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Chamber Audit Events */
        get: operations["chambers_list_audit_events"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chambers/{chamber_id}/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Chamber Members */
        get: operations["chambers_list_members"];
        put?: never;
        /** Add Chamber Member */
        post: operations["chambers_add_member"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/chambers/{chamber_id}/members/{membership_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Chamber Member */
        patch: operations["chambers_update_member"];
        trace?: never;
    };
    "/api/v1/chambers/{chamber_id}/provider-policy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Chamber Provider Policy */
        get: operations["chambers_get_provider_policy"];
        /** Replace Chamber Provider Policy */
        put: operations["chambers_replace_provider_policy"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Clients */
        get: operations["clients_list"];
        put?: never;
        /** Create Client */
        post: operations["clients_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/{client_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Client */
        patch: operations["clients_update"];
        trace?: never;
    };
    "/api/v1/dictation/transcriptions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Transcribe one short editor-dictation recording */
        post: operations["dictation_create_transcription"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Document */
        get: operations["documents_get"];
        put?: never;
        post?: never;
        /** Delete Document */
        delete: operations["documents_delete"];
        options?: never;
        head?: never;
        /** Update Document */
        patch: operations["documents_update"];
        trace?: never;
    };
    "/api/v1/documents/{document_id}/confirm-upload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Confirm Upload */
        post: operations["documents_confirm_upload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/extractions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Enqueue Extraction */
        post: operations["documents_enqueue_extraction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/extractions/{job_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Extraction */
        get: operations["documents_get_extraction"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/extractions/{job_id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel Extraction */
        post: operations["documents_cancel_extraction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/multipart/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Complete Multipart Upload */
        post: operations["documents_multipart_complete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/multipart/initiate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Initiate Multipart Upload */
        post: operations["documents_multipart_initiate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/multipart/part-urls": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Multipart Part Urls */
        post: operations["documents_multipart_part_urls"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/multipart/parts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Record Multipart Part */
        put: operations["documents_multipart_record_part"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/summary-source": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Prepare Original Source */
        post: operations["documents_prepare_summary_source"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/summary-source/editor": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Save Source Editor */
        post: operations["documents_save_source_editor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/summary-source/editor-repair": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Repair Source Editor */
        post: operations["documents_repair_source_provenance"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/summary-source/editor-review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Source Editor */
        post: operations["documents_review_source_editor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/summary-source/ocr": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Submit Source Ocr */
        post: operations["documents_source_ocr_submit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/summary-source/ocr-quote": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Quote Source Ocr */
        post: operations["documents_source_ocr_quote"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/summary-source/ocr-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Source Ocr Status */
        get: operations["documents_source_ocr_status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/summary-source/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Original Source */
        post: operations["documents_review_summary_source"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{document_id}/view-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get View Url */
        get: operations["documents_view_url"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/editor-sessions/{session_id}/consume": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Consume Editor Session */
        post: operations["editor_sessions_consume"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/editor-sessions/{session_id}/revisions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Save Editor Session Revision */
        post: operations["editor_sessions_create_revision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/exports/render": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Render versioned Lexical JSON as DOCX or PDF */
        post: operations["exports_render"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/jobs/dummy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Enqueue a dummy background job (S01-07 spike)
         * @description Enqueue a dummy Celery task to prove the queue infrastructure works.
         *
         *     Creates a PostgreSQL job record (queued), fires the Celery task, then
         *     stores the returned celery_task_id back on the record. Caller polls
         *     GET /jobs/{job_id} to track progress.
         *
         *     Upload/save alone never starts a paid operation. This endpoint exists
         *     only for S01-07 integration testing.
         */
        post: operations["jobs_enqueue_dummy"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/jobs/{job_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get background job status (owner-scoped)
         * @description Poll the status of a background job.
         *
         *     Owner-scoped: returns 404 for jobs belonging to other users so resource
         *     existence is not leaked.
         */
        get: operations["jobs_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/matters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Pre Filing Matter */
        post: operations["matters_create_pre_filing"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/matters/{matter_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Matter */
        get: operations["matters_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/matters/{matter_id}/custody-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Items */
        get: operations["custody_list"];
        put?: never;
        /** Create Item */
        post: operations["custody_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/matters/{matter_id}/fee-agreements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Agreement */
        post: operations["fees_create_agreement"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/matters/{matter_id}/fee-agreements/{agreement_id}/entries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Post Entry */
        post: operations["fees_post_entry"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/matters/{matter_id}/fee-ledger": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Ledger */
        get: operations["fees_get_ledger"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/parties/{party_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete party */
        delete: operations["parties_delete"];
        options?: never;
        head?: never;
        /** Update party */
        patch: operations["parties_update"];
        trace?: never;
    };
    "/api/v1/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Advocate Profile */
        get: operations["drafts_get_advocate_profile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Advocate Profile */
        patch: operations["drafts_update_advocate_profile"];
        trace?: never;
    };
    "/api/v1/profile/court-registrations/{court_code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Update Advocate Court Registration */
        put: operations["drafts_update_advocate_court_registration"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Me */
        get: operations["users_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users/me/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Profile */
        patch: operations["users_update_profile"];
        trace?: never;
    };
    "/api/v1/users/munshis": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Munshis */
        get: operations["users_list_munshis"];
        put?: never;
        /** Create Munshi */
        post: operations["users_create_munshi"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users/munshis/{user_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Toggle Munshi */
        patch: operations["users_toggle_munshi"];
        trace?: never;
    };
    "/api/v1/webhooks/resend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Resend Webhook */
        post: operations["auth_resend_webhook"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflow-runs/poc": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Poc Workflow */
        post: operations["workflow_poc_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflow-runs/{run_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Workflow Run */
        get: operations["workflow_run_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflow-runs/{run_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Decide Workflow Review */
        post: operations["workflow_review_decide"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/working-documents/{document_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Working Document */
        get: operations["working_documents_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/working-documents/{document_id}/editor-bootstrap": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Editor Bootstrap */
        post: operations["working_documents_create_editor_bootstrap"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/working-documents/{document_id}/eligibility": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Resolve Working Document Eligibility */
        post: operations["working_documents_resolve_eligibility"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/working-documents/{document_id}/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Enqueue Export */
        post: operations["working_documents_enqueue_export"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/working-documents/{document_id}/exports/{job_id}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download Export */
        get: operations["working_documents_download_export"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/working-documents/{document_id}/revisions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Working Document Revision */
        post: operations["working_documents_create_revision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/working-documents/{document_id}/revisions/{revision_id}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Decide Working Document Revision */
        post: operations["working_documents_decide_revision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/working-documents/{document_id}/revisions/{revision_id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Submit Working Document Revision */
        post: operations["working_documents_submit_revision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health Check */
        get: operations["health_check"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AccessData */
        AccessData: {
            access: components["schemas"]["CaseAccessResponse"];
        };
        /** Actions */
        Actions: {
            /** Actions */
            actions: components["schemas"]["AdvocateAction"][];
        };
        /** AddMemberIn */
        AddMemberIn: {
            role: components["schemas"]["ChamberRole"];
            /**
             * User Id
             * Format: uuid
             */
            user_id: string;
        };
        /** AdvocateAction */
        AdvocateAction: {
            /**
             * Category
             * @enum {string}
             */
            category: "obtain_documents" | "research_judgments" | "verify_grounds" | "finalize_annexures" | "drafting_next_steps";
            /** Instruction */
            instruction: string;
            /** Related Fact Ids */
            related_fact_ids: string[];
        };
        /** AdvocateCourtRegistrationUpdate */
        AdvocateCourtRegistrationUpdate: {
            /** Aor Number */
            aor_number?: string | null;
            /** Enrollment Number */
            enrollment_number?: string | null;
        };
        /** AdvocateProfileResponse */
        AdvocateProfileResponse: {
            /** Chamber Number */
            chamber_number?: string | null;
            /** City */
            city?: string | null;
            /** Court Registrations */
            court_registrations?: {
                [key: string]: {
                    [key: string]: string;
                };
            };
            /** District */
            district?: string | null;
            /** Full Name */
            full_name: string;
            /** Mobile Number */
            mobile_number?: string | null;
            /** Office Address Line1 */
            office_address_line1?: string | null;
            /** Office Address Line2 */
            office_address_line2?: string | null;
            /** State */
            state?: string | null;
        };
        /** AdvocateProfileUpdate */
        AdvocateProfileUpdate: {
            /** Chamber Number */
            chamber_number?: string | null;
            /** City */
            city?: string | null;
            /** District */
            district?: string | null;
            /** Mobile Number */
            mobile_number?: string | null;
            /** Office Address Line1 */
            office_address_line1?: string | null;
            /** Office Address Line2 */
            office_address_line2?: string | null;
            /** State */
            state?: string | null;
        };
        /** Analyses */
        Analyses: {
            /** Observations */
            observations: components["schemas"]["Analysis"][];
        };
        /** Analysis */
        Analysis: {
            /** Basis Fact Ids */
            basis_fact_ids: string[];
            /** Text */
            text: string;
            /**
             * Verification
             * @default requires_verification
             * @constant
             */
            verification: "requires_verification";
        };
        /** AnnexureAssignRequest */
        AnnexureAssignRequest: {
            /**
             * File Version Id
             * Format: uuid
             */
            file_version_id: string;
            /** First Page */
            first_page?: number | null;
            /** Last Page */
            last_page?: number | null;
        };
        /** AnnexureCreateRequest */
        AnnexureCreateRequest: {
            /** Label */
            label: string;
            /** Slot Code */
            slot_code: string;
        };
        /** AuthData */
        AuthData: {
            /** Access Token */
            access_token: string;
            /** Refresh Token */
            refresh_token?: string | null;
            /**
             * Session Id
             * Format: uuid
             */
            session_id: string;
            /**
             * Token Type
             * @constant
             */
            token_type: "bearer";
            user: components["schemas"]["LawyerProfileResponse"];
        };
        /**
         * AuthDeviceType
         * @enum {string}
         */
        AuthDeviceType: "web" | "android" | "ios" | "unknown";
        /**
         * AuthProvider
         * @enum {string}
         */
        AuthProvider: "email" | "google";
        /** AuthorityManifestResponse */
        AuthorityManifestResponse: {
            /** Context Hash */
            context_hash: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Is Stale */
            is_stale: boolean;
            /** References */
            references: {
                [key: string]: unknown;
            }[];
        };
        /** AuthorityPassageRequest */
        AuthorityPassageRequest: {
            /**
             * Authority Version Id
             * Format: uuid
             */
            authority_version_id: string;
            /** End Offset */
            end_offset: number;
            /** Paragraph Label */
            paragraph_label?: string | null;
            /** Start Offset */
            start_offset: number;
        };
        /** AuthorityPassageResponse */
        AuthorityPassageResponse: {
            /**
             * Authority Version Id
             * Format: uuid
             */
            authority_version_id: string;
            /** End Offset */
            end_offset: number;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Locator Valid */
            locator_valid: boolean;
            /** Paragraph Label */
            paragraph_label: string | null;
            /** Start Offset */
            start_offset: number;
            /** Text */
            text: string;
            /** Text Hash */
            text_hash: string;
        };
        /** AuthorityResponse */
        AuthorityResponse: {
            /** Canonical Url */
            canonical_url: string;
            /** Current Version Id */
            current_version_id: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Text */
            text?: string | null;
            /** Upstream Document Id */
            upstream_document_id: number;
        };
        /** AuthorityReviewResponse */
        AuthorityReviewResponse: {
            /** Action */
            action: string;
            /** Decided At */
            decided_at: string | null;
            /** Decided By User Id */
            decided_by_user_id: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Proposition Id
             * Format: uuid
             */
            proposition_id: string;
            /** Treatment Notes */
            treatment_notes: string | null;
            /** Version */
            version: number;
        };
        /**
         * BenchType
         * @enum {string}
         */
        BenchType: "single_bench" | "division_bench" | "full_bench";
        /** Body_dictation_create_transcription */
        Body_dictation_create_transcription: {
            /**
             * Audio
             * @description Audio recording under 30 seconds
             */
            audio: string;
            /**
             * Client Request Id
             * Format: uuid
             */
            client_request_id: string;
            /** @default hi-IN */
            language_code: components["schemas"]["DictationLanguage"];
            /** @default codemix */
            mode: components["schemas"]["DictationMode"];
        };
        /** CaseAccessGrantRequest */
        CaseAccessGrantRequest: {
            /**
             * Can Edit
             * @default true
             */
            can_edit: boolean;
            /**
             * User Id
             * Format: uuid
             */
            user_id: string;
        };
        /** CaseAccessResponse */
        CaseAccessResponse: {
            /** Can Edit */
            can_edit: boolean;
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Granted By
             * Format: uuid
             */
            granted_by: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * User Id
             * Format: uuid
             */
            user_id: string;
        };
        /** CaseCreateRequest */
        CaseCreateRequest: {
            /** Act Name */
            act_name?: string | null;
            /** Bail Rejection Date */
            bail_rejection_date?: string | null;
            /** @default single_bench */
            bench_type: components["schemas"]["BenchType"];
            /** Brief Facts */
            brief_facts?: string | null;
            /** Case Numbers */
            case_numbers?: components["schemas"]["CaseNumberCreateRequest"][];
            /** Case Title */
            case_title: string;
            case_type: components["schemas"]["CaseType"];
            /** Court Number */
            court_number?: string | null;
            /** Filing Date */
            filing_date?: string | null;
            /** Limitation Expiry Date */
            limitation_expiry_date?: string | null;
            /** Lower Court Decision Date */
            lower_court_decision_date?: string | null;
            /** Next Hearing Date */
            next_hearing_date?: string | null;
            /** Notes */
            notes?: string | null;
            /** Parties */
            parties?: components["schemas"]["PartyCreateRequest"][];
            /** Petitioner Name */
            petitioner_name: string;
            /**
             * Respondent Name
             * @default State
             */
            respondent_name: string;
            /** Sections */
            sections?: components["schemas"]["CaseSectionCreateRequest"][];
        };
        /** CaseData */
        CaseData: {
            case: components["schemas"]["CaseDetailResponse"];
        };
        /** CaseDetailResponse */
        CaseDetailResponse: {
            /** Act Name */
            act_name: string | null;
            /** Bail Rejection Date */
            bail_rejection_date: string | null;
            bench_type: components["schemas"]["BenchType"];
            /** Brief Facts */
            brief_facts: string | null;
            /** Case Numbers */
            case_numbers?: components["schemas"]["CaseNumberResponse"][];
            /** Case Title */
            case_title: string;
            case_type: components["schemas"]["CaseType"];
            /** Court Number */
            court_number: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Filing Date */
            filing_date: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Lawyer Id
             * Format: uuid
             */
            lawyer_id: string;
            /** Limitation Expiry Date */
            limitation_expiry_date: string | null;
            /** Lower Court Decision Date */
            lower_court_decision_date: string | null;
            /**
             * Matter Id
             * Format: uuid
             */
            matter_id: string;
            matter_phase: components["schemas"]["MatterPhase"];
            /** Matter Title */
            matter_title: string;
            /** Next Hearing Date */
            next_hearing_date: string | null;
            /** Notes */
            notes: string | null;
            /** Parties */
            parties?: components["schemas"]["PartyResponse"][];
            /** Petitioner Name */
            petitioner_name: string | null;
            /** Respondent Name */
            respondent_name: string | null;
            /** Sections */
            sections?: components["schemas"]["CaseSectionResponse"][];
            stage: components["schemas"]["CaseStage"];
            status: components["schemas"]["CaseStatus"];
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** CaseNumberCreateRequest */
        CaseNumberCreateRequest: {
            /** Case Number */
            case_number: string;
            /** Court Name */
            court_name?: string | null;
            /**
             * Is Primary
             * @default false
             */
            is_primary: boolean;
            /** Notes */
            notes?: string | null;
            number_type: components["schemas"]["CaseNumberType"];
            /** Year */
            year?: number | null;
        };
        /** CaseNumberData */
        CaseNumberData: {
            case_number: components["schemas"]["CaseNumberResponse"];
        };
        /** CaseNumberResponse */
        CaseNumberResponse: {
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /** Case Number */
            case_number: string;
            /** Court Name */
            court_name: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Is Primary */
            is_primary: boolean;
            /** Notes */
            notes: string | null;
            number_type: components["schemas"]["CaseNumberType"];
            /** Year */
            year: number | null;
        };
        /**
         * CaseNumberType
         * @enum {string}
         */
        CaseNumberType: "lower_court" | "high_court" | "supreme_court" | "connected_matter" | "other";
        /** CaseNumberUpdateRequest */
        CaseNumberUpdateRequest: {
            /** Case Number */
            case_number?: string | null;
            /** Court Name */
            court_name?: string | null;
            /** Is Primary */
            is_primary?: boolean | null;
            /** Notes */
            notes?: string | null;
            number_type?: components["schemas"]["CaseNumberType"] | null;
            /** Year */
            year?: number | null;
        };
        /** CaseResponse */
        CaseResponse: {
            /** Act Name */
            act_name: string | null;
            /** Bail Rejection Date */
            bail_rejection_date: string | null;
            bench_type: components["schemas"]["BenchType"];
            /** Brief Facts */
            brief_facts: string | null;
            /** Case Title */
            case_title: string;
            case_type: components["schemas"]["CaseType"];
            /** Court Number */
            court_number: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Filing Date */
            filing_date: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Lawyer Id
             * Format: uuid
             */
            lawyer_id: string;
            /** Limitation Expiry Date */
            limitation_expiry_date: string | null;
            /** Lower Court Decision Date */
            lower_court_decision_date: string | null;
            /**
             * Matter Id
             * Format: uuid
             */
            matter_id: string;
            matter_phase: components["schemas"]["MatterPhase"];
            /** Matter Title */
            matter_title: string;
            /** Next Hearing Date */
            next_hearing_date: string | null;
            /** Notes */
            notes: string | null;
            /** Petitioner Name */
            petitioner_name: string | null;
            /** Respondent Name */
            respondent_name: string | null;
            stage: components["schemas"]["CaseStage"];
            status: components["schemas"]["CaseStatus"];
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** CaseSectionCreateRequest */
        CaseSectionCreateRequest: {
            /** Act Name */
            act_name: string;
            /** Notes */
            notes?: string | null;
            /** Section */
            section: string;
        };
        /** CaseSectionResponse */
        CaseSectionResponse: {
            /** Act Name */
            act_name: string;
            /**
             * Added At
             * Format: date-time
             */
            added_at: string;
            /**
             * Added By
             * Format: uuid
             */
            added_by: string;
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Is Active */
            is_active: boolean;
            /** Notes */
            notes: string | null;
            /** Removed At */
            removed_at: string | null;
            /** Removed By */
            removed_by: string | null;
            /** Section */
            section: string;
        };
        /**
         * CaseStage
         * @enum {string}
         */
        CaseStage: "filing" | "admission" | "notice" | "counter_affidavit" | "rejoinder" | "arguments" | "judgment" | "disposed" | "transferred";
        /**
         * CaseStatus
         * @enum {string}
         */
        CaseStatus: "active" | "disposed" | "archived";
        /**
         * CaseSummaryPayload
         * @description Provider output. It remains unreviewed until a lawyer accepts it.
         */
        CaseSummaryPayload: {
            /** Output Language */
            output_language: string;
            /** Sections */
            sections: components["schemas"]["SummarySection"][];
            /** Uncertainties */
            uncertainties?: string[];
        };
        /**
         * CaseType
         * @enum {string}
         */
        CaseType: "writ_petition" | "pil" | "criminal_revision" | "criminal_appeal" | "bail_application" | "anticipatory_bail" | "quashing" | "civil_revision" | "first_appeal" | "second_appeal" | "contempt" | "other";
        /** CaseUpdateRequest */
        CaseUpdateRequest: {
            /** Act Name */
            act_name?: string | null;
            /** Bail Rejection Date */
            bail_rejection_date?: string | null;
            bench_type?: components["schemas"]["BenchType"] | null;
            /** Brief Facts */
            brief_facts?: string | null;
            /** Case Title */
            case_title?: string | null;
            case_type?: components["schemas"]["CaseType"] | null;
            /** Court Number */
            court_number?: string | null;
            /** Filing Date */
            filing_date?: string | null;
            /** Limitation Expiry Date */
            limitation_expiry_date?: string | null;
            /** Lower Court Decision Date */
            lower_court_decision_date?: string | null;
            /** Next Hearing Date */
            next_hearing_date?: string | null;
            /** Notes */
            notes?: string | null;
            /** Petitioner Name */
            petitioner_name?: string | null;
            /** Respondent Name */
            respondent_name?: string | null;
            stage?: components["schemas"]["CaseStage"] | null;
            status?: components["schemas"]["CaseStatus"] | null;
        };
        /** CasesData */
        CasesData: {
            /** Cases */
            cases: components["schemas"]["CaseResponse"][];
            pagination: components["schemas"]["PaginationMeta"];
        };
        /** ChamberAuditEventOut */
        ChamberAuditEventOut: {
            /**
             * Actor User Id
             * Format: uuid
             */
            actor_user_id: string;
            /**
             * Chamber Id
             * Format: uuid
             */
            chamber_id: string;
            event_type: components["schemas"]["ChamberAuditEventType"];
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Metadata Json */
            metadata_json: {
                [key: string]: unknown;
            };
            /**
             * Occurred At
             * Format: date-time
             */
            occurred_at: string;
            /**
             * Resource Id
             * Format: uuid
             */
            resource_id: string;
            /** Resource Type */
            resource_type: string;
            /** Subject User Id */
            subject_user_id: string | null;
        };
        /**
         * ChamberAuditEventType
         * @enum {string}
         */
        ChamberAuditEventType: "chamber.created" | "membership.added" | "membership.role_changed" | "membership.revoked" | "case_access.granted" | "case_access.revoked" | "case.archived" | "case.soft_deleted" | "draft.download";
        /** ChamberProviderPolicyIn */
        ChamberProviderPolicyIn: {
            /** Allowed Collection Ids */
            allowed_collection_ids?: string[];
            capabilities?: components["schemas"]["PolicyCapabilitiesIn"];
            /**
             * External Processing Allowed
             * @default false
             */
            external_processing_allowed: boolean;
            /** Permitted Data Classes */
            permitted_data_classes?: components["schemas"]["ProviderDataClass"][];
            /** Task Policies */
            task_policies?: components["schemas"]["ProviderTaskPolicyIn"][];
        };
        /** ChamberProviderPolicyOut */
        ChamberProviderPolicyOut: {
            /** Allowed Collection Ids */
            allowed_collection_ids: string[];
            capabilities: components["schemas"]["PolicyCapabilityOut"];
            /** Created At */
            created_at: string | null;
            /** Created By User Id */
            created_by_user_id: string | null;
            /** External Processing Allowed */
            external_processing_allowed: boolean;
            /** Id */
            id: string | null;
            /** Permitted Data Classes */
            permitted_data_classes: components["schemas"]["ProviderDataClass"][];
            /** Task Policies */
            task_policies: components["schemas"]["ProviderTaskPolicyOut"][];
            /** Version */
            version: number;
        };
        /**
         * ChamberRole
         * @enum {string}
         */
        ChamberRole: "owner" | "admin" | "staff" | "reviewer";
        /** ChamberWithMembershipOut */
        ChamberWithMembershipOut: {
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            membership: components["schemas"]["MembershipOut"];
            /** Name */
            name: string;
            /**
             * Owner User Id
             * Format: uuid
             */
            owner_user_id: string;
            /** Slug */
            slug: string;
        };
        /** ChangePasswordRequest */
        ChangePasswordRequest: {
            /** Current Password */
            current_password: string;
            /** New Password */
            new_password: string;
        };
        /** CitationV2 */
        CitationV2: {
            /** Document Id */
            document_id: string;
            /** File Version Id */
            file_version_id: string;
            /** Page Number */
            page_number: number;
            /** Source Paths */
            source_paths: string[];
            /** Source Revision Id */
            source_revision_id: string;
        };
        /** ClientCaseLinkCreateIn */
        ClientCaseLinkCreateIn: {
            /**
             * Client Id
             * Format: uuid
             */
            client_id: string;
            /** @default client */
            role: components["schemas"]["ClientCaseRole"];
        };
        /** ClientCaseLinkOut */
        ClientCaseLinkOut: {
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            client: components["schemas"]["ClientOut"];
            /**
             * Client Id
             * Format: uuid
             */
            client_id: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Linked At
             * Format: date-time
             */
            linked_at: string;
            /**
             * Linked By User Id
             * Format: uuid
             */
            linked_by_user_id: string;
            role: components["schemas"]["ClientCaseRole"];
        };
        /**
         * ClientCaseRole
         * @enum {string}
         */
        ClientCaseRole: "client" | "co_client" | "representative" | "billing_contact";
        /** ClientCreateIn */
        ClientCreateIn: {
            /** Address */
            address?: string | null;
            /** Email */
            email?: string | null;
            /** Full Name */
            full_name: string;
            /** Notes */
            notes?: string | null;
            /** Phone */
            phone?: string | null;
        };
        /** ClientOut */
        ClientOut: {
            /** Address */
            address: string | null;
            /**
             * Chamber Id
             * Format: uuid
             */
            chamber_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Created By User Id
             * Format: uuid
             */
            created_by_user_id: string;
            /** Email */
            email: string | null;
            /** Full Name */
            full_name: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Notes */
            notes: string | null;
            /** Phone */
            phone: string | null;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** ClientUpdateIn */
        ClientUpdateIn: {
            /** Address */
            address?: string | null;
            /** Email */
            email?: string | null;
            /** Full Name */
            full_name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Phone */
            phone?: string | null;
        };
        /** ConfirmUploadRequest */
        ConfirmUploadRequest: Record<string, never>;
        /** ConfirmUploadResponse */
        ConfirmUploadResponse: {
            document: components["schemas"]["DocumentResponse"];
        };
        /** ConfirmedFindingSelection */
        ConfirmedFindingSelection: {
            /** Finding Id */
            finding_id?: string | null;
            /** Finding Index */
            finding_index?: number | null;
            section?: components["schemas"]["SummarySectionName"] | null;
        };
        /** Contradiction */
        Contradiction: {
            /** Competing Fact Ids */
            competing_fact_ids: string[];
            observation: components["schemas"]["Analysis"];
            /**
             * Resolution
             * @default unresolved
             * @constant
             */
            resolution: "unresolved";
        };
        /** Contradictions */
        Contradictions: {
            /** Conflicts */
            conflicts: components["schemas"]["Contradiction"][];
        };
        /** CourtDraftEditorResponse */
        CourtDraftEditorResponse: {
            /**
             * Working Document Id
             * Format: uuid
             */
            working_document_id: string;
        };
        /** CourtDraftExportResponse */
        CourtDraftExportResponse: {
            /** Artifact Ready */
            artifact_ready: boolean;
            /**
             * Draft Id
             * Format: uuid
             */
            draft_id: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Status */
            status: string;
        };
        /** CourtDraftGenerationResponse */
        CourtDraftGenerationResponse: {
            /**
             * Draft Id
             * Format: uuid
             */
            draft_id: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Status */
            status: string;
        };
        /** CourtDraftResponse */
        CourtDraftResponse: {
            /** Blueprint Code */
            blueprint_code: string;
            /** Blueprint Version */
            blueprint_version: number;
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /** Compliance Report */
            compliance_report: {
                [key: string]: unknown;
            } | null;
            /** Content */
            content: {
                [key: string]: unknown;
            };
            /** Content Hash */
            content_hash: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Draft Type */
            draft_type: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Model */
            model: string | null;
            /** Prompt Version */
            prompt_version: string;
            /** Rule Snapshot */
            rule_snapshot: {
                [key: string]: unknown;
            };
            /** Source Summary Hash */
            source_summary_hash: string;
            /** Stale Reason */
            stale_reason: string | null;
            /** Status */
            status: string;
            /**
             * Summary Run Id
             * Format: uuid
             */
            summary_run_id: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /** Version */
            version: number;
            /** Working Document Id */
            working_document_id: string | null;
        };
        /** CreateAuthorityManifestRequest */
        CreateAuthorityManifestRequest: {
            /** Review Ids */
            review_ids: string[];
        };
        /** CreateChamberIn */
        CreateChamberIn: {
            /** Name */
            name: string;
            /** Slug */
            slug: string;
        };
        /** CreateCourtDraftRequest */
        CreateCourtDraftRequest: {
            /** Advocate */
            advocate?: {
                [key: string]: unknown;
            };
            /**
             * Affidavit Mode
             * @default separate
             * @constant
             */
            affidavit_mode: "separate";
            /** Annexures */
            annexures?: {
                [key: string]: unknown;
            }[];
            /** Applicants */
            applicants?: {
                [key: string]: unknown;
            }[];
            /**
             * Bench Code
             * @default allahabad
             * @enum {string}
             */
            bench_code: "allahabad" | "lucknow";
            /** Case */
            case?: {
                [key: string]: unknown;
            };
            /**
             * Case Specific Affidavit Paragraphs
             * @default
             */
            case_specific_affidavit_paragraphs: string;
            /**
             * Court Code
             * @default allahabad_hc
             * @constant
             */
            court_code: "allahabad_hc";
            /** Deponents */
            deponents?: {
                [key: string]: unknown;
            }[];
            /**
             * Draft Type
             * @constant
             */
            draft_type: "regular_bail_483_bnss";
            /** Expected Summary Hash */
            expected_summary_hash: string;
            /**
             * Filing Mode
             * @default efiling
             * @enum {string}
             */
            filing_mode: "physical" | "efiling";
            /**
             * Pleading Language
             * @default en
             * @enum {string}
             */
            pleading_language: "en" | "mixed";
            /**
             * Summary Run Id
             * Format: uuid
             */
            summary_run_id: string;
            /** Verification */
            verification?: {
                [key: string]: unknown;
            };
        };
        /** CreateMunshiRequest */
        CreateMunshiRequest: {
            /**
             * Email
             * Format: email
             */
            email: string;
            /** Full Name */
            full_name: string;
            /** Mobile Number */
            mobile_number?: string | null;
            /** Password */
            password: string;
        };
        /** CreatePocWorkflowIn */
        CreatePocWorkflowIn: {
            /** Idempotency Key */
            idempotency_key: string;
            /** Input Manifest Hash */
            input_manifest_hash: string;
        };
        /** CreatePropositionRequest */
        CreatePropositionRequest: {
            /**
             * Authority Version Id
             * Format: uuid
             */
            authority_version_id: string;
            /**
             * Passage Id
             * Format: uuid
             */
            passage_id: string;
            /** Text */
            text: string;
        };
        /** CreateResearchRunRequest */
        CreateResearchRunRequest: {
            /**
             * Budget Paise
             * @default 50
             */
            budget_paise: number;
            /** Idempotency Key */
            idempotency_key: string;
            /** Query */
            query: string;
        };
        /** CreateRevisionRequest */
        CreateRevisionRequest: {
            /**
             * Client Mutation Id
             * Format: uuid
             */
            client_mutation_id: string;
            /** Editor Document */
            editor_document: {
                [key: string]: unknown;
            };
            /** Expected Revision Number */
            expected_revision_number: number;
        };
        /** CreateWorkingDocumentRequest */
        CreateWorkingDocumentRequest: {
            /**
             * Document Kind
             * @default typed_document
             */
            document_kind: string;
            /** Editor Document */
            editor_document: {
                [key: string]: unknown;
            };
            /** Title */
            title: string;
        };
        /** CustodyIn */
        CustodyIn: {
            /** Description */
            description: string;
            kind: components["schemas"]["CustodyKind"];
            /** Physical Location */
            physical_location: string;
        };
        /**
         * CustodyKind
         * @enum {string}
         */
        CustodyKind: "original" | "copy";
        /** CustodyOut */
        CustodyOut: {
            /** Description */
            description: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            kind: components["schemas"]["CustodyKind"];
            /**
             * Matter Id
             * Format: uuid
             */
            matter_id: string;
            /** Physical Location */
            physical_location: string;
            /**
             * Recorded At
             * Format: date-time
             */
            recorded_at: string;
            /**
             * Recorded By User Id
             * Format: uuid
             */
            recorded_by_user_id: string;
        };
        /** DecideAuthorityReviewRequest */
        DecideAuthorityReviewRequest: {
            /**
             * Action
             * @enum {string}
             */
            action: "approved" | "rejected" | "changes_requested" | "revoked";
            /** Expected Version */
            expected_version: number;
            /** Treatment Notes */
            treatment_notes?: string | null;
        };
        /** DecideRevisionRequest */
        DecideRevisionRequest: {
            action: components["schemas"]["RevisionDecisionAction"];
            /** Comment */
            comment?: string | null;
            /** Expected Content Sha256 */
            expected_content_sha256: string;
        };
        /** DecideSummaryReviewRequest */
        DecideSummaryReviewRequest: {
            /**
             * Acknowledge Incomplete
             * @default false
             */
            acknowledge_incomplete: boolean;
            /**
             * Action
             * @enum {string}
             */
            action: "approve" | "request_changes";
            /** Comment */
            comment?: string | null;
            /** Expected Result Hash */
            expected_result_hash: string;
            /** Expected Review Version */
            expected_review_version: number;
        };
        /** DecideWorkflowReviewIn */
        DecideWorkflowReviewIn: {
            /** Approved */
            approved: boolean;
            /** Expected Version */
            expected_version: number;
            /** Idempotency Key */
            idempotency_key: string;
        };
        /**
         * Designation
         * @enum {string}
         */
        Designation: "advocate" | "aor" | "senior_advocate";
        /**
         * DictationLanguage
         * @enum {string}
         */
        DictationLanguage: "hi-IN" | "en-IN" | "unknown";
        /**
         * DictationMode
         * @enum {string}
         */
        DictationMode: "codemix" | "transcribe";
        /** DictationTranscription */
        DictationTranscription: {
            /**
             * Client Request Id
             * Format: uuid
             */
            client_request_id: string;
            /** Language Code */
            language_code: string | null;
            /** Latency Ms */
            latency_ms: number;
            /** Model */
            model: string;
            /** Provider */
            provider: string;
            /** Provider Request Id */
            provider_request_id: string | null;
            /** Transcript */
            transcript: string;
        };
        /** DocumentResponse */
        DocumentResponse: {
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Display Name */
            display_name: string | null;
            document_type: components["schemas"]["DocumentType"];
            /** File Size Bytes */
            file_size_bytes: number;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Mime Type */
            mime_type: string;
            /** Original Filename */
            original_filename: string;
            /** R2 Bucket */
            r2_bucket: string;
            /** R2 Key */
            r2_key: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            upload_status: components["schemas"]["UploadStatus"];
            /**
             * Uploaded By
             * Format: uuid
             */
            uploaded_by: string;
        };
        /**
         * DocumentType
         * @enum {string}
         */
        DocumentType: "fir" | "chargesheet" | "summon" | "bail_rejection_order" | "bail_order" | "affidavit" | "counter_affidavit" | "rejoinder" | "vakalatnama" | "judgment" | "court_order" | "other";
        /** DocumentsData */
        DocumentsData: {
            /** Documents */
            documents: components["schemas"]["DocumentResponse"][];
        };
        /**
         * DraftField
         * @enum {string}
         */
        DraftField: "parties" | "case_identification" | "impugned_order" | "procedural_history" | "material_facts";
        /** DraftGenerationRequest */
        DraftGenerationRequest: {
            /** Expected Manifest Sha256 */
            expected_manifest_sha256: string;
            /** Fact Bindings */
            fact_bindings?: {
                [key: string]: string[];
            };
            /** Requested Relief */
            requested_relief: string;
        };
        /** DraftParagraphEdit */
        DraftParagraphEdit: {
            /** Component Code */
            component_code: string;
            /** Paragraph Index */
            paragraph_index: number;
            /** Text */
            text: string;
        };
        /** DraftPreflightRequest */
        DraftPreflightRequest: {
            /** Expected Manifest Sha256 */
            expected_manifest_sha256: string;
            /** Fact Bindings */
            fact_bindings?: {
                [key: string]: string[];
            };
        };
        /** DraftPreflightResponse */
        DraftPreflightResponse: {
            /** Bound Fact Ids */
            bound_fact_ids: {
                [key: string]: string[];
            };
            /** Context Sha256 */
            context_sha256: string;
            /**
             * Contract Version
             * @default s528-input-coverage/v1
             */
            contract_version: string;
            /**
             * Generation Available
             * @default false
             */
            generation_available: boolean;
            /** Missing Fields */
            missing_fields: components["schemas"]["DraftField"][];
            /** Reference Coverage Complete */
            reference_coverage_complete: boolean;
            /** Required Fields */
            required_fields: components["schemas"]["DraftField"][];
            /** Warnings */
            warnings: string[];
        };
        /** DraftQuoteResponse */
        DraftQuoteResponse: {
            /** Estimated Reservation Paise */
            estimated_reservation_paise: number;
            /** Model */
            model: string;
            /** Quote Hash */
            quote_hash: string;
        };
        /** EditorBootstrapResponse */
        EditorBootstrapResponse: {
            /**
             * Expires At
             * Format: date-time
             */
            expires_at: string;
            /**
             * Session Id
             * Format: uuid
             */
            session_id: string;
            /** Token */
            token: string;
        };
        /** EditorSessionConsumeRequest */
        EditorSessionConsumeRequest: {
            /** Token */
            token: string;
        };
        /** EditorSessionRevisionRequest */
        EditorSessionRevisionRequest: {
            /**
             * Client Mutation Id
             * Format: uuid
             */
            client_mutation_id: string;
            /** Editor Document */
            editor_document: {
                [key: string]: unknown;
            };
            /** Expected Revision Number */
            expected_revision_number: number;
        };
        /** EligibilityResponse */
        EligibilityResponse: {
            /** Eligible */
            eligible: boolean;
            /** Reasons */
            reasons: string[];
            /** Revision Hash */
            revision_hash: string | null;
            /** Revision Id */
            revision_id: string | null;
        };
        /** EmailRequest */
        EmailRequest: {
            /**
             * Email
             * Format: email
             */
            email: string;
        };
        /** EmptyData */
        EmptyData: Record<string, never>;
        /** EnqueueCourtDraftExportRequest */
        EnqueueCourtDraftExportRequest: {
            /**
             * Acknowledge Compliance Warnings
             * @default false
             */
            acknowledge_compliance_warnings: boolean;
            /** Expected Content Hash */
            expected_content_hash: string;
            /** Idempotency Key */
            idempotency_key: string;
        };
        /**
         * EnqueueDummyJobIn
         * @description Request body for POST /jobs/dummy (S01-07 spike).
         */
        EnqueueDummyJobIn: {
            /** Idempotency Key */
            idempotency_key: string;
            /** Label */
            label: string;
        };
        /** EnqueueExtractionRequest */
        EnqueueExtractionRequest: {
            /** Idempotency Key */
            idempotency_key: string;
        };
        /** EnqueueRevisionExportRequest */
        EnqueueRevisionExportRequest: {
            /** Expected Content Sha256 */
            expected_content_sha256: string;
            /** Idempotency Key */
            idempotency_key: string;
            /** Output Format */
            output_format: string;
            /**
             * Revision Id
             * Format: uuid
             */
            revision_id: string;
        };
        /** ErrorDetail */
        ErrorDetail: {
            /** Code */
            code: string;
            /** Details */
            details: {
                [key: string]: unknown;
            };
            /** Message */
            message: string;
        };
        /** ErrorResponse */
        ErrorResponse: {
            error: components["schemas"]["ErrorDetail"];
            /**
             * Success
             * @constant
             */
            success: false;
        };
        /** EventDate */
        EventDate: {
            /** Normalized Date */
            normalized_date: string | null;
            /**
             * Precision
             * @enum {string}
             */
            precision: "exact" | "range" | "month" | "year" | "relative" | "unknown";
            /** Source Wording */
            source_wording: string;
            /** Time */
            time: string | null;
        };
        /** Evidence */
        Evidence: {
            /** Allegation Evidence Defence Matrix */
            allegation_evidence_defence_matrix: components["schemas"]["MatrixRow"][];
            materials: components["schemas"]["FactGroup"];
            /** Observations */
            observations: components["schemas"]["Analysis"][];
        };
        /** ExecutiveSummary */
        ExecutiveSummary: {
            /** Sentences */
            sentences: components["schemas"]["Fact"][];
        };
        /** ExportJobResponse */
        ExportJobResponse: {
            /**
             * Artifact Ready
             * @default false
             */
            artifact_ready: boolean;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Output Format */
            output_format: string;
            /**
             * Revision Id
             * Format: uuid
             */
            revision_id: string;
            /** Status */
            status: string;
        };
        /** ExtractionJobResponse */
        ExtractionJobResponse: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Manifest Digest */
            manifest_digest: string;
            /** Route */
            route: string;
            /** Status */
            status: string;
        };
        /** ExtractionJobStatusResponse */
        ExtractionJobStatusResponse: {
            /** Attempt Count */
            attempt_count: number;
            /** Error Message */
            error_message: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Route */
            route: string;
            /** Status */
            status: string;
        };
        /** Fact */
        Fact: {
            /** Citations */
            citations: components["schemas"]["CitationV2"][];
            /** Id */
            id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "alleged" | "documented" | "disputed" | "unclear" | "applicant_statement" | "judicial_finding" | "record_provision";
            /** Text */
            text: string;
        };
        /** FactCardCoverageResponse */
        FactCardCoverageResponse: {
            /** Card Id */
            card_id?: string | null;
            content?: components["schemas"]["CaseSummaryPayload"] | null;
            /** Document Id */
            document_id: string | null;
            /** Eligible */
            eligible: boolean;
            /** Error Code */
            error_code?: string | null;
            /** Revision Id */
            revision_id: string | null;
            /** Revision Sha256 */
            revision_sha256?: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "not_ready" | "not_processed" | "pending" | "running" | "ready" | "failed" | "blocked";
            /** Title */
            title: string;
        };
        /** FactGroup */
        FactGroup: {
            /**
             * Availability
             * @enum {string}
             */
            availability: "available" | "not_available" | "not_applicable" | "unreadable";
            /** Findings */
            findings: components["schemas"]["Fact"][];
        };
        /** FeeAgreementIn */
        FeeAgreementIn: {
            /** Agreed Amount Paise */
            agreed_amount_paise: number;
        };
        /** FeeAgreementOut */
        FeeAgreementOut: {
            /** Agreed Amount Paise */
            agreed_amount_paise: number;
            /**
             * Chamber Id
             * Format: uuid
             */
            chamber_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Currency */
            currency: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Matter Id
             * Format: uuid
             */
            matter_id: string;
        };
        /** FeeEntryIn */
        FeeEntryIn: {
            /** Amount Paise */
            amount_paise: number;
            entry_type: components["schemas"]["FeeEntryType"];
            /** Idempotency Key */
            idempotency_key: string;
            /** Reverses Entry Id */
            reverses_entry_id?: string | null;
        };
        /** FeeEntryOut */
        FeeEntryOut: {
            /**
             * Agreement Id
             * Format: uuid
             */
            agreement_id: string;
            /** Amount Paise */
            amount_paise: number;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            entry_type: components["schemas"]["FeeEntryType"];
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Matter Id
             * Format: uuid
             */
            matter_id: string;
            /** Reverses Entry Id */
            reverses_entry_id: string | null;
        };
        /**
         * FeeEntryType
         * @enum {string}
         */
        FeeEntryType: "payment" | "refund" | "expense" | "reversal";
        /** FeeLedgerOut */
        FeeLedgerOut: {
            agreement: components["schemas"]["FeeAgreementOut"];
            /** Collected Paise */
            collected_paise: number;
            /** Entries */
            entries: components["schemas"]["FeeEntryOut"][];
            /** Outstanding Paise */
            outstanding_paise: number;
        };
        /** FetchAuthorityRequest */
        FetchAuthorityRequest: {
            /**
             * Include Fragment
             * @default true
             */
            include_fragment: boolean;
            /**
             * Run Id
             * Format: uuid
             */
            run_id: string;
        };
        /**
         * FileOrigin
         * @description How an original entered VakilSuite; it is provenance, not approval.
         * @enum {string}
         */
        FileOrigin: "unknown" | "web_upload" | "web_camera" | "android_scan" | "android_import" | "legacy";
        /**
         * FindingType
         * @enum {string}
         */
        FindingType: "allegation" | "stated_fact" | "finding" | "legal_provision" | "witness_statement" | "medical_forensic" | "documentary_evidence" | "procedural_history" | "contradiction" | "evidence_gap" | "potential_defence_point" | "potential_prosecution_point" | "missing_information" | "review_checklist";
        /** GoogleLoginRequest */
        GoogleLoginRequest: {
            /** Device Id */
            device_id?: string | null;
            /** Device Name */
            device_name?: string | null;
            device_type?: components["schemas"]["AuthDeviceType"] | null;
            /** Id Token */
            id_token: string;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** HealthResponse */
        HealthResponse: {
            /**
             * Status
             * @constant
             */
            status: "ok";
        };
        /** JobOut */
        JobOut: {
            /** Attempt Count */
            attempt_count: number;
            /** Case Id */
            case_id: string | null;
            /** Completed At */
            completed_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Error Message */
            error_message: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Job Type */
            job_type: string;
            /** Max Attempts */
            max_attempts: number;
            /**
             * Queued At
             * Format: date-time
             */
            queued_at: string;
            /** Result Summary */
            result_summary: {
                [key: string]: unknown;
            } | null;
            /** Started At */
            started_at: string | null;
            status: components["schemas"]["JobStatus"];
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /**
         * JobStatus
         * @enum {string}
         */
        JobStatus: "queued" | "running" | "succeeded" | "failed" | "cancelled";
        /** LawyerProfileResponse */
        LawyerProfileResponse: {
            /** Alternate Mobile */
            alternate_mobile?: string | null;
            auth_provider: components["schemas"]["AuthProvider"];
            /** Chamber Number */
            chamber_number?: string | null;
            /** City */
            city?: string | null;
            /** Court Name */
            court_name?: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Default District */
            default_district?: string | null;
            designation?: components["schemas"]["Designation"] | null;
            /** District */
            district?: string | null;
            /**
             * Email
             * Format: email
             */
            email: string;
            /** Enrollment Number */
            enrollment_number?: string | null;
            /** Full Name */
            full_name: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Is Active */
            is_active: boolean;
            /** Is Email Verified */
            is_email_verified: boolean;
            /** Is Profile Complete */
            is_profile_complete: boolean;
            /** Last Login At */
            last_login_at?: string | null;
            /** Mobile Number */
            mobile_number?: string | null;
            /** Office Address Line1 */
            office_address_line1?: string | null;
            /** Office Address Line2 */
            office_address_line2?: string | null;
            role: components["schemas"]["UserRole"];
            /** State */
            state?: string | null;
        };
        /** LawyerProfileUpdate */
        LawyerProfileUpdate: {
            /** Alternate Mobile */
            alternate_mobile?: string | null;
            /** Chamber Number */
            chamber_number?: string | null;
            /** City */
            city?: string | null;
            /** Court Name */
            court_name?: string | null;
            /** Default District */
            default_district?: string | null;
            designation?: components["schemas"]["Designation"] | null;
            /** District */
            district?: string | null;
            /** Enrollment Number */
            enrollment_number?: string | null;
            /** Full Name */
            full_name?: string | null;
            /** Mobile Number */
            mobile_number?: string | null;
            /** Office Address Line1 */
            office_address_line1?: string | null;
            /** Office Address Line2 */
            office_address_line2?: string | null;
            /** State */
            state?: string | null;
        };
        /** LegalResearchConfigResponse */
        LegalResearchConfigResponse: {
            /**
             * Attribution Required
             * @default true
             */
            attribution_required: boolean;
            /** Available */
            available: boolean;
            /** Max Search Pages */
            max_search_pages: number;
            /** Max Selected Authorities */
            max_selected_authorities: number;
            /** Rate Card Version */
            rate_card_version: string;
            /** Reason */
            reason?: string | null;
        };
        /** LegalResearchRunResponse */
        LegalResearchRunResponse: {
            /** Budget Paise */
            budget_paise: number;
            /** Error Code */
            error_code: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Query */
            query: string;
            /** Reserved Paise */
            reserved_paise: number;
            /** Results */
            results?: {
                [key: string]: unknown;
            }[];
            /** Spent Estimate Paise */
            spent_estimate_paise: number;
            /** Status */
            status: string;
        };
        /** LoginRequest */
        LoginRequest: {
            /** Device Id */
            device_id?: string | null;
            /** Device Name */
            device_name?: string | null;
            device_type?: components["schemas"]["AuthDeviceType"] | null;
            /**
             * Email
             * Format: email
             */
            email: string;
            /** Password */
            password: string;
        };
        /** LogoutRequest */
        LogoutRequest: {
            /** Refresh Token */
            refresh_token?: string | null;
        };
        /** MatrixRow */
        MatrixRow: {
            /** Allegation Fact Id */
            allegation_fact_id: string;
            /** Defence Fact Ids */
            defence_fact_ids: string[];
            defence_observation: components["schemas"]["Analysis"] | null;
            /** Research Required */
            research_required: string;
            /** Supporting Fact Ids */
            supporting_fact_ids: string[];
        };
        /** MatterCreateRequest */
        MatterCreateRequest: {
            /** Matter Title */
            matter_title: string;
            /** Notes */
            notes?: string | null;
        };
        /**
         * MatterPhase
         * @enum {string}
         */
        MatterPhase: "pre_filing" | "filed";
        /** MatterResponse */
        MatterResponse: {
            /**
             * Chamber Id
             * Format: uuid
             */
            chamber_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Matter Id
             * Format: uuid
             */
            matter_id: string;
            matter_phase: components["schemas"]["MatterPhase"];
            /** Matter Title */
            matter_title: string;
            /** Notes */
            notes: string | null;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** MembershipOut */
        MembershipOut: {
            /**
             * Chamber Id
             * Format: uuid
             */
            chamber_id: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Joined At
             * Format: date-time
             */
            joined_at: string;
            /** Revoked At */
            revoked_at: string | null;
            role: components["schemas"]["ChamberRole"];
            status: components["schemas"]["MembershipStatus"];
            /**
             * User Id
             * Format: uuid
             */
            user_id: string;
        };
        /**
         * MembershipStatus
         * @enum {string}
         */
        MembershipStatus: "active" | "revoked";
        /** MessageData */
        MessageData: {
            /** Message */
            message: string;
        };
        /** MissingInformation */
        MissingInformation: {
            /** Items */
            items: components["schemas"]["MissingItem"][];
        };
        /** MissingItem */
        MissingItem: {
            /**
             * Availability
             * @enum {string}
             */
            availability: "not_supplied" | "unreadable" | "needs_verification";
            /** Description */
            description: string;
            /** Related Fact Ids */
            related_fact_ids: string[];
        };
        /** MultipartPartUrl */
        MultipartPartUrl: {
            /** Part Number */
            part_number: number;
            /** Upload Url */
            upload_url: string;
        };
        /** MultipartPartUrlRequest */
        MultipartPartUrlRequest: {
            /** Part Numbers */
            part_numbers: number[];
        };
        /** MultipartPartUrlResponse */
        MultipartPartUrlResponse: {
            /**
             * Expires In Seconds
             * @default 900
             */
            expires_in_seconds: number;
            /** Parts */
            parts: components["schemas"]["MultipartPartUrl"][];
        };
        /** MunshiData */
        MunshiData: {
            user: components["schemas"]["MunshiResponse"];
        };
        /** MunshiResponse */
        MunshiResponse: {
            /** Email */
            email: string;
            /** Full Name */
            full_name: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Is Active */
            is_active: boolean;
            /** Mobile Number */
            mobile_number?: string | null;
            role: components["schemas"]["UserRole"];
        };
        /** MunshisData */
        MunshisData: {
            /** Users */
            users: components["schemas"]["MunshiResponse"][];
        };
        /** OcrPageRequest */
        OcrPageRequest: {
            /** Expected Source Sha256 */
            expected_source_sha256: string;
            /** Page Number */
            page_number: number;
        };
        /** OcrQuote */
        OcrQuote: {
            /** Estimated Reservation Paise */
            estimated_reservation_paise: number;
            /** Model */
            model: string;
            /** Quote Hash */
            quote_hash: string;
        };
        /** OcrSubmitRequest */
        OcrSubmitRequest: {
            /** Confirmed Retry Attempt */
            confirmed_retry_attempt?: number | null;
            /** Expected Quote Hash */
            expected_quote_hash: string;
            /** Expected Source Sha256 */
            expected_source_sha256: string;
            /** Page Number */
            page_number: number;
        };
        /** OkfAnnexureCandidateResponse */
        OkfAnnexureCandidateResponse: {
            /**
             * Annexure Id
             * Format: uuid
             */
            annexure_id: string;
            /** Eligible */
            eligible: boolean;
            /** Label */
            label: string;
            /** Reason */
            reason?: string | null;
            /** Slot Code */
            slot_code: string;
        };
        /** OkfContextResponse */
        OkfContextResponse: {
            /** Current */
            current: boolean;
            /** Export Format */
            export_format: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Manifest Sha256 */
            manifest_sha256: string;
            /** Payload */
            payload: {
                [key: string]: unknown;
            };
        };
        /**
         * OkfExportPreviewResponse
         * @description Canonical application metadata. S07-08 will persist an immutable artifact.
         */
        OkfExportPreviewResponse: {
            /** Export Format */
            export_format: string;
            /** Manifest Sha256 */
            manifest_sha256: string;
            /** Payload */
            payload: {
                [key: string]: unknown;
            };
        };
        /** OkfTemplateOptionResponse */
        OkfTemplateOptionResponse: {
            /** Bundle Id */
            bundle_id: string;
            /** Bundle Version */
            bundle_version: string;
            /** Okf Spec Commit */
            okf_spec_commit: string;
            /** Okf Spec Version */
            okf_spec_version: string;
            /** Template Entry Id */
            template_entry_id: string;
            /** Template Title */
            template_title: string;
        };
        /** OriginalPdfSelection */
        OriginalPdfSelection: {
            /**
             * Document Id
             * Format: uuid
             */
            document_id: string;
            /**
             * File Version Id
             * Format: uuid
             */
            file_version_id: string;
            /** Sha256 */
            sha256: string;
        };
        /** OriginalSourceResponse */
        OriginalSourceResponse: {
            /** Editor Document */
            editor_document?: {
                [key: string]: unknown;
            } | null;
            /**
             * Editor Version
             * @default 1
             */
            editor_version: number;
            /**
             * File Version Id
             * Format: uuid
             */
            file_version_id: string;
            /** Mode */
            mode: string;
            /**
             * Ocr Attempt Count
             * @default 0
             */
            ocr_attempt_count: number;
            /**
             * Ocr Can Restart
             * @default false
             */
            ocr_can_restart: boolean;
            /**
             * Ocr Can Retry
             * @default false
             */
            ocr_can_retry: boolean;
            /** Ocr Error */
            ocr_error?: string | null;
            /**
             * Ocr Retry May Charge
             * @default false
             */
            ocr_retry_may_charge: boolean;
            /** Ocr Status */
            ocr_status?: string | null;
            /**
             * Page Count
             * @default 0
             */
            page_count: number;
            /** Pages */
            pages: components["schemas"]["SourcePage"][];
            /** Source Sha256 */
            source_sha256: string;
            /** Working Document Id */
            working_document_id?: string | null;
        };
        /** Overview */
        Overview: {
            applicable_provisions: components["schemas"]["FactGroup"];
            case_numbers: components["schemas"]["FactGroup"];
            case_title: components["schemas"]["FactGroup"];
            complainant_opposite_party: components["schemas"]["FactGroup"];
            court_and_bench: components["schemas"]["FactGroup"];
            current_case_stage: components["schemas"]["FactGroup"];
            fir_number_and_police_station: components["schemas"]["FactGroup"];
            petitioner_applicant_accused: components["schemas"]["FactGroup"];
            relief_sought: components["schemas"]["FactGroup"];
        };
        /** PageLayoutIn */
        PageLayoutIn: {
            /** Marginbottom */
            marginBottom: number;
            /** Marginleft */
            marginLeft: number;
            /** Marginright */
            marginRight: number;
            /** Margintop */
            marginTop: number;
            /**
             * Orientation
             * @enum {string}
             */
            orientation: "portrait" | "landscape";
            /**
             * Pagesize
             * @enum {string}
             */
            pageSize: "A4" | "A3" | "Legal" | "Letter";
        };
        /** PaginationMeta */
        PaginationMeta: {
            /** Limit */
            limit: number;
            /** Page */
            page: number;
            /** Total */
            total: number;
            /** Total Pages */
            total_pages: number;
        };
        /** Parties */
        Parties: {
            /** Parties */
            parties: components["schemas"]["Party"][];
        };
        /** Party */
        Party: {
            alleged_involvement: components["schemas"]["FactGroup"];
            identity_and_role: components["schemas"]["Fact"];
            relationship: components["schemas"]["FactGroup"];
        };
        /** PartyCreateRequest */
        PartyCreateRequest: {
            /** Address */
            address?: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            party_type: components["schemas"]["PartyType"];
            /** Phone */
            phone?: string | null;
        };
        /** PartyData */
        PartyData: {
            party: components["schemas"]["PartyResponse"];
        };
        /** PartyResponse */
        PartyResponse: {
            /** Address */
            address: string | null;
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            party_type: components["schemas"]["PartyType"];
            /** Phone */
            phone: string | null;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /**
         * PartyType
         * @enum {string}
         */
        PartyType: "petitioner" | "respondent" | "intervener" | "amicus" | "witness" | "other";
        /** PartyUpdateRequest */
        PartyUpdateRequest: {
            /** Address */
            address?: string | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            party_type?: components["schemas"]["PartyType"] | null;
            /** Phone */
            phone?: string | null;
        };
        /** PermissionsData */
        PermissionsData: {
            /** Can Edit */
            can_edit: boolean;
        };
        /** PersistedEditorDocumentIn */
        PersistedEditorDocumentIn: {
            /** Editorstate */
            editorState: {
                [key: string]: unknown;
            };
            pageLayout: components["schemas"]["PageLayoutIn"];
            /**
             * Schemaversion
             * @constant
             */
            schemaVersion: 1;
        };
        /** PolicyCapabilitiesIn */
        PolicyCapabilitiesIn: {
            /**
             * Export
             * @default false
             */
            export: boolean;
            /**
             * Generation
             * @default false
             */
            generation: boolean;
            /**
             * Indexing
             * @default false
             */
            indexing: boolean;
            /**
             * Review
             * @default false
             */
            review: boolean;
        };
        /** PolicyCapabilityOut */
        PolicyCapabilityOut: {
            /**
             * Export
             * @default false
             */
            export: boolean;
            /**
             * Generation
             * @default false
             */
            generation: boolean;
            /**
             * Indexing
             * @default false
             */
            indexing: boolean;
            /**
             * Review
             * @default false
             */
            review: boolean;
        };
        /** PrepareOkfExportPreviewRequest */
        PrepareOkfExportPreviewRequest: {
            /** Annexure Ids */
            annexure_ids?: string[];
            /** Authority Manifest Id */
            authority_manifest_id?: string | null;
            /** Bundle Id */
            bundle_id: string;
            /** Bundle Version */
            bundle_version: string;
            /** Confirmed Findings */
            confirmed_findings: components["schemas"]["ConfirmedFindingSelection"][];
            /** Expected Authority Context Hash */
            expected_authority_context_hash?: string | null;
            /** Expected Summary Result Hash */
            expected_summary_result_hash: string;
            /**
             * Summary Run Id
             * Format: uuid
             */
            summary_run_id: string;
            /** Template Entry Id */
            template_entry_id: string;
        };
        /** PrepareSummaryRunRequest */
        PrepareSummaryRunRequest: {
            /** Original Pdf Sources */
            original_pdf_sources?: components["schemas"]["OriginalPdfSelection"][];
            /**
             * Output Language
             * @default en-IN
             * @enum {string}
             */
            output_language: "en-IN" | "hi-IN";
            /**
             * Prompt Version
             * @default allahabad-criminal-summary-v6
             * @constant
             */
            prompt_version: "allahabad-criminal-summary-v6";
            /** Sources */
            sources?: components["schemas"]["SummarySourceSelectionRequest"][];
        };
        /** PresignUploadRequest */
        PresignUploadRequest: {
            /** Client Upload Id */
            client_upload_id?: string | null;
            /** @default other */
            document_type: components["schemas"]["DocumentType"];
            /** File Size Bytes */
            file_size_bytes: number;
            /** Filename */
            filename: string;
            /** Mime Type */
            mime_type: string;
            /** @default unknown */
            origin: components["schemas"]["FileOrigin"];
        };
        /** PresignUploadResponse */
        PresignUploadResponse: {
            /**
             * Already Uploaded
             * @default false
             */
            already_uploaded: boolean;
            /**
             * Document Id
             * Format: uuid
             */
            document_id: string;
            /**
             * Expires In Seconds
             * @default 900
             */
            expires_in_seconds: number;
            /** R2 Key */
            r2_key: string;
            /** Upload Url */
            upload_url: string;
        };
        /** ProceedingCreateRequest */
        ProceedingCreateRequest: {
            /** Court Name */
            court_name?: string | null;
            /** Title */
            title: string;
        };
        /** ProceedingResponse */
        ProceedingResponse: {
            /**
             * Chamber Id
             * Format: uuid
             */
            chamber_id: string;
            /** Court Name */
            court_name: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Created By User Id
             * Format: uuid
             */
            created_by_user_id: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Matter Id
             * Format: uuid
             */
            matter_id: string;
            status: components["schemas"]["ProceedingStatus"];
            /** Title */
            title: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /**
         * ProceedingStatus
         * @enum {string}
         */
        ProceedingStatus: "active" | "stayed" | "disposed";
        /** PropositionResponse */
        PropositionResponse: {
            /**
             * Authority Version Id
             * Format: uuid
             */
            authority_version_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Passage Id
             * Format: uuid
             */
            passage_id: string;
            /** Review Action */
            review_action: string;
            /**
             * Review Id
             * Format: uuid
             */
            review_id: string;
            /** Review Version */
            review_version: number;
            /** Text */
            text: string;
            /** Text Hash */
            text_hash: string;
        };
        /**
         * ProviderDataClass
         * @enum {string}
         */
        ProviderDataClass: "approved_knowledge" | "case_metadata" | "document_text" | "document_image" | "draft_text";
        /**
         * ProviderFallbackCondition
         * @enum {string}
         */
        ProviderFallbackCondition: "network_error" | "rate_limited" | "quota_exhausted" | "invalid_output";
        /**
         * ProviderName
         * @enum {string}
         */
        ProviderName: "sarvam" | "gemini" | "openai" | "claude";
        /**
         * ProviderOperation
         * @enum {string}
         */
        ProviderOperation: "transcription" | "summary" | "draft" | "consistency_check" | "embedding";
        /** ProviderRouteIn */
        ProviderRouteIn: {
            /** Model */
            model: string;
            provider: components["schemas"]["ProviderName"];
        };
        /** ProviderTaskPolicyIn */
        ProviderTaskPolicyIn: {
            /** Deadline Seconds */
            deadline_seconds: number;
            /** Fallback Conditions */
            fallback_conditions?: components["schemas"]["ProviderFallbackCondition"][];
            /** Max Input Bytes */
            max_input_bytes: number;
            /** Max Output Tokens */
            max_output_tokens: number;
            /** Max Submissions */
            max_submissions: number;
            operation: components["schemas"]["ProviderOperation"];
            /** Permitted Languages */
            permitted_languages?: string[];
            /** Providers */
            providers: components["schemas"]["ProviderRouteIn"][];
            /** Run Budget Paise */
            run_budget_paise: number;
            /** Transcription Budget Paise Per Page */
            transcription_budget_paise_per_page?: number | null;
        };
        /** ProviderTaskPolicyOut */
        ProviderTaskPolicyOut: {
            /** Deadline Seconds */
            deadline_seconds: number;
            /** Fallback Conditions */
            fallback_conditions?: components["schemas"]["ProviderFallbackCondition"][];
            /** Max Input Bytes */
            max_input_bytes: number;
            /** Max Output Tokens */
            max_output_tokens: number;
            /** Max Submissions */
            max_submissions: number;
            operation: components["schemas"]["ProviderOperation"];
            /** Permitted Languages */
            permitted_languages?: string[];
            /** Providers */
            providers: components["schemas"]["ProviderRouteIn"][];
            /** Run Budget Paise */
            run_budget_paise: number;
            /** Transcription Budget Paise Per Page */
            transcription_budget_paise_per_page?: number | null;
        };
        /** Provisions */
        Provisions: {
            /** Ai Suggested */
            ai_suggested: components["schemas"]["Analysis"][];
            record_mentioned: components["schemas"]["FactGroup"];
        };
        /** ReadinessResponse */
        ReadinessResponse: {
            /** Banner */
            banner: string;
            /** Blueprint Code */
            blueprint_code: string;
            /** Blueprint Version */
            blueprint_version: number;
            /** Draft Type */
            draft_type: string;
            /** Missing Case Fields */
            missing_case_fields: string[];
            /** Missing Inputs */
            missing_inputs: string[];
            /** Missing Profile Fields */
            missing_profile_fields: string[];
            /** Prefill */
            prefill: {
                [key: string]: unknown;
            };
            /**
             * Tier
             * @enum {string}
             */
            tier: "A" | "B" | "C";
            /** Warnings */
            warnings: string[];
        };
        /** RecordMultipartPartRequest */
        RecordMultipartPartRequest: {
            /** Etag */
            etag: string;
            /** Part Number */
            part_number: number;
            /** Size Bytes */
            size_bytes: number;
        };
        /** RefreshData */
        RefreshData: {
            /** Access Token */
            access_token: string;
            /** Refresh Token */
            refresh_token?: string | null;
            /**
             * Session Id
             * Format: uuid
             */
            session_id: string;
            /**
             * Token Type
             * @constant
             */
            token_type: "bearer";
        };
        /** RefreshTokenRequest */
        RefreshTokenRequest: {
            /** Refresh Token */
            refresh_token?: string | null;
        };
        /** RegisterRequest */
        RegisterRequest: {
            /** Device Id */
            device_id?: string | null;
            /** Device Name */
            device_name?: string | null;
            device_type?: components["schemas"]["AuthDeviceType"] | null;
            /**
             * Email
             * Format: email
             */
            email: string;
            /** Full Name */
            full_name: string;
            /** Password */
            password: string;
        };
        /** RenderExportRequest */
        RenderExportRequest: {
            document: components["schemas"]["PersistedEditorDocumentIn"];
            /** File Name */
            file_name?: string | null;
            /**
             * Output Format
             * @enum {string}
             */
            output_format: "docx" | "pdf";
            /** Title */
            title: string;
        };
        /** ResetPasswordRequest */
        ResetPasswordRequest: {
            /** Code */
            code: string;
            /**
             * Email
             * Format: email
             */
            email: string;
            /** New Password */
            new_password: string;
        };
        /** ResolveEligibilityRequest */
        ResolveEligibilityRequest: {
            /** Expected Revision Sha256 */
            expected_revision_sha256: string;
            /**
             * Revision Id
             * Format: uuid
             */
            revision_id: string;
            /** Sources */
            sources?: components["schemas"]["SourceDependencyRequest"][];
        };
        /**
         * RetryFactCardRequest
         * @description An explicit acknowledgement is required after an uncertain provider outcome.
         */
        RetryFactCardRequest: {
            /**
             * Acknowledge Provider Outcome Unknown
             * @default false
             */
            acknowledge_provider_outcome_unknown: boolean;
        };
        /** ReviewInboxItem */
        ReviewInboxItem: {
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /** Content Sha256 */
            content_sha256: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Revision Id
             * Format: uuid
             */
            revision_id: string;
            /** Revision Number */
            revision_number: number;
            /** Title */
            title: string;
            /**
             * Working Document Id
             * Format: uuid
             */
            working_document_id: string;
        };
        /** ReviewOriginalRequest */
        ReviewOriginalRequest: {
            /** Confirmed */
            confirmed: boolean;
            /** Expected Source Sha256 */
            expected_source_sha256: string;
            /** Page Texts */
            page_texts: {
                [key: string]: string;
            };
        };
        /** ReviewSourceEditorRequest */
        ReviewSourceEditorRequest: {
            /** Confirmed */
            confirmed: boolean;
            /** Editor Document */
            editor_document: {
                [key: string]: unknown;
            };
            /** Expected Editor Version */
            expected_editor_version: number;
            /** Expected Source Sha256 */
            expected_source_sha256: string;
        };
        /**
         * RevisionDecisionAction
         * @enum {string}
         */
        RevisionDecisionAction: "approve" | "request_changes" | "revoke";
        /** SaveOkfContextRequest */
        SaveOkfContextRequest: {
            /** Annexure Ids */
            annexure_ids?: string[];
            /** Authority Manifest Id */
            authority_manifest_id?: string | null;
            /** Bundle Id */
            bundle_id: string;
            /** Bundle Version */
            bundle_version: string;
            /** Confirmed Findings */
            confirmed_findings: components["schemas"]["ConfirmedFindingSelection"][];
            /** Expected Authority Context Hash */
            expected_authority_context_hash?: string | null;
            /** Expected Manifest Sha256 */
            expected_manifest_sha256: string;
            /** Expected Summary Result Hash */
            expected_summary_result_hash: string;
            /**
             * Summary Run Id
             * Format: uuid
             */
            summary_run_id: string;
            /** Template Entry Id */
            template_entry_id: string;
        };
        /** SaveSourceEditorRequest */
        SaveSourceEditorRequest: {
            /** Editor Document */
            editor_document: {
                [key: string]: unknown;
            };
            /** Expected Editor Version */
            expected_editor_version: number;
            /** Expected Source Sha256 */
            expected_source_sha256: string;
        };
        /** SaveSummaryEditorRequest */
        SaveSummaryEditorRequest: {
            /** Editor State */
            editor_state: {
                [key: string]: unknown;
            };
            /** Expected Result Hash */
            expected_result_hash: string;
            /** Expected Review Version */
            expected_review_version: number;
        };
        /** SectionData */
        SectionData: {
            section: components["schemas"]["CaseSectionResponse"];
        };
        /** SectionsData */
        SectionsData: {
            /** Sections */
            sections: components["schemas"]["CaseSectionResponse"][];
        };
        /** SectionsV2 */
        SectionsV2: {
            advocate_actions: components["schemas"]["Actions"];
            applicant_version: components["schemas"]["FactGroup"];
            case_overview: components["schemas"]["Overview"];
            chronological_timeline: components["schemas"]["Timelines"];
            contradictions: components["schemas"]["Contradictions"];
            defence_grounds: components["schemas"]["Analyses"];
            evidence_analysis: components["schemas"]["Evidence"];
            executive_summary: components["schemas"]["ExecutiveSummary"];
            legal_issues: components["schemas"]["Analyses"];
            legal_provisions: components["schemas"]["Provisions"];
            missing_information: components["schemas"]["MissingInformation"];
            parties_and_roles: components["schemas"]["Parties"];
            prosecution_arguments: components["schemas"]["Analyses"];
            prosecution_version: components["schemas"]["FactGroup"];
            witness_analysis: components["schemas"]["Witnesses"];
        };
        /** SelectableSummaryFact */
        SelectableSummaryFact: {
            /** Id */
            id: string;
            /** Sources */
            sources: components["schemas"]["SourceLink"][];
            /** Status */
            status: string;
            /** Text */
            text: string;
        };
        /** SessionResponse */
        SessionResponse: {
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Device Name */
            device_name: string | null;
            device_type: components["schemas"]["AuthDeviceType"];
            /**
             * Expires At
             * Format: date-time
             */
            expires_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Last Seen At
             * Format: date-time
             */
            last_seen_at: string;
        };
        /** SessionsData */
        SessionsData: {
            /** Sessions */
            sessions: components["schemas"]["SessionResponse"][];
        };
        /** SourceCitation */
        SourceCitation: {
            finding_type?: components["schemas"]["FindingType"] | null;
            /** Page Number */
            page_number?: number | null;
            /**
             * Page Reference Note
             * @default Not available
             */
            page_reference_note: string;
            /** Source Document Id */
            source_document_id: string;
            /** Source Paths */
            source_paths: string[];
            /** Source Revision Id */
            source_revision_id: string;
        };
        /** SourceDependencyRequest */
        SourceDependencyRequest: {
            /** Expected Sha256 */
            expected_sha256: string;
            /**
             * File Version Id
             * Format: uuid
             */
            file_version_id: string;
            /** First Page */
            first_page?: number | null;
            /** Last Page */
            last_page?: number | null;
        };
        /** SourceLink */
        SourceLink: {
            /** Citation Index */
            citation_index: number;
            /** Document Id */
            document_id: string;
            /** Filename */
            filename?: string | null;
            /** Finding Id */
            finding_id: string;
            /** Page Number */
            page_number: number;
        };
        /**
         * SourceOcrStatusResponse
         * @description Small, storage-free view of the current full-document typing job.
         */
        SourceOcrStatusResponse: {
            /**
             * Attempt Count
             * @default 0
             */
            attempt_count: number;
            /**
             * Can Restart
             * @default false
             */
            can_restart: boolean;
            /**
             * Can Retry
             * @default false
             */
            can_retry: boolean;
            /** Error */
            error?: string | null;
            /** Job Id */
            job_id?: string | null;
            /**
             * Retry May Charge
             * @default false
             */
            retry_may_charge: boolean;
            /** Status */
            status?: string | null;
        };
        /** SourcePage */
        SourcePage: {
            /** Native */
            native: boolean;
            /**
             * Nontext Images
             * @default false
             */
            nontext_images: boolean;
            /** Ocr Error */
            ocr_error?: string | null;
            /** Ocr Status */
            ocr_status?: string | null;
            /** Page Number */
            page_number: number;
            /** Reason */
            reason: string;
            /** Text */
            text: string;
        };
        /** StartCourtDraftGenerationRequest */
        StartCourtDraftGenerationRequest: {
            /** Expected Content Hash */
            expected_content_hash: string;
            /** Idempotency Key */
            idempotency_key: string;
        };
        /** StructuredSummary */
        StructuredSummary: {
            /**
             * Additional Sections
             * @description Extra sections generated by the AI that are outside the defined schema. Preserved for advocate review.
             */
            additional_sections?: {
                [key: string]: unknown;
            };
            /** Output Language */
            output_language: string;
            /**
             * Schema Version
             * @default case-summary-v2
             * @constant
             */
            schema_version: "case-summary-v2";
            sections: components["schemas"]["SectionsV2"];
            /** Uncertainties */
            uncertainties: string[];
        };
        /** SubmitDraftRequest */
        SubmitDraftRequest: {
            /** Expected Manifest Sha256 */
            expected_manifest_sha256: string;
            /** Expected Quote Hash */
            expected_quote_hash: string;
            /** Fact Bindings */
            fact_bindings?: {
                [key: string]: string[];
            };
            /** Requested Relief */
            requested_relief: string;
        };
        /** SubmitRevisionRequest */
        SubmitRevisionRequest: {
            /** Expected Content Sha256 */
            expected_content_sha256: string;
        };
        /** SubmitSummaryRunResponse */
        SubmitSummaryRunResponse: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Status */
            status: string;
        };
        /** SuccessResponse[AccessData] */
        SuccessResponse_AccessData_: {
            data: components["schemas"]["AccessData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[AdvocateProfileResponse] */
        SuccessResponse_AdvocateProfileResponse_: {
            data: components["schemas"]["AdvocateProfileResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[AuthData] */
        SuccessResponse_AuthData_: {
            data: components["schemas"]["AuthData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[AuthorityManifestResponse] */
        SuccessResponse_AuthorityManifestResponse_: {
            data: components["schemas"]["AuthorityManifestResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[AuthorityPassageResponse] */
        SuccessResponse_AuthorityPassageResponse_: {
            data: components["schemas"]["AuthorityPassageResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[AuthorityResponse] */
        SuccessResponse_AuthorityResponse_: {
            data: components["schemas"]["AuthorityResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[AuthorityReviewResponse] */
        SuccessResponse_AuthorityReviewResponse_: {
            data: components["schemas"]["AuthorityReviewResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[CaseData] */
        SuccessResponse_CaseData_: {
            data: components["schemas"]["CaseData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[CaseNumberData] */
        SuccessResponse_CaseNumberData_: {
            data: components["schemas"]["CaseNumberData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[CasesData] */
        SuccessResponse_CasesData_: {
            data: components["schemas"]["CasesData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ChamberProviderPolicyOut] */
        SuccessResponse_ChamberProviderPolicyOut_: {
            data: components["schemas"]["ChamberProviderPolicyOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ChamberWithMembershipOut] */
        SuccessResponse_ChamberWithMembershipOut_: {
            data: components["schemas"]["ChamberWithMembershipOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ClientCaseLinkOut] */
        SuccessResponse_ClientCaseLinkOut_: {
            data: components["schemas"]["ClientCaseLinkOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ClientOut] */
        SuccessResponse_ClientOut_: {
            data: components["schemas"]["ClientOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ConfirmUploadResponse] */
        SuccessResponse_ConfirmUploadResponse_: {
            data: components["schemas"]["ConfirmUploadResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[CourtDraftEditorResponse] */
        SuccessResponse_CourtDraftEditorResponse_: {
            data: components["schemas"]["CourtDraftEditorResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[CourtDraftExportResponse] */
        SuccessResponse_CourtDraftExportResponse_: {
            data: components["schemas"]["CourtDraftExportResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[CourtDraftGenerationResponse] */
        SuccessResponse_CourtDraftGenerationResponse_: {
            data: components["schemas"]["CourtDraftGenerationResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[CourtDraftResponse] */
        SuccessResponse_CourtDraftResponse_: {
            data: components["schemas"]["CourtDraftResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[CustodyOut] */
        SuccessResponse_CustodyOut_: {
            data: components["schemas"]["CustodyOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[DictationTranscription] */
        SuccessResponse_DictationTranscription_: {
            data: components["schemas"]["DictationTranscription"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[DocumentsData] */
        SuccessResponse_DocumentsData_: {
            data: components["schemas"]["DocumentsData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[DraftPreflightResponse] */
        SuccessResponse_DraftPreflightResponse_: {
            data: components["schemas"]["DraftPreflightResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[DraftQuoteResponse] */
        SuccessResponse_DraftQuoteResponse_: {
            data: components["schemas"]["DraftQuoteResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[EditorBootstrapResponse] */
        SuccessResponse_EditorBootstrapResponse_: {
            data: components["schemas"]["EditorBootstrapResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[EligibilityResponse] */
        SuccessResponse_EligibilityResponse_: {
            data: components["schemas"]["EligibilityResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[EmptyData] */
        SuccessResponse_EmptyData_: {
            data: components["schemas"]["EmptyData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ExportJobResponse] */
        SuccessResponse_ExportJobResponse_: {
            data: components["schemas"]["ExportJobResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ExtractionJobResponse] */
        SuccessResponse_ExtractionJobResponse_: {
            data: components["schemas"]["ExtractionJobResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ExtractionJobStatusResponse] */
        SuccessResponse_ExtractionJobStatusResponse_: {
            data: components["schemas"]["ExtractionJobStatusResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[FeeAgreementOut] */
        SuccessResponse_FeeAgreementOut_: {
            data: components["schemas"]["FeeAgreementOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[FeeEntryOut] */
        SuccessResponse_FeeEntryOut_: {
            data: components["schemas"]["FeeEntryOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[FeeLedgerOut] */
        SuccessResponse_FeeLedgerOut_: {
            data: components["schemas"]["FeeLedgerOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[JobOut] */
        SuccessResponse_JobOut_: {
            data: components["schemas"]["JobOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[LawyerProfileResponse] */
        SuccessResponse_LawyerProfileResponse_: {
            data: components["schemas"]["LawyerProfileResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[LegalResearchConfigResponse] */
        SuccessResponse_LegalResearchConfigResponse_: {
            data: components["schemas"]["LegalResearchConfigResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[LegalResearchRunResponse] */
        SuccessResponse_LegalResearchRunResponse_: {
            data: components["schemas"]["LegalResearchRunResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[MatterResponse] */
        SuccessResponse_MatterResponse_: {
            data: components["schemas"]["MatterResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[MembershipOut] */
        SuccessResponse_MembershipOut_: {
            data: components["schemas"]["MembershipOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[MessageData] */
        SuccessResponse_MessageData_: {
            data: components["schemas"]["MessageData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[MultipartPartUrlResponse] */
        SuccessResponse_MultipartPartUrlResponse_: {
            data: components["schemas"]["MultipartPartUrlResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[MunshiData] */
        SuccessResponse_MunshiData_: {
            data: components["schemas"]["MunshiData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[MunshisData] */
        SuccessResponse_MunshisData_: {
            data: components["schemas"]["MunshisData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[OcrQuote] */
        SuccessResponse_OcrQuote_: {
            data: components["schemas"]["OcrQuote"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[OkfContextResponse] */
        SuccessResponse_OkfContextResponse_: {
            data: components["schemas"]["OkfContextResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[OkfExportPreviewResponse] */
        SuccessResponse_OkfExportPreviewResponse_: {
            data: components["schemas"]["OkfExportPreviewResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[OriginalSourceResponse] */
        SuccessResponse_OriginalSourceResponse_: {
            data: components["schemas"]["OriginalSourceResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[PartyData] */
        SuccessResponse_PartyData_: {
            data: components["schemas"]["PartyData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[PermissionsData] */
        SuccessResponse_PermissionsData_: {
            data: components["schemas"]["PermissionsData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[PresignUploadResponse] */
        SuccessResponse_PresignUploadResponse_: {
            data: components["schemas"]["PresignUploadResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ProceedingResponse] */
        SuccessResponse_ProceedingResponse_: {
            data: components["schemas"]["ProceedingResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[PropositionResponse] */
        SuccessResponse_PropositionResponse_: {
            data: components["schemas"]["PropositionResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ReadinessResponse] */
        SuccessResponse_ReadinessResponse_: {
            data: components["schemas"]["ReadinessResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[RefreshData] */
        SuccessResponse_RefreshData_: {
            data: components["schemas"]["RefreshData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[SectionData] */
        SuccessResponse_SectionData_: {
            data: components["schemas"]["SectionData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[SectionsData] */
        SuccessResponse_SectionsData_: {
            data: components["schemas"]["SectionsData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[SessionsData] */
        SuccessResponse_SessionsData_: {
            data: components["schemas"]["SessionsData"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[SourceOcrStatusResponse] */
        SuccessResponse_SourceOcrStatusResponse_: {
            data: components["schemas"]["SourceOcrStatusResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[SubmitSummaryRunResponse] */
        SuccessResponse_SubmitSummaryRunResponse_: {
            data: components["schemas"]["SubmitSummaryRunResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[SummaryRunDetailResponse] */
        SuccessResponse_SummaryRunDetailResponse_: {
            data: components["schemas"]["SummaryRunDetailResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[SummaryRunResponse] */
        SuccessResponse_SummaryRunResponse_: {
            data: components["schemas"]["SummaryRunResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[SummarySourceView] */
        SuccessResponse_SummarySourceView_: {
            data: components["schemas"]["SummarySourceView"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[Union[JobOut, NoneType]] */
        SuccessResponse_Union_JobOut__NoneType__: {
            data: components["schemas"]["JobOut"] | null;
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[VerificationPendingResponse] */
        SuccessResponse_VerificationPendingResponse_: {
            data: components["schemas"]["VerificationPendingResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[ViewUrlResponse] */
        SuccessResponse_ViewUrlResponse_: {
            data: components["schemas"]["ViewUrlResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[WorkflowRunOut] */
        SuccessResponse_WorkflowRunOut_: {
            data: components["schemas"]["WorkflowRunOut"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[WorkingDocumentDetailResponse] */
        SuccessResponse_WorkingDocumentDetailResponse_: {
            data: components["schemas"]["WorkingDocumentDetailResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[WorkingDocumentRevisionResponse] */
        SuccessResponse_WorkingDocumentRevisionResponse_: {
            data: components["schemas"]["WorkingDocumentRevisionResponse"];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[AuthorityManifestResponse]] */
        SuccessResponse_list_AuthorityManifestResponse__: {
            /** Data */
            data: components["schemas"]["AuthorityManifestResponse"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[ChamberAuditEventOut]] */
        SuccessResponse_list_ChamberAuditEventOut__: {
            /** Data */
            data: components["schemas"]["ChamberAuditEventOut"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[ChamberWithMembershipOut]] */
        SuccessResponse_list_ChamberWithMembershipOut__: {
            /** Data */
            data: components["schemas"]["ChamberWithMembershipOut"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[ClientCaseLinkOut]] */
        SuccessResponse_list_ClientCaseLinkOut__: {
            /** Data */
            data: components["schemas"]["ClientCaseLinkOut"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[ClientOut]] */
        SuccessResponse_list_ClientOut__: {
            /** Data */
            data: components["schemas"]["ClientOut"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[CustodyOut]] */
        SuccessResponse_list_CustodyOut__: {
            /** Data */
            data: components["schemas"]["CustodyOut"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[FactCardCoverageResponse]] */
        SuccessResponse_list_FactCardCoverageResponse__: {
            /** Data */
            data: components["schemas"]["FactCardCoverageResponse"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[LegalResearchRunResponse]] */
        SuccessResponse_list_LegalResearchRunResponse__: {
            /** Data */
            data: components["schemas"]["LegalResearchRunResponse"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[MembershipOut]] */
        SuccessResponse_list_MembershipOut__: {
            /** Data */
            data: components["schemas"]["MembershipOut"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[OkfAnnexureCandidateResponse]] */
        SuccessResponse_list_OkfAnnexureCandidateResponse__: {
            /** Data */
            data: components["schemas"]["OkfAnnexureCandidateResponse"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[OkfTemplateOptionResponse]] */
        SuccessResponse_list_OkfTemplateOptionResponse__: {
            /** Data */
            data: components["schemas"]["OkfTemplateOptionResponse"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[ProceedingResponse]] */
        SuccessResponse_list_ProceedingResponse__: {
            /** Data */
            data: components["schemas"]["ProceedingResponse"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[ReviewInboxItem]] */
        SuccessResponse_list_ReviewInboxItem__: {
            /** Data */
            data: components["schemas"]["ReviewInboxItem"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[SummaryRunResponse]] */
        SuccessResponse_list_SummaryRunResponse__: {
            /** Data */
            data: components["schemas"]["SummaryRunResponse"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[SummarySourceCandidateResponse]] */
        SuccessResponse_list_SummarySourceCandidateResponse__: {
            /** Data */
            data: components["schemas"]["SummarySourceCandidateResponse"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SuccessResponse[list[WorkingDocumentSummaryResponse]] */
        SuccessResponse_list_WorkingDocumentSummaryResponse__: {
            /** Data */
            data: components["schemas"]["WorkingDocumentSummaryResponse"][];
            /**
             * Success
             * @constant
             */
            success: true;
        };
        /** SummaryBlock */
        SummaryBlock: {
            /** Cells */
            cells: components["schemas"]["SummaryCell"][];
            /** Kind */
            kind: string;
            /** Title */
            title: string;
        };
        /** SummaryCell */
        SummaryCell: {
            /** Label */
            label: string;
            /** Sources */
            sources?: components["schemas"]["SourceLink"][];
            /** Text */
            text: string;
        };
        /** SummaryEditorBlock */
        SummaryEditorBlock: {
            /** Id */
            id: string;
            /** Text */
            text: string;
            /** Title */
            title: string;
        };
        /** SummaryFinding */
        SummaryFinding: {
            /** Citations */
            citations: components["schemas"]["SourceCitation"][];
            /**
             * Confirmed
             * @default false
             */
            confirmed: boolean;
            finding_type: components["schemas"]["FindingType"];
            /**
             * Requires Advocate Review
             * @default true
             */
            requires_advocate_review: boolean;
            /** Text */
            text: string;
        };
        /** SummaryReviewDecisionResponse */
        SummaryReviewDecisionResponse: {
            /**
             * Action
             * @enum {string}
             */
            action: "approve" | "request_changes";
            /** Comment */
            comment: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Result Hash */
            result_hash: string;
            /**
             * Reviewed By User Id
             * Format: uuid
             */
            reviewed_by_user_id: string;
            /** Sequence */
            sequence: number;
        };
        /** SummaryReviewDocument */
        SummaryReviewDocument: {
            /**
             * Document Id
             * Format: uuid
             */
            document_id: string;
            /** Filename */
            filename: string;
        };
        /**
         * SummaryRunDetailResponse
         * @description Generated content is derived and remains immutable until a later revision flow exists.
         */
        SummaryRunDetailResponse: {
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /** Completed At */
            completed_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Decisions */
            decisions: components["schemas"]["SummaryReviewDecisionResponse"][];
            /** Editor Blocks */
            editor_blocks?: components["schemas"]["SummaryEditorBlock"][];
            /** Editor Recovery Notice */
            editor_recovery_notice?: string | null;
            /** Editor State */
            editor_state?: {
                [key: string]: unknown;
            } | null;
            /** Error Code */
            error_code: string | null;
            /**
             * Has Saved Edits
             * @default false
             */
            has_saved_edits: boolean;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Input Tokens */
            input_tokens: number | null;
            /** Model */
            model: string | null;
            /**
             * Output Language
             * @default en-IN
             */
            output_language: string;
            /** Output Tokens */
            output_tokens: number | null;
            /** Policy Version */
            policy_version: number;
            presentation?: components["schemas"]["SummaryView"] | null;
            /** Prompt Version */
            prompt_version: string;
            /** Provider */
            provider: string | null;
            /** Provider Request Id */
            provider_request_id: string | null;
            /** Result Hash */
            result_hash: string | null;
            /** Result Payload */
            result_payload: components["schemas"]["StructuredSummary"] | components["schemas"]["CaseSummaryPayload"] | components["schemas"]["UnverifiedSummary"] | null;
            /** Review Comment */
            review_comment: string | null;
            /** Review Documents */
            review_documents?: components["schemas"]["SummaryReviewDocument"][];
            /** Review Version */
            review_version: number;
            /** Reviewed At */
            reviewed_at: string | null;
            /** Reviewed By User Id */
            reviewed_by_user_id: string | null;
            /**
             * Schema Version
             * @default case-summary-v1
             */
            schema_version: string;
            /** Source Count */
            source_count: number;
            /** Source Manifest Hash */
            source_manifest_hash: string;
            /** Status */
            status: string;
            /** Validation Report */
            validation_report: {
                [key: string]: unknown;
            } | null;
        };
        /** SummaryRunResponse */
        SummaryRunResponse: {
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /** Completed At */
            completed_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Output Language
             * @default en-IN
             */
            output_language: string;
            /** Policy Version */
            policy_version: number;
            /** Prompt Version */
            prompt_version: string;
            /**
             * Schema Version
             * @default case-summary-v1
             */
            schema_version: string;
            /** Source Count */
            source_count: number;
            /** Source Manifest Hash */
            source_manifest_hash: string;
            /** Status */
            status: string;
        };
        /** SummarySection */
        SummarySection: {
            /** Findings */
            findings?: components["schemas"]["SummaryFinding"][];
            name: components["schemas"]["SummarySectionName"];
        };
        /**
         * SummarySectionName
         * @enum {string}
         */
        SummarySectionName: "case_identification" | "executive_summary" | "parties_and_roles" | "prosecution_allegations" | "chronology_of_events" | "legal_provisions_mentioned" | "witness_statements" | "medical_forensic_findings" | "documentary_evidence" | "procedural_and_custody_history" | "contradictions_and_evidence_gaps" | "potential_defence_points" | "potential_prosecution_points" | "missing_information" | "advocate_review_checklist";
        /** SummarySourceCandidateResponse */
        SummarySourceCandidateResponse: {
            /** Eligible */
            eligible: boolean;
            /** Original Document Id */
            original_document_id?: string | null;
            /** Reasons */
            reasons: string[];
            /** Revision Id */
            revision_id: string | null;
            /** Revision Number */
            revision_number: number | null;
            /** Revision Sha256 */
            revision_sha256: string | null;
            /**
             * Source Kind
             * @default reviewed_text
             * @enum {string}
             */
            source_kind: "reviewed_text" | "original_pdf";
            /** Status */
            status: string | null;
            /** Title */
            title: string;
            /**
             * Working Document Id
             * Format: uuid
             */
            working_document_id: string;
        };
        /** SummarySourceSelectionRequest */
        SummarySourceSelectionRequest: {
            /** Expected Revision Sha256 */
            expected_revision_sha256: string;
            /**
             * Revision Id
             * Format: uuid
             */
            revision_id: string;
            /**
             * Working Document Id
             * Format: uuid
             */
            working_document_id: string;
        };
        /** SummarySourceView */
        SummarySourceView: {
            /**
             * Expires At
             * Format: date-time
             */
            expires_at: string;
            /** Filename */
            filename: string;
            /** Mime Type */
            mime_type: string;
            /** Page Number */
            page_number: number;
            /** Url */
            url: string;
        };
        /** SummaryView */
        SummaryView: {
            /** Executive Word Count */
            executive_word_count: number;
            /** Schema Version */
            schema_version: string;
            /** Sections */
            sections: components["schemas"]["SummaryViewSection"][];
            /** Selectable Facts */
            selectable_facts: components["schemas"]["SelectableSummaryFact"][];
            /** Uncertainties */
            uncertainties: string[];
        };
        /** SummaryViewSection */
        SummaryViewSection: {
            /** Blocks */
            blocks: components["schemas"]["SummaryBlock"][];
            /** Key */
            key: string;
            /** Number */
            number: number;
            /** Title */
            title: string;
        };
        /** TimelineEvent */
        TimelineEvent: {
            /** Conflict Id */
            conflict_id: string | null;
            date_time: components["schemas"]["EventDate"];
            event: components["schemas"]["Fact"];
            /** Event Id */
            event_id: string;
            /**
             * Event Status
             * @enum {string}
             */
            event_status: "alleged" | "documented" | "disputed" | "unclear";
            legal_significance: components["schemas"]["Analysis"] | null;
            persons_involved: components["schemas"]["FactGroup"];
        };
        /** Timelines */
        Timelines: {
            /** Incident Factual */
            incident_factual: components["schemas"]["TimelineEvent"][];
            /** Procedural Court */
            procedural_court: components["schemas"]["TimelineEvent"][];
        };
        /** ToggleMunshiRequest */
        ToggleMunshiRequest: {
            /** Is Active */
            is_active?: boolean | null;
        };
        /**
         * UnverifiedSummary
         * @description Preserve a billed provider response without granting it approval authority.
         */
        UnverifiedSummary: {
            /** Raw Text */
            raw_text: string;
            /**
             * Reason
             * @enum {string}
             */
            reason: "invalid_format" | "incomplete_output" | "failed_validation";
            /**
             * Schema Version
             * @default case-summary-unverified-v1
             * @constant
             */
            schema_version: "case-summary-unverified-v1";
        };
        /** UpdateCourtDraftRequest */
        UpdateCourtDraftRequest: {
            /** Edits */
            edits: components["schemas"]["DraftParagraphEdit"][];
            /** Expected Content Hash */
            expected_content_hash: string;
        };
        /** UpdateDocumentRequest */
        UpdateDocumentRequest: {
            /** Display Name */
            display_name?: string | null;
            document_type?: components["schemas"]["DocumentType"] | null;
        };
        /** UpdateMemberIn */
        UpdateMemberIn: {
            /** Revoke */
            revoke?: boolean | null;
            role?: components["schemas"]["ChamberRole"] | null;
        };
        /**
         * UploadStatus
         * @enum {string}
         */
        UploadStatus: "pending" | "uploading" | "uploaded" | "failed" | "quarantined";
        /**
         * UserRole
         * @enum {string}
         */
        UserRole: "lawyer" | "munshi" | "admin";
        /** ValidationError */
        ValidationError: {
            /** Context */
            ctx?: Record<string, never>;
            /** Input */
            input?: unknown;
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
        /** VerificationConfirmRequest */
        VerificationConfirmRequest: {
            /** Code */
            code: string;
            /** Flow */
            flow: string;
        };
        /** VerificationPendingResponse */
        VerificationPendingResponse: {
            /**
             * Message
             * @default If this account is eligible, a verification code is being sent.
             */
            message: string;
            /**
             * Status
             * @default verification_pending
             */
            status: string;
            /** Verification Flow */
            verification_flow?: string | null;
        };
        /** VerificationRequest */
        VerificationRequest: {
            /**
             * Email
             * Format: email
             */
            email: string;
        };
        /** ViewUrlResponse */
        ViewUrlResponse: {
            /**
             * Expires At
             * Format: date-time
             */
            expires_at: string;
            /** Url */
            url: string;
        };
        /** Witness */
        Witness: {
            assertions: components["schemas"]["FactGroup"];
            identity_and_role: components["schemas"]["Fact"];
            /** Inconsistencies */
            inconsistencies: components["schemas"]["Analysis"][];
            statements: components["schemas"]["FactGroup"];
        };
        /** Witnesses */
        Witnesses: {
            /** Witnesses */
            witnesses: components["schemas"]["Witness"][];
        };
        /** WorkflowResumeIntentOut */
        WorkflowResumeIntentOut: {
            /** Attempt Count */
            attempt_count: number;
            /** Celery Task Id */
            celery_task_id: string | null;
            /** Error Code */
            error_code: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Processed At */
            processed_at: string | null;
            status: components["schemas"]["WorkflowResumeIntentStatus"];
        };
        /**
         * WorkflowResumeIntentStatus
         * @enum {string}
         */
        WorkflowResumeIntentStatus: "pending" | "processing" | "processed" | "failed";
        /** WorkflowReviewOut */
        WorkflowReviewOut: {
            /** Decided At */
            decided_at: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Review Summary */
            review_summary: {
                [key: string]: unknown;
            };
            status: components["schemas"]["WorkflowReviewStatus"];
            /** Version */
            version: number;
        };
        /**
         * WorkflowReviewStatus
         * @enum {string}
         */
        WorkflowReviewStatus: "pending" | "approved" | "rejected";
        /** WorkflowRunOut */
        WorkflowRunOut: {
            /** Completed At */
            completed_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Error Code */
            error_code: string | null;
            /** Graph Version */
            graph_version: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Input Manifest Hash */
            input_manifest_hash: string;
            /** Result Summary */
            result_summary: {
                [key: string]: unknown;
            } | null;
            resume_intent?: components["schemas"]["WorkflowResumeIntentOut"] | null;
            review?: components["schemas"]["WorkflowReviewOut"] | null;
            status: components["schemas"]["WorkflowRunStatus"];
            /** Workflow Type */
            workflow_type: string;
        };
        /**
         * WorkflowRunStatus
         * @enum {string}
         */
        WorkflowRunStatus: "pending_review" | "running" | "completed" | "rejected" | "failed";
        /** WorkingDocumentDetailResponse */
        WorkingDocumentDetailResponse: {
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /**
             * Chamber Id
             * Format: uuid
             */
            chamber_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Created By User Id
             * Format: uuid
             */
            created_by_user_id: string;
            /** Document Kind */
            document_kind: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            latest_revision?: components["schemas"]["WorkingDocumentRevisionResponse"] | null;
            /** Latest Revision Number */
            latest_revision_number?: number | null;
            /** Title */
            title: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** WorkingDocumentRevisionResponse */
        WorkingDocumentRevisionResponse: {
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /**
             * Chamber Id
             * Format: uuid
             */
            chamber_id: string;
            /** Client Mutation Id */
            client_mutation_id: string | null;
            /** Content Sha256 */
            content_sha256: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Created By User Id
             * Format: uuid
             */
            created_by_user_id: string;
            /** Editor Document */
            editor_document: {
                [key: string]: unknown;
            };
            /** Editor Schema Version */
            editor_schema_version: number;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Normalized Text */
            normalized_text: string;
            /** Parent Revision Id */
            parent_revision_id: string | null;
            /** Revision Number */
            revision_number: number;
            /** Source Map */
            source_map: {
                [key: string]: unknown;
            }[];
            /** Status */
            status: string;
            /**
             * Working Document Id
             * Format: uuid
             */
            working_document_id: string;
        };
        /** WorkingDocumentSummaryResponse */
        WorkingDocumentSummaryResponse: {
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /**
             * Chamber Id
             * Format: uuid
             */
            chamber_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Created By User Id
             * Format: uuid
             */
            created_by_user_id: string;
            /** Document Kind */
            document_kind: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Latest Revision Number */
            latest_revision_number?: number | null;
            /** Title */
            title: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    annexures_assign_version: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                annexure_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AnnexureAssignRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_change_password: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangePasswordRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_confirm_email_verification: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerificationConfirmRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_MessageData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_request_email_verification: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerificationRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_VerificationPendingResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_forgot_password: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_MessageData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_google_alias: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GoogleLoginRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AuthData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AuthData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_login_google: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GoogleLoginRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AuthData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                refresh_token?: string | null;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["LogoutRequest"] | null;
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_logout_all: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                refresh_token?: string | null;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["RefreshTokenRequest"] | null;
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_RefreshData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_VerificationPendingResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_reset_password: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResetPasswordRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_MessageData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_sessions: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SessionsData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_revoke_session: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                session_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    case_numbers_delete: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                number_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    case_numbers_update: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                number_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CaseNumberUpdateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CaseNumberData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    case_sections_remove: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                section_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SectionData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cases_list: {
        parameters: {
            query?: {
                page?: number;
                limit?: number;
                status?: components["schemas"]["CaseStatus"] | null;
                case_type?: components["schemas"]["CaseType"] | null;
                search?: string | null;
            };
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CasesData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cases_create: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CaseCreateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CaseData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_review_inbox: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_ReviewInboxItem__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cases_get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CaseData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cases_archive: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cases_update: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CaseUpdateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CaseData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cases_grant_access: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CaseAccessGrantRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AccessData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cases_revoke_access: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                user_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    annexures_create: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AnnexureCreateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_list_authority_manifests: {
        parameters: {
            query?: {
                offset?: number;
            };
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_AuthorityManifestResponse__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_create_authority_manifest: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateAuthorityManifestRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AuthorityManifestResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    case_clients_list: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_ClientCaseLinkOut__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    case_clients_link: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClientCaseLinkCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ClientCaseLinkOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    case_clients_unlink: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path: {
                case_id: string;
                client_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_create_court_draft: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCourtDraftRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CourtDraftResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_get_court_draft: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                draft_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CourtDraftResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_update_court_draft: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                draft_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCourtDraftRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CourtDraftResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_enqueue_court_draft_export: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                draft_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EnqueueCourtDraftExportRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CourtDraftExportResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_download_court_draft_export: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                draft_id: string;
                job_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            307: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_generate_court_draft: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                draft_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StartCourtDraftGenerationRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CourtDraftGenerationResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_materialize_court_draft_word_editor: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                draft_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CourtDraftEditorResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_list: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_DocumentsData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_presign: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PresignUploadRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_PresignUploadResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_readiness: {
        parameters: {
            query?: {
                draft_type?: string;
            };
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ReadinessResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_fact_card_coverage: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_FactCardCoverageResponse__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_fact_card_source: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                card_id: string;
                section_index: number;
                finding_index: number;
                citation_index: number;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SummarySourceView_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_get_authority: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                authority_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AuthorityResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_create_passage: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                authority_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AuthorityPassageRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AuthorityPassageResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_fetch_authority: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                upstream_document_id: number;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FetchAuthorityRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AuthorityResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_get_config: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_LegalResearchConfigResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_create_proposition: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePropositionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_PropositionResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_decide_review: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                review_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecideAuthorityReviewRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AuthorityReviewResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_list_runs: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_LegalResearchRunResponse__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_create_run: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateResearchRunRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_LegalResearchRunResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_get_run: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_LegalResearchRunResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    legal_research_submit_run: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_LegalResearchRunResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    case_numbers_create: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CaseNumberCreateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CaseNumberData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    okf_exports_list_annexure_candidates: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_OkfAnnexureCandidateResponse__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    okf_contexts_save: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveOkfContextRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_OkfContextResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    okf_contexts_read: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                snapshot_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_OkfContextResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    okf_draft_status: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                snapshot_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_Union_JobOut__NoneType__"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    okf_draft_submit: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                snapshot_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubmitDraftRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_JobOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    okf_contexts_draft_preflight: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                snapshot_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DraftPreflightRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_DraftPreflightResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    okf_draft_quote: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                snapshot_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DraftGenerationRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_DraftQuoteResponse_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    okf_exports_prepare_preview: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PrepareOkfExportPreviewRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_OkfExportPreviewResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    okf_exports_list_templates: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_OkfTemplateOptionResponse__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    parties_create: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PartyCreateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_PartyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cases_permissions: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_PermissionsData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    proceedings_list: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_ProceedingResponse__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    proceedings_create: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProceedingCreateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ProceedingResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    case_sections_create: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CaseSectionCreateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SectionData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    case_sections_history: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SectionsData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cases_soft_delete: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_list_runs: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_SummaryRunResponse__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_prepare_run: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PrepareSummaryRunRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SummaryRunResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_get_run: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SummaryRunDetailResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_save_review_editor: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveSummaryEditorRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SummaryRunDetailResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_retry_fact_card: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
                card_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RetryFactCardRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SubmitSummaryRunResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_regenerate_incomplete: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SubmitSummaryRunResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_resume_fact_card_deliveries: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SubmitSummaryRunResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_review_decide: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecideSummaryReviewRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SummaryRunDetailResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_open_original_source: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
                finding_id: string;
                citation_index: number;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SummarySourceView_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_submit_run: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SubmitSummaryRunResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summaries_list_source_candidates: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_SummarySourceCandidateResponse__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_list_for_case: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_WorkingDocumentSummaryResponse__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_create: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateWorkingDocumentRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_WorkingDocumentDetailResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    chambers_list_mine: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_ChamberWithMembershipOut__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    chambers_create: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateChamberIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ChamberWithMembershipOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    chambers_list_audit_events: {
        parameters: {
            query?: {
                limit?: number;
            };
            header?: {
                authorization?: string | null;
            };
            path: {
                chamber_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_ChamberAuditEventOut__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    chambers_list_members: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                chamber_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_MembershipOut__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    chambers_add_member: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                chamber_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddMemberIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_MembershipOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    chambers_update_member: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                chamber_id: string;
                membership_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateMemberIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_MembershipOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    chambers_get_provider_policy: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                chamber_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ChamberProviderPolicyOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    chambers_replace_provider_policy: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                chamber_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChamberProviderPolicyIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ChamberProviderPolicyOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    clients_list: {
        parameters: {
            query?: {
                search?: string | null;
                limit?: number;
            };
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_ClientOut__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    clients_create: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClientCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ClientOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    clients_update: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path: {
                client_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClientUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ClientOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    dictation_create_transcription: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_dictation_create_transcription"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_DictationTranscription_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ConfirmUploadResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_delete: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_update: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateDocumentRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ConfirmUploadResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_confirm_upload: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfirmUploadRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ConfirmUploadResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_enqueue_extraction: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EnqueueExtractionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ExtractionJobResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_get_extraction: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
                job_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ExtractionJobStatusResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_cancel_extraction: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
                job_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ExtractionJobStatusResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_multipart_complete: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_multipart_initiate: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_multipart_part_urls: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MultipartPartUrlRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_MultipartPartUrlResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_multipart_record_part: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecordMultipartPartRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_prepare_summary_source: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_OriginalSourceResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_save_source_editor: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveSourceEditorRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_OriginalSourceResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_repair_source_provenance: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReviewSourceEditorRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_OriginalSourceResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_review_source_editor: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReviewSourceEditorRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_OriginalSourceResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_source_ocr_submit: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OcrSubmitRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_JobOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_source_ocr_quote: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OcrPageRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_OcrQuote_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_source_ocr_status: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_SourceOcrStatusResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_review_summary_source: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReviewOriginalRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_OriginalSourceResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    documents_view_url: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ViewUrlResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    editor_sessions_consume: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EditorSessionConsumeRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_WorkingDocumentDetailResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    editor_sessions_create_revision: {
        parameters: {
            query?: never;
            header?: {
                "x-editor-bootstrap-token"?: string | null;
            };
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EditorSessionRevisionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_WorkingDocumentRevisionResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    exports_render: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RenderExportRequest"];
            };
        };
        responses: {
            /** @description Generated DOCX or PDF file */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/pdf": string;
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": string;
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    jobs_enqueue_dummy: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EnqueueDummyJobIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_JobOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    jobs_get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                job_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_JobOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    matters_create_pre_filing: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MatterCreateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_MatterResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    matters_get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                matter_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CaseData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    custody_list: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path: {
                matter_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_list_CustodyOut__"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    custody_create: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path: {
                matter_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustodyIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_CustodyOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    fees_create_agreement: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path: {
                matter_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FeeAgreementIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_FeeAgreementOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    fees_post_entry: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path: {
                matter_id: string;
                agreement_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FeeEntryIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_FeeEntryOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    fees_get_ledger: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path: {
                matter_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_FeeLedgerOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    parties_delete: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                party_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EmptyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    parties_update: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                party_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PartyUpdateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_PartyData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_get_advocate_profile: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AdvocateProfileResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_update_advocate_profile: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdvocateProfileUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AdvocateProfileResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    drafts_update_advocate_court_registration: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                court_code: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdvocateCourtRegistrationUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_AdvocateProfileResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    users_me: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_LawyerProfileResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    users_update_profile: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LawyerProfileUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_LawyerProfileResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    users_list_munshis: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_MunshisData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    users_create_munshi: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateMunshiRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_MunshiData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    users_toggle_munshi: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                user_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ToggleMunshiRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_MunshiData_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    auth_resend_webhook: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    workflow_poc_create: {
        parameters: {
            query?: never;
            header?: {
                "x-chamber-id"?: string | null;
                authorization?: string | null;
            };
            path?: never;
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePocWorkflowIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_WorkflowRunOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    workflow_run_get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                run_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_WorkflowRunOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    workflow_review_decide: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                run_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecideWorkflowReviewIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_WorkflowRunOut_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_WorkingDocumentDetailResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_create_editor_bootstrap: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EditorBootstrapResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_resolve_eligibility: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResolveEligibilityRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_EligibilityResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_enqueue_export: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EnqueueRevisionExportRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_ExportJobResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_download_export: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
                job_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Short-lived redirect to an authorized working-document export */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": string;
                };
            };
            /** @description Successful Response */
            307: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_create_revision: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRevisionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_WorkingDocumentRevisionResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_decide_revision: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
                revision_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecideRevisionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_WorkingDocumentRevisionResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    working_documents_submit_revision: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
            };
            path: {
                document_id: string;
                revision_id: string;
            };
            cookie?: {
                access_token?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubmitRevisionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuccessResponse_WorkingDocumentRevisionResponse_"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Content Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    health_check: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
}
