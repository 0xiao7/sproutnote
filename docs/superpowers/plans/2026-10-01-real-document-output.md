# Real School Document Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate editable Word documents matching the layout families of the fourteen provided school examples.

**Architecture:** A source-safe catalog describes the thirteen output types, a document generator builds OOXML in the browser, and a seventh screen collects editable fields and connects existing local class data and photos. A child-specific ZIP exporter uses the same generator.

**Tech Stack:** React 19, Vite 6, docx 9, qrcode, JSZip, Node test runner, LibreOffice, GitHub Pages.

---

### Task 1: Define output contracts

**Files:** Create `src/lib/documentCatalog.js`, `tests/documents.test.mjs`.

- [ ] Add failing tests for catalog coverage, paper format, privacy-safe defaults, and child-specific output.
- [ ] Run `node --test tests/documents.test.mjs` and confirm failures identify the missing generator.
- [ ] Add generic schema and default drafts, then rerun catalog tests.

### Task 2: Generate real Word files

**Files:** Create `src/lib/wordDocuments.js`; modify `package.json`, `package-lock.json`; test `tests/documents.test.mjs`.

- [ ] Add the DOCX and QR dependencies.
- [ ] Build shared document primitives for A4/A3 sections, headings, tables, photos, and QR images.
- [ ] Implement all catalog layout families and ZIP batch output.
- [ ] Inspect the generated OOXML and render one sample from each layout family through LibreOffice.

### Task 3: Add the document editor

**Files:** Create `src/DocumentCenter.jsx`, `src/documentStyles.css`; modify `src/App.jsx`, `src/lib/model.js`.

- [ ] Add persistent document drafts and a seventh navigation item.
- [ ] Add template selection, editable text, repeatable table rows, child selection, photo selection, and download actions.
- [ ] Check 1280px, 768px, and 390px screens for clipping and horizontal overflow.

### Task 4: Verify and deploy

**Files:** Update `docs` production assets.

- [ ] Run all tests and the Pages build.
- [ ] Render outputs and compare them with the source document families.
- [ ] Push verified assets and confirm the live GitHub Pages version loads the new document screen and downloads DOCX.
