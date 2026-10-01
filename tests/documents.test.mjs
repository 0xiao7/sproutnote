import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { archiveCurrentTerm, createInitialState, normalizeState, reportForChild } from "../src/lib/model.js";

const ids = [
  "whole-school", "gross-motor", "field-trip", "teaching-record", "formative",
  "summative", "monthly-plan", "daily-routine", "contact-text", "contact-photo",
  "contact-qr", "course-share", "notice",
];

test("the source-derived catalog covers thirteen safe, editable document types", async () => {
  const { DOCUMENT_TEMPLATES, createDefaultDocumentDraft } = await import("../src/lib/documentCatalog.js");
  assert.deepEqual(DOCUMENT_TEMPLATES.map((item) => item.id), ids);
  assert.ok(DOCUMENT_TEMPLATES.every((item) => item.fields.length > 0 && item.pageSize && item.orientation));
  assert.equal(DOCUMENT_TEMPLATES.find((item) => item.id === "course-share").pageSize, "A3");
  assert.equal(DOCUMENT_TEMPLATES.find((item) => item.id === "course-share").orientation, "landscape");
  assert.equal(DOCUMENT_TEMPLATES.find((item) => item.id === "course-share").cellsPerPage, 6);
  assert.equal(DOCUMENT_TEMPLATES.find((item) => item.id === "contact-text").pageSize, "A3");
  assert.equal(DOCUMENT_TEMPLATES.find((item) => item.id === "contact-text").cellsPerPage, 12);
  assert.equal(DOCUMENT_TEMPLATES.find((item) => item.id === "formative").pageSize, "A4");
  assert.deepEqual(createDefaultDocumentDraft("notice").rows, []);
  const publicCatalog = JSON.stringify(DOCUMENT_TEMPLATES);
  assert.doesNotMatch(publicCatalog, /data:image|https?:\/\//);
});

test("each template produces a valid editable DOCX package", async () => {
  const { createDefaultDocumentDraft } = await import("../src/lib/documentCatalog.js");
  const { buildWordBlob } = await import("../src/lib/wordDocuments.js");
  const state = createInitialState();
  for (const id of ids) {
    const draft = createDefaultDocumentDraft(id);
    draft.fields.topic = "樹葉觀察";
    draft.fields.body = "孩子觀察葉子的顏色與形狀";
    const blob = await buildWordBlob(id, state, draft, state.children[0].id);
    assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", id);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    assert.ok(zip.file("[Content_Types].xml"), id);
    const xml = await zip.file("word/document.xml").async("string");
    assert.match(xml, /w:tbl|w:p/, id);
    assert.match(xml, /晨光幼兒園/, id);
  }
});

test("individual contact book uses only the selected child's observations", async () => {
  const { createDefaultDocumentDraft } = await import("../src/lib/documentCatalog.js");
  const { buildWordBlob } = await import("../src/lib/wordDocuments.js");
  const state = createInitialState();
  const blob = await buildWordBlob("contact-text", state, createDefaultDocumentDraft("contact-text"), "child-1");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /小安/);
  assert.match(xml, /自己搭橋/);
  assert.doesNotMatch(xml, /樂樂用放大鏡/);
});

test("whole-class contact export contains one DOCX per child", async () => {
  const { createDefaultDocumentDraft } = await import("../src/lib/documentCatalog.js");
  const { buildClassZipBlob } = await import("../src/lib/wordDocuments.js");
  const state = createInitialState();
  const zipBlob = await buildClassZipBlob("contact-text", state, createDefaultDocumentDraft("contact-text"));
  const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
  const files = Object.keys(zip.files).filter((name) => name.endsWith(".docx"));
  assert.equal(files.length, state.children.length);
  assert.ok(files.some((name) => name.includes("小安")));
});

test("whole-class assessment Word includes all children", async () => {
  const { createDefaultDocumentDraft } = await import("../src/lib/documentCatalog.js");
  const { buildClassWordBlob } = await import("../src/lib/wordDocuments.js");
  const state = createInitialState();
  const blob = await buildClassWordBlob("formative", state, createDefaultDocumentDraft("formative"));
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /小安/);
  assert.match(xml, /樂樂/);
  assert.match(xml, /米米/);
  assert.match(xml, /阿澄/);
});

