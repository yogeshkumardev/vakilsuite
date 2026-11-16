# Allahabad regular bail draft: sample comparison

Compared the two PDFs in `raw_drafts/` and inspected the reference DOCX. This is a formatting and structure comparison, not a finding that the reference sample overrides court rules. Client and case names are intentionally omitted.

| Priority | Observed difference | Evidence | Action |
| --- | --- | --- | --- |
| P0 | Generated draft is 7 pages; reference is 14 pages. Much of the difference is missing case-specific affidavit narrative, not merely spacing. | PDF page counts; generated application and affidavit pages versus reference pages 5–13 | Requires a separate, cited affidavit narrative generation and review step. Not fixed by renderer changes. |
| P0 | Index is only a header; reference has a five-column index with document rows. | Reference DOCX table: 11 rows, five columns; renderer previously wrote one header row and four columns | Five columns and available annexure rows now rendered. Upload-to-annexure mapping remains required to populate a complete index; no document names or page numbers are invented. |
| P1 | Multiline court title, applicant metadata, affidavit and prayer were written into single justified paragraphs. | Blueprint multiline templates and former `render_court_draft_docx` loop | Renderer now creates distinct paragraphs and centers court/section headings while right aligning case metadata. |
| P1 | Application, affidavit and parcha lacked deliberate page starts. | Reference PDF application starts page 3, affidavit starts page 5; previous renderer only broke before annexure covers | Renderer now starts those components on new pages. Actual page numbers will vary with case facts. |
| P1 | Reference uses 8.5 × 14 in paper; generated PDF uses 8.05 × 14 in. Reference DOCX margins are left 1.8, right 1.0, top 1.0, bottom 1.0 in. | PDF media boxes and reference DOCX section | Kept the saved court rules (8.05 × 14, left 1.75, top 1.5) pending independent court-rule review. Sample formatting alone cannot override the cited rule configuration. |
| P1 | Reference has substantial numbered affidavit paragraphs and repeated full case captions. Current blueprint has a single multiline affidavit template and Gemini writes only facts, grounds and prayer in the application. | Reference DOCX paragraphs 127–160 and current bail blueprint | Needs reviewed blueprint and structured paragraph output, with provenance and section guards. Not automatically copied from a different case. |
| P2 | Reference uses inconsistent manual spaces/tabs and has some wording and gender inconsistencies. | Reference DOCX paragraph runs and PDF text | Do not copy these errors into code. Use controlled alignment, numbering and case-specific validation instead. |

The renderer changes affect newly rendered drafts. An existing Word-editor revision retains its original DOCX bytes and will not silently change. A fresh draft from the updated blueprint is needed for a visual comparison. No provider call is needed to test renderer layout with synthetic content.

## Blueprint v3 follow-up

For Allahabad physical filing, draft creation now builds the annexure index from the approved summary's exact original file versions. Each selected PDF filename needs one unique `Annexure-01` style number; the server rejects missing or duplicate numbers. Index document dates and final pagination remain visible lawyer-confirmation placeholders. This filename rule applies at draft creation, so unrelated uploads do not enter the index.

The affidavit template leaves prior bail applications, criminal history, special matter categories, deponent knowledge, copy legibility and verification ranges as unconfirmed lawyer placeholders. Gemini receives the approved summary and an ordered list of cited findings. It must return one paragraph for each selected finding; missing, duplicate, reordered or unknown finding IDs stop publication. Each saved paragraph keeps the original citation and source revision hash. The reference draft is a structure and style target, not a source of facts. Live provider output and DOCX/PDF visual quality still require lawyer review against the supplied sample.

The Section 483 caption now uses the official spelling “Bharatiya Nagarik Suraksha Sanhita, 2023” verified against [India Code](https://www.indiacode.nic.in/indiacode/handle/123456789/20099?view_type=browse); the sample's spelling is not copied.

Synthetic layout inspection generated 11 pages for thirty short case-specific affidavit paragraphs and seven annexure references before the separate-cover page-break adjustment. Page count alone is not a quality score: the reference's longer prose and court-sourced 8.05 × 14 inch page rule differ from this synthetic text and the sample PDF's 8.5 × 14 inch page size. Every annexure cover now starts on a separate page. The final PDF must be compared on actual reviewed prose after an explicit generation request.
