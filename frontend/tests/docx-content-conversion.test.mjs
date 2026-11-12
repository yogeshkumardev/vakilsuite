import test from 'node:test';
import assert from 'node:assert/strict';
import {
    isBase64Docx,
    extractBase64FromContent,
    base64ToArrayBuffer,
    arrayBufferToBase64,
    parseContentToDocxDocument,
    buildEditorSavePayload,
    extractPlainTextFromSavePayload,
} from '../src/features/docx-editor/content-conversion.ts';

test('isBase64Docx detects raw base64 and JSON wrapped base64', () => {
    assert.equal(isBase64Docx('UEsDBBQAAAAIA...'), true);
    assert.equal(isBase64Docx('data:application/vnd.openxmlformats-officedocument;base64,UEsDB...'), true);
    assert.equal(isBase64Docx(JSON.stringify({ docx_base64: 'UEsDBBQAAAAIA' })), true);
    assert.equal(isBase64Docx('Plain text document'), false);
    assert.equal(isBase64Docx('{"root":{"children":[]}}'), false);
});

test('base64 <-> ArrayBuffer conversion roundtrips', () => {
    const originalText = "Bail application under Section 439 CrPC / BNSS 528";
    const encoder = new TextEncoder();
    const buffer = encoder.encode(originalText).buffer;
    const b64 = arrayBufferToBase64(buffer);
    const roundtripped = base64ToArrayBuffer(b64);
    const decoder = new TextDecoder();
    assert.equal(decoder.decode(roundtripped), originalText);
});

test('parseContentToDocxDocument handles empty/null content gracefully', () => {
    const doc = parseContentToDocxDocument(null);
    assert.ok(doc);
    assert.ok(doc.package);
    assert.ok(doc.package.document);
    assert.equal(Array.isArray(doc.package.document.content), true);
});

test('parseContentToDocxDocument parses plain text and markdown headings', () => {
    const markdown = `# IN THE COURT OF SESSIONS JUDGE
## Bail Application No. 42
This is the **applicant's** statement of facts.
Second paragraph with *evidence*.`;

    const doc = parseContentToDocxDocument(markdown);
    assert.ok(doc);
    const content = doc.package.document.content;
    assert.equal(content.length, 4);

    // First paragraph should be heading 1 (bold, 32 half-points)
    assert.equal(content[0].type, 'paragraph');
    assert.equal(content[0].content[0].formatting.bold, true);
    assert.equal(content[0].content[0].formatting.fontSize, 32);
    assert.equal(content[0].content[0].content[0].text, 'IN THE COURT OF SESSIONS JUDGE');

    // Second paragraph heading 2 (bold, 28 half-points)
    assert.equal(content[1].content[0].formatting.fontSize, 28);
    assert.equal(content[1].content[0].content[0].text, 'Bail Application No. 42');

    // Third paragraph has bold run
    const thirdRuns = content[2].content;
    assert.equal(thirdRuns.some(r => r.formatting?.bold && r.content[0]?.text === "applicant's"), true);
});

test('parseContentToDocxDocument parses Lexical JSON structure', () => {
    const lexicalJson = JSON.stringify({
        editorState: {
            root: {
                type: 'root',
                children: [
                    {
                        type: 'paragraph',
                        children: [
                            { type: 'text', text: 'Typed by LLM page content', format: 1 } // bold
                        ]
                    }
                ]
            }
        }
    });

    const doc = parseContentToDocxDocument(lexicalJson);
    assert.ok(doc);
    const paragraphs = doc.package.document.content;
    assert.equal(paragraphs.length, 1);
    assert.equal(paragraphs[0].content[0].content[0].text, 'Typed by LLM page content');
    assert.equal(paragraphs[0].content[0].formatting.bold, true);
});

