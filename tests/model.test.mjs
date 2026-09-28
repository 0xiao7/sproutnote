import test from "node:test";
import assert from "node:assert/strict";
import {
  addChild,
  addIndicator,
  archiveCurrentTerm,
  createInitialState,
  expandObservation,
  normalizeState,
  removeChild,
  removeIndicator,
  reportForChild,
  toggleChildTag,
  updateChild,
} from "../src/lib/model.js";
import { ACTIVITY_PRESETS, OBSERVATION_TYPES, REPORT_TEMPLATES } from "../src/lib/templates.js";

test("seeded state contains a complete photo-to-report demo", () => {
  const state = createInitialState();
  assert.equal(state.children.length, 4);
  assert.equal(state.photos.length, 3);
  assert.equal(state.activities.length, 3);
  assert.ok(state.photos.every((photo) => photo.activityId));
});

test("a photo can be tagged to multiple children without duplicates", () => {
  const state = createInitialState();
  const photo = state.photos[0];
  const once = toggleChildTag(state, photo.id, "child-3");
  const twice = toggleChildTag(once, photo.id, "child-3");
  assert.deepEqual(once.photos[0].childIds.sort(), ["child-1", "child-2", "child-3"]);
  assert.deepEqual(twice.photos[0].childIds.sort(), ["child-1", "child-2"]);
});

test("observation expansion preserves the teacher's concrete keywords", () => {
  const result = expandObservation("自己搭橋、失敗兩次、邀請同學一起");
  assert.match(result, /自己搭橋/);
  assert.match(result, /失敗兩次/);
  assert.match(result, /邀請同學一起/);
  assert.match(result, /老師確認/);
});

test("child report only includes records and photos for that child", () => {
  const state = createInitialState();
  const report = reportForChild(state, "child-1");
  assert.equal(report.child.name, "小安");
  assert.ok(report.photos.length >= 1);
  assert.ok(report.photos.every((photo) => photo.childIds.includes("child-1")));
  assert.ok(report.observations.every((item) => item.childId === "child-1"));
});

test("class roster can add and edit a child", () => {
  const state = createInitialState();
  const added = addChild(state, { id: "child-new", seat: 5, name: "朵朵", color: "#7B8D6A" });
  assert.equal(added.children.at(-1).name, "朵朵");
  const edited = updateChild(added, "child-new", { seat: 8, name: "朵朵 Lin" });
  assert.deepEqual(edited.children.at(-1), { id: "child-new", seat: 8, name: "朵朵 Lin", color: "#7B8D6A" });
});

test("removing a child also removes their private links", () => {
  const state = createInitialState();
  const removed = removeChild(state, "child-1");
  assert.ok(!removed.children.some((child) => child.id === "child-1"));
  assert.ok(removed.photos.every((photo) => !photo.childIds.includes("child-1")));
  assert.ok(removed.observations.every((item) => item.childId !== "child-1"));
  assert.equal(removed.indicators["child-1"], undefined);
});

test("template catalogs provide selectable report, activity and observation content", () => {
  assert.deepEqual(REPORT_TEMPLATES.map((item) => item.id), ["classic", "photo-story", "semester"]);
  assert.ok(ACTIVITY_PRESETS.includes("美術創作"));
  assert.ok(OBSERVATION_TYPES.some((item) => item.id === "cooperation"));
});

test("legacy saved state is normalized without losing records", () => {
  const legacy = createInitialState();
  delete legacy.classMeta.ownerName;
  delete legacy.reportSettings;
  const normalized = normalizeState(legacy);
  assert.equal(normalized.classMeta.ownerName, "Fay");
  assert.equal(normalized.reportSettings.templateId, "classic");
  assert.equal(normalized.photos.length, legacy.photos.length);
  assert.equal(normalized.children.length, legacy.children.length);
});

test("personal workspace stores an editable recorder name", () => {
  const state = createInitialState();
  assert.equal(state.classMeta.ownerName, "Fay");
  assert.equal(reportForChild(state, "child-1").classMeta.ownerName, "Fay");
});

test("current term can be archived as a complete historical record", () => {
  const state = createInitialState();
  const archived = archiveCurrentTerm(state);
  assert.equal(archived.history.length, 1);
  assert.equal(archived.history[0].classMeta.period, "2026 上學期");
  assert.equal(archived.history[0].classMeta.ownerName, "Fay");
  assert.equal(archived.history[0].children.length, state.children.length);
  assert.equal(archived.history[0].photos.length, state.photos.length);
  assert.equal(archived.history[0].observations.length, state.observations.length);
  assert.equal(state.history.length, 0);
});

test("archiving the unchanged term updates its snapshot instead of duplicating it", () => {
  const once = archiveCurrentTerm(createInitialState());
  const twice = archiveCurrentTerm(once);
  assert.equal(twice.history.length, 1);
});

test("observation expansion uses a selected type while preserving editable keywords", () => {
  const result = expandObservation("輪流、分享材料", "cooperation");
  assert.match(result, /合作互動/);
  assert.match(result, /輪流/);
  assert.match(result, /分享材料/);
});

test("indicators can be added once and removed per child", () => {
  const state = createInitialState();
  const added = addIndicator(state, "child-1", "能描述自己的策略");
  const deduped = addIndicator(added, "child-1", "能描述自己的策略");
  assert.equal(deduped.indicators["child-1"].filter((value) => value === "能描述自己的策略").length, 1);
  const removed = removeIndicator(deduped, "child-1", "能描述自己的策略");
  assert.ok(!removed.indicators["child-1"].includes("能描述自己的策略"));
});