test("A3 contact pages reflow from twelve cells when individual content grows", async () => {
  const { planChildPages } = await import("../src/lib/documentLayout.js");
  const short = Array.from({ length: 25 }, (_, index) => ({ id: `c${index}`, text: "今天參與活動。", photoCount: 0 }));
  const standard = planChildPages("contact-text", short);
  assert.equal(standard.cellsPerPage, 12);
  assert.deepEqual(standard.pages.map((page) => page.length), [12, 12, 1]);
  const long = short.map((item) => ({ ...item, text: "共同探索與分享。".repeat(24) }));
  const expanded = planChildPages("contact-text", long);
  assert.ok(expanded.cellsPerPage < 12);
  assert.equal(expanded.pages.flat().length, 25);
});

test("monthly course sharing chooses four or six cells from content density", async () => {
  const { planChildPages } = await import("../src/lib/documentLayout.js");
  const short = Array.from({ length: 13 }, (_, index) => ({ id: `c${index}`, text: "觀察樹葉。", photoCount: 1 }));
  assert.deepEqual(planChildPages("course-share", short).pages.map((page) => page.length), [6, 6, 1]);
  const rich = short.map((item) => ({ ...item, text: "探索樹葉並分享自己的發現。".repeat(16), photoCount: 2 }));
  const layout = planChildPages("course-share", rich);
  assert.equal(layout.cellsPerPage, 4);
  assert.deepEqual(layout.pages.map((page) => page.length), [4, 4, 4, 1]);
});

test("ordinary photo and QR contact pages keep twelve cells for light content", async () => {
  const { planChildPages } = await import("../src/lib/documentLayout.js");
  const entries = Array.from({ length: 12 }, (_, index) => ({ id: `c${index}`, text: "今天的學習", photoCount: 1, linkCount: 1 }));
  assert.equal(planChildPages("contact-photo", entries).cellsPerPage, 12);
  assert.equal(planChildPages("contact-qr", entries).cellsPerPage, 12);
  assert.equal(planChildPages("contact-photo", entries.map((entry) => ({ ...entry, photoCount: 2 }))).cellsPerPage, 6);
});

test("document drafts survive state normalization and term archives", () => {
  const state = createInitialState();
  state.documentDrafts["contact-text"] = { fields: { common: "本週共讀" }, rows: [], childNotes: { "child-1": "小安完成拼圖" }, photoIds: [] };
  assert.equal(normalizeState(state).documentDrafts["contact-text"].fields.common, "本週共讀");
  assert.equal(archiveCurrentTerm(state).history[0].documentDrafts["contact-text"].childNotes["child-1"], "小安完成拼圖");
});

test("growth report uses a genuine editable DOCX", async () => {
  const { buildGrowthReportBlob } = await import("../src/lib/wordDocuments.js");
  const state = createInitialState();
  const blob = await buildGrowthReportBlob(reportForChild(state, "child-1"), { title: "成長報告", intro: "一起長大" });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /小安/);
  assert.match(xml, /一起長大/);
  assert.match(xml, /自己搭橋/);
});

test("contact QR and selected photo are embedded as Word media", async () => {
  const { createDefaultDocumentDraft } = await import("../src/lib/documentCatalog.js");
  const { buildWordBlob } = await import("../src/lib/wordDocuments.js");
  const state = createInitialState();
  const qrDraft = createDefaultDocumentDraft("contact-qr");
  qrDraft.fields.link1 = "https://example.com/class-story";
  const qrZip = await JSZip.loadAsync(await (await buildWordBlob("contact-qr", state, qrDraft, "child-1")).arrayBuffer());
  assert.ok(Object.keys(qrZip.files).some((name) => name.startsWith("word/media/") && name.endsWith(".png")));
  state.photos = [{ id: "sample", src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", title: "葉子", childIds: ["child-1"] }];
  const photoDraft = createDefaultDocumentDraft("contact-photo");
  photoDraft.photoIds = ["sample"];
  const photoZip = await JSZip.loadAsync(await (await buildWordBlob("contact-photo", state, photoDraft, "child-1")).arrayBuffer());
  assert.ok(Object.keys(photoZip.files).some((name) => name.startsWith("word/media/") && name.endsWith(".png")));
});
