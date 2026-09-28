# SproutNote Template System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable and freely editable activity, observation, indicator, and report templates with individual and whole-class exports.

**Architecture:** Keep the catalog in a focused pure-data module, extend the model with migration and indicator helpers, and keep browser-only downloads in the React layer. Existing localStorage state is normalized at load time.

**Tech Stack:** React 19, Vite 6, Node test runner, JSZip, GitHub Pages.

---

### Task 1: Template catalog and state compatibility

**Files:** Create `src/lib/templates.js`; modify `src/lib/model.js`, `src/lib/storage.js`; test `tests/model.test.mjs`.

- [x] Add failing tests for three report templates, category-aware observation expansion, legacy-state normalization, and indicator add/remove.
- [x] Run `npm test` and confirm missing exports fail.
- [x] Implement catalog constants plus `normalizeState`, `addIndicator`, `removeIndicator`, and category-aware `expandObservation`.
- [x] Run `npm test` and confirm all model tests pass.

### Task 2: Selectable/editable template interface

**Files:** Modify `src/App.jsx`, `src/styles.css`.

- [x] Add activity name and domain datalists while preserving free typing.
- [x] Add observation type presets while preserving editable keywords and final text.
- [x] Add report template picker, editable title/introduction, and indicator picker.
- [x] Style each report template and responsive controls without adding new navigation.

### Task 3: Share and batch outputs

**Files:** Create `src/lib/export.js`; modify `src/App.jsx`; test `tests/export.test.mjs`.

- [x] Add failing tests for escaped, child-specific HTML report output.
- [x] Implement pure `buildReportHtml` and `buildWordHtml` helpers.
- [x] Add individual HTML download and all-class ZIP actions.
- [x] Run `npm test` and confirm export tests pass.

### Task 4: Build, responsive QA, and deployment

**Files:** Modify `package.json`, `task_plan.md`, `progress.md`.

- [x] Change GitHub Pages output from `docs` to `pages-dist` so planning documents are preserved.
- [x] Run `npm test` and `npm run build:pages` with zero failures.
- [x] Verify desktop, tablet, and 390px mobile template flows in the browser.
- [x] Upload the production bundle to GitHub Pages and verify the live page and assets return HTTP 200.
