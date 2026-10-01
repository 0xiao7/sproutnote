import test from "node:test";
import assert from "node:assert/strict";
import { buildReportHtml } from "../src/lib/export.js";
import { createInitialState, reportForChild } from "../src/lib/model.js";

test("family HTML report is child-specific and escapes editable text", () => {
  const state = createInitialState();
  const report = reportForChild(state, "child-1");
  const html = buildReportHtml(report, { title: "小安 <成長>", intro: "老師 & 家長一起看", templateId: "photo-story" });
  assert.match(html, /小安 &lt;成長&gt;/);
  assert.match(html, /老師 &amp; 家長一起看/);
  assert.match(html, /紀錄者：Fay/);
  assert.match(html, /讓小車過橋/);
  assert.doesNotMatch(html, /樂樂用放大鏡/);
});
