# Real school document output

## Source and scope

Fourteen user-provided DOCX files were inspected as layout references. They cover whole-school activities, gross-motor planning, community visits, teaching records, formative and summative assessment, monthly planning, teacher schedules, contact books with text/photographs/QR codes, course sharing, and a parent notice. The source files remain in Downloads and are never copied into the public site.

## Design

Add a seventh app area, 文件, with a catalog of thirteen editable document types. The same class metadata, child roster, observations, indicators, and tagged photos already stored by SproutNote feed the drafts. A form exposes per-document fields, repeatable rows, a child picker where relevant, and a photo picker. Class-wide contact and assessment output is available as a ZIP of individual, editable `.docx` files.

Generate OOXML documents in the browser with `docx`. The document layout follows the source's paper size/orientation and major table grid. The user's current production rule governs contact output: regular text, photo, and QR contact books use A3 with twelve child cells per side when content is short, automatically reducing to eight or six cells as density increases; end-of-month course sharing uses A3 with four to six child cells per side. Other references use A4 portrait. The Word file is a real DOCX ZIP package containing editable paragraphs, tables, images, and QR codes. The existing HTML report remains available as a separate share output. The former HTML-disguised `.doc` growth-report download is replaced with a genuine `.docx`.

## Privacy and defaults

The deployed template catalog contains only generic field labels and structure. It contains no source photos, QR codes, school name, teacher name, or child names. User-entered content stays in the existing local browser state and is embedded into the downloaded document only when the user requests export. Empty fields remain blank, except class metadata that the user already supplied.

## Acceptance

- Each catalog item produces an OOXML DOCX that Word/LibreOffice opens.
- Every output reflects the selected school, class, teacher, period, child, and editable document text.
- All thirteen source-derived document types use the correct A4/A3 and portrait/landscape layout family.
- Image layouts embed selected local photos; QR layouts render entered links into scannable QR images.
- Whole-class export contains separate child-specific documents and does not mix observations across children.
- Existing reports, history, responsive layout, and GitHub Pages PWA still work.
