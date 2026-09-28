# Personal Workspace and History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make all personal/class identity fields editable and add complete local term archives.

**Architecture:** Extend `classMeta` with `ownerName`, normalize legacy state, store immutable term snapshots in `history`, and expose archive/download controls on the existing class screen.

**Tech Stack:** React 19, localStorage, Node test runner, Vite, GitHub Pages.

---

### Task 1: Model and export signature

- [x] Add failing tests for legacy owner-name migration, report signatures, complete term snapshots, and archive deduplication.
- [x] Add `ownerName`, `history`, and `archiveCurrentTerm` to the model.
- [x] Include the recorder name in HTML and Word report bodies.
- [x] Run the complete test suite.

### Task 2: Personal workspace and history UI

- [x] Add editable recorder, school, class, period, age-group, seat, and child-name fields.
- [x] Synchronize owner/class values to the top bar, sidebar, report settings, preview, and footer.
- [x] Add term archive cards, counts, deduplication, and complete JSON download.
- [x] Verify desktop and 390px mobile layouts without horizontal overflow.

### Task 3: Publish

- [ ] Copy the production bundle into the GitHub Pages source directory.
- [ ] Commit and push source plus production assets.
- [ ] Verify GitHub Pages deployment and live HTTP responses.