test('parseContentToDocxDocument parses source-page container nodes (OCR typing output)', () => {
    const ocrTypedJson = JSON.stringify({
        schemaVersion: 1,
        editorState: {
            root: {
                type: 'root',
                children: [
                    {
                        type: 'source-page',
                        pageNumber: 1,
                        children: [
                            {
                                type: 'paragraph',
                                children: [
                                    { type: 'text', text: 'IN THE HIGH COURT OF JUDICATURE AT ALLAHABAD' }
                                ]
                            },
                            {
                                type: 'paragraph',
                                children: [
                                    { type: 'text', text: 'Criminal Misc. Bail Application No. 1234 of 2024' }
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    });

    const doc = parseContentToDocxDocument(ocrTypedJson);
    assert.ok(doc);
    const paragraphs = doc.package.document.content;
    assert.equal(paragraphs.length, 2, 'both paragraphs in source-page must be extracted');
    assert.equal(paragraphs[0].content[0].content[0].text, 'IN THE HIGH COURT OF JUDICATURE AT ALLAHABAD');
    assert.equal(paragraphs[1].content[0].content[0].text, 'Criminal Misc. Bail Application No. 1234 of 2024');
});

test('buildEditorSavePayload produces JSON matching backend validate_editor_document contract', () => {
    const encoder = new TextEncoder();
    const fakeBuffer = encoder.encode("UEsDB_FAKE_DOCX").buffer;

    // Build a minimal docx-core Document shape for text extraction
    const mockDocument = {
        package: {
            document: {
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'run', content: [{ type: 'text', text: 'Line 1' }], formatting: {} }
                        ],
                        formatting: {}
                    },
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'run', content: [{ type: 'text', text: 'Line 2' }], formatting: {} }
                        ],
                        formatting: {}
                    }
                ]
            }
        }
    };

    const payloadStr = buildEditorSavePayload(fakeBuffer, mockDocument);
    const parsed = JSON.parse(payloadStr);

    assert.equal(parsed.schemaVersion, 1);
    // Backend strictly enforces set(parsed) == {'schemaVersion', 'editorState', 'pageLayout'}
    const topKeys = Object.keys(parsed).sort();
    assert.deepEqual(topKeys, ['editorState', 'pageLayout', 'schemaVersion']);

    assert.ok(parsed.editorState?.root?.children);
    assert.equal(parsed.editorState.root.children.length, 2, 'one child per paragraph');
    assert.equal(parsed.editorState.root.children[0].children[0].text, 'Line 1');
    assert.equal(parsed.editorState.root.children[1].children[0].text, 'Line 2');
});

test('extractPlainTextFromSavePayload extracts text from dual-format JSON', () => {
    const encoder = new TextEncoder();
    const fakeBuffer = encoder.encode("UEsDB_FAKE_DOCX").buffer;
    const mockDocument = {
        package: {
            document: {
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'run', content: [{ type: 'text', text: 'First paragraph' }], formatting: {} }],
                        formatting: {}
                    },
                    {
                        type: 'paragraph',
                        content: [{ type: 'run', content: [{ type: 'text', text: 'Second paragraph' }], formatting: {} }],
                        formatting: {}
                    }
                ]
            }
        }
    };

    const payload = buildEditorSavePayload(fakeBuffer, mockDocument);
    const plainText = extractPlainTextFromSavePayload(payload);

    assert.ok(plainText.includes('First paragraph'), 'must contain first paragraph text');
    assert.ok(plainText.includes('Second paragraph'), 'must contain second paragraph text');
});

test('extractPlainTextFromSavePayload returns plain text unchanged when not JSON', () => {
    const plain = 'This is plain text, not JSON.';
    assert.equal(extractPlainTextFromSavePayload(plain), plain);
});

test('parseContentToDocxDocument splits multiline text into discrete paragraphs to prevent text overlap', () => {
    // OCR typing task typically outputs multiline text inside a single paragraph node
    const ocrMultilineJson = JSON.stringify({
        editorState: {
            root: {
                type: 'root',
                children: [
                    {
                        type: 'source-page',
                        pageNumber: 1,
                        children: [
                            {
                                type: 'paragraph',
                                children: [
                                    {
                                        type: 'text',
                                        text: 'Line 1: High Court of Allahabad\nLine 2: Writ Petition 1234\nLine 3: Notice of Motion'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    });

    const doc = parseContentToDocxDocument(ocrMultilineJson);
    assert.ok(doc);
    const paragraphs = doc.package.document.content;
    assert.equal(paragraphs.length, 3, 'multiline text with 3 lines must split into 3 discrete Paragraphs');
    assert.equal(paragraphs[0].content[0].content[0].text, 'Line 1: High Court of Allahabad');
    assert.equal(paragraphs[1].content[0].content[0].text, 'Line 2: Writ Petition 1234');
    assert.equal(paragraphs[2].content[0].content[0].text, 'Line 3: Notice of Motion');

    // Crucial check: NO paragraph's text run should ever contain a newline character!
    for (const para of paragraphs) {
        for (const run of para.content) {
            for (const item of run.content) {
                if (item.type === 'text') {
                    assert.equal(item.text.includes('\n'), false, 'text run must never contain raw newline');
                    assert.equal(item.text.includes('\r'), false, 'text run must never contain carriage return');
                }
            }
        }
    }
});

test('parseContentToDocxDocument handles Lexical linebreak nodes by splitting paragraphs', () => {
    const linebreakJson = JSON.stringify({
        editorState: {
            root: {
                type: 'root',
                children: [
                    {
                        type: 'paragraph',
                        children: [
                            { type: 'text', text: 'Before Break' },
                            { type: 'linebreak' },
                            { type: 'text', text: 'After Break' }
                        ]
                    }
                ]
            }
        }
    });

    const doc = parseContentToDocxDocument(linebreakJson);
    assert.ok(doc);
    const paragraphs = doc.package.document.content;
    assert.equal(paragraphs.length, 2, 'linebreak node must split into 2 paragraphs');
    assert.equal(paragraphs[0].content[0].content[0].text, 'Before Break');
    assert.equal(paragraphs[1].content[0].content[0].text, 'After Break');
});
