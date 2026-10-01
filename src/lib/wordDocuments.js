import {
  AlignmentType, BorderStyle, Document, Footer, HeightRule, ImageRun, PageOrientation,
  Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign,
  WidthType,
} from "docx";
import JSZip from "jszip";
import QRCode from "qrcode";
import { createDefaultDocumentDraft, getDocumentTemplate } from "./documentCatalog.js";
import { planChildPages } from "./documentLayout.js";
import { reportForChild } from "./model.js";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const INK = "243A32";
const BORDER = { style: BorderStyle.SINGLE, size: 5, color: "6F7771" };
const BORDERS = { top: BORDER, right: BORDER, bottom: BORDER, left: BORDER };
const PAGE = { A4: [11906, 16838], A3: [16838, 23811] };
const FONT = "PingFang TC";

const txt = (value) => String(value ?? "").trim();
const para = (value = "", options = {}) => new Paragraph({
  spacing: { after: options.after ?? 80, line: options.line ?? 320 },
  alignment: options.align || AlignmentType.LEFT,
  children: [new TextRun({ text: txt(value), bold: Boolean(options.bold), size: options.size || 20, color: options.color || INK, font: FONT })],
});
const lines = (value, options = {}) => String(value || "").split(/\r?\n/).map((part) => para(part, options));
const heading = (value) => para(value, { bold: true, size: 24, after: 140 });
const blankParagraph = () => para(" ", { after: 0 });

function cell(value, width, options = {}) {
  const children = Array.isArray(value) ? value : lines(value, { size: options.size || 18, bold: options.bold, after: 40 });
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    shading: options.header ? { fill: "E9EEE9", type: ShadingType.CLEAR } : undefined,
    margins: { top: 85, bottom: 85, left: 110, right: 110 },
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: options.columnSpan,
    children: children.length ? children : [blankParagraph()],
  });
}

function table(headers, data, widths, options = {}) {
  const total = widths.reduce((sum, value) => sum + value, 0);
  const rows = [];
  if (headers?.length) rows.push(new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((value, index) => cell(value, widths[index], { header: true, bold: true, size: options.headerSize || 18 })) }));
  for (const record of data) rows.push(new TableRow({ cantSplit: true, children: record.map((value, index) => cell(value, widths[index], { size: options.size || 18 })) }));
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows, layout: "fixed" });
}

function labelValue(label, value) {
  return para(`${label}：${txt(value)}`, { after: 110 });
}

function block(label, value) {
  return [heading(label), ...lines(value || " ", { after: 130 })];
}

function normalizeDraft(templateId, draft) {
  const empty = createDefaultDocumentDraft(templateId);
  return {
    ...empty, ...draft,
    fields: { ...empty.fields, ...(draft?.fields || {}) },
    rows: Array.isArray(draft?.rows) ? draft.rows : [],
    childNotes: draft?.childNotes || {},
    photoIds: Array.isArray(draft?.photoIds) ? draft.photoIds : [],
  };
}

function context(templateId, state, draft, childId) {
  const template = getDocumentTemplate(templateId);
  const normalized = normalizeDraft(templateId, draft);
  const report = childId ? reportForChild(state, childId) : null;
  const meta = state.classMeta || {};
  const individual = childId ? normalized.childNotes[childId] : "";
  const observationText = report?.observations.map((item) => item.text).join("\n") || "";
  const body = individual || normalized.fields.body || observationText;
  const photos = (normalized.photoIds.length
    ? state.photos.filter((item) => normalized.photoIds.includes(item.id))
    : report?.photos || [])
    .filter((item) => !childId || item.childIds.includes(childId));
  return { template, draft: normalized, f: normalized.fields, report, meta, body, photos };
}

function documentHeader(ctx, title = ctx.template.name) {
  const { meta } = ctx;
  const subtitle = [meta.period, meta.className, ctx.report?.child.name].filter(Boolean).join("　·　");
  return [
    para(meta.school || "園所名稱", { align: AlignmentType.CENTER, bold: true, size: 22, after: 70 }),
    para(title, { align: AlignmentType.CENTER, bold: true, size: 30, after: 100 }),
    para(subtitle, { align: AlignmentType.CENTER, size: 18, after: 160 }),
  ];
}

function tableForDraft(ctx, widths, fallbackRows) {
  const { template, draft } = ctx;
  const records = draft.rows.length ? draft.rows : fallbackRows;
  const values = records.map((record) => template.columns.map((column) => record[column.key] || " "));
  return table(template.columns.map((column) => column.label), values, widths);
}

function imageBytes(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  if (!base64) return null;
  const binary = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { bytes, type: header.includes("image/png") ? "png" : "jpg" };
}

async function loadPhotoData(src, imageCache) {
  if (!imageCache.has(src)) imageCache.set(src, (async () => {
    let data;
    if (src.startsWith("data:")) data = imageBytes(src);
    else {
      const response = await fetch(src);
      if (!response.ok) return null;
      const blob = await response.blob();
      data = { bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type.includes("png") ? "png" : "jpg" };
    }
    if (!data || typeof document === "undefined" || data.bytes.byteLength < 500_000) return data;
    let url;
    try {
      url = URL.createObjectURL(new Blob([data.bytes], { type: data.type === "png" ? "image/png" : "image/jpeg" }));
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      const scale = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      return imageBytes(canvas.toDataURL("image/jpeg", 0.76)) || data;
    } catch { return data; }
    finally { if (url) URL.revokeObjectURL(url); }
  })());
  return imageCache.get(src);
}

async function photoRun(photo, width, height, imageCache) {
  try {
    const data = await loadPhotoData(photo.src, imageCache);
    if (!data) return null;
    return new ImageRun({ type: data.type, data: data.bytes, transformation: { width, height }, altText: { title: txt(photo.title) || "照片", description: txt(photo.title) || "照片", name: txt(photo.title) || "照片" } });
  } catch {
    return null;
  }
}

async function photoParagraph(photo, width = 190, height = 126, imageCache) {
  const run = await photoRun(photo, width, height, imageCache);
  return run ? new Paragraph({ spacing: { after: 65 }, children: [run] }) : para(photo.title || "照片", { size: 17 });
}

async function photoBlock(photos, limit, width = 190, height = 126, imageCache) {
  const children = [];
  for (const photo of photos.slice(0, limit)) {
    children.push(await photoParagraph(photo, width, height, imageCache));
    children.push(para(photo.title || "照片說明", { size: 16, after: 80 }));
  }
  return children;
}

async function coursePhotoBlock(photos, imageCache) {
  if (photos.length < 2) return photoBlock(photos, 1, 180, 105, imageCache);
  const firstTwo = photos.slice(0, 2);
  const runs = await Promise.all(firstTwo.map((photo) => photoRun(photo, 160, 95, imageCache)));
  if (runs.some((run) => !run)) return photoBlock(firstTwo, 2, 160, 95, imageCache);
  return [
    new Paragraph({ spacing: { after: 55 }, children: [runs[0], new TextRun("　"), runs[1]] }),
    para(firstTwo.map((photo) => photo.title || "照片").join("　／　"), { size: 15, after: 75 }),
  ];
}

async function qrParagraph(link) {
  const value = txt(link);
  if (!/^https?:\/\//i.test(value)) return para(value ? `連結：${value}` : " ", { size: 15 });
  const encoded = await QRCode.toDataURL(value, { margin: 1, width: 180, errorCorrectionLevel: "M" });
  const data = imageBytes(encoded);
  return new Paragraph({ children: [new ImageRun({ type: "png", data: data.bytes, transformation: { width: 85, height: 85 }, altText: { title: "課程連結 QR", description: value, name: "課程連結 QR" } })] });
}

async function contactCell(ctx, mode, width, compact = false, imageCache) {
  const { f, meta, report, body, photos } = ctx;
  const childName = report?.child.name || "幼兒";
  const size = compact ? 16 : 18;
  const parts = [
    para(`${meta.school || "園所名稱"}　${meta.className || ""}`, { bold: true, size: 14, after: 40 }),
    para(`${childName}的爸爸媽媽好：`, { bold: true, size, after: 70 }),
  ];
  if (mode === "course-share" && f.topic) parts.push(para(`課程主題：${f.topic}`, { bold: true, size, after: 60 }));
  if (f.common) parts.push(...lines(f.common, { size, after: 60 }));
  if (body) parts.push(...lines(body, { size, after: 60 }));
  if (mode === "course-share") parts.push(...await coursePhotoBlock(photos, imageCache));
  else if (mode === "contact-photo") parts.push(...await photoBlock(photos, photos.length > 1 ? 2 : 1, photos.length > 1 ? 120 : 150, photos.length > 1 ? 75 : 100, imageCache));
  if (mode === "contact-qr") {
    const links = [f.link1, f.link2, f.link3, f.link4].filter(Boolean);
    for (const link of links) parts.push(await qrParagraph(link));
  }
  if (f.reminder) parts.push(para(`小叮嚀：${f.reminder}`, { size, after: 60 }));
  if (f.songs) parts.push(para(`歌曲分享：${f.songs}`, { size, after: 60 }));
  parts.push(para(`${f.date || f.month || ""}　${meta.ownerName || "老師"} 敬上`, { size: 15, align: AlignmentType.RIGHT, after: 0 }));
  return cell(parts, width, { size });
}

async function contactPages(templateId, state, draft, childIds, imageCache) {
  const entries = childIds.map((id) => {
    const ctx = context(templateId, state, draft, id);
    const text = [ctx.f.common, ctx.body, ctx.f.reminder, ctx.f.songs].join(" ");
    return { id, text, photoCount: ctx.photos.length, linkCount: [ctx.f.link1, ctx.f.link2, ctx.f.link3, ctx.f.link4].filter(Boolean).length };
  });
  const layout = planChildPages(templateId, entries);
  const children = [];
  const totalWidth = 22731;
  const cellWidth = Math.floor(totalWidth / layout.columns);
  const widths = Array(layout.columns).fill(cellWidth);
  widths[widths.length - 1] += totalWidth - widths.reduce((sum, value) => sum + value, 0);
  for (const [pageIndex, page] of layout.pages.entries()) {
    if (pageIndex) children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun("")] }));
    const rowCount = Math.ceil(layout.cellsPerPage / layout.columns);
    const pageRows = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const cells = [];
      for (let colIndex = 0; colIndex < layout.columns; colIndex++) {
        const entry = page[rowIndex * layout.columns + colIndex];
        cells.push(entry ? await contactCell(context(templateId, state, draft, entry.id), templateId, widths[colIndex], layout.cellsPerPage >= 8, imageCache) : cell(" ", widths[colIndex]));
      }
      pageRows.push(new TableRow({ cantSplit: true, height: { value: Math.floor(14200 / rowCount), rule: HeightRule.ATLEAST }, children: cells }));
    }
    children.push(new Table({ width: { size: totalWidth, type: WidthType.DXA }, columnWidths: widths, rows: pageRows, layout: "fixed" }));
  }
  return children;
}

async function documentContent(templateId, state, draft, childId, imageCache) {
  const ctx = context(templateId, state, draft, childId);
  const { f, meta, report, body, photos } = ctx;
  const children = documentHeader(ctx, f.title || ctx.template.name);

  if (templateId === "whole-school") {
    children.push(labelValue("計畫期間", f.dateRange || meta.period), ...block("課程目標", f.goals));
    children.push(tableForDraft(ctx, [2000, 6500, 1966], Array.from({ length: 12 }, () => ({}))));
  } else if (templateId === "gross-motor") {
    children.push(...block("課程目標", f.goals), labelValue("課程主題", f.topic));
    const defaults = ["跑／移", "跳／躍", "平衡", "核心肌群", "沙包", "足球", "籃球", "飛盤"].map((item) => ({ item }));
    children.push(tableForDraft(ctx, [1382, 1514, 1514, 1514, 1514, 1514, 1514], defaults));
  } else if (templateId === "field-trip") {
    children.push(labelValue("班級／規劃者", `${meta.className || ""}　${meta.ownerName || ""}`));
    children.push(table(["項目", "內容"], [["踏查主題", f.topic], ["目的", f.purpose], ["學習指標", f.indicators], ["議題與任務", f.tasks]], [2500, 7966]));
    children.push(heading("踏查日期與地點"), tableForDraft(ctx, [1766, 2600, 3500, 2600], Array.from({ length: 5 }, () => ({}))));
    children.push(...block("工作分配", f.work), ...block("家長通知內容", f.notice));
  } else if (templateId === "teaching-record") {
    children.push(table(["週次", "班級", "班級老師", "活動日期"], [[f.week, meta.className, meta.ownerName, f.dateRange]], [1400, 2500, 3000, 3566]));
    children.push(...block("課程目標", f.goals), ...block("課程執行概述", f.summary), heading("活動紀錄"));
    children.push(tableForDraft(ctx, [2200, 5900, 2366], Array.from({ length: 3 }, () => ({}))));
    children.push(...block("學習區與教學紀錄", body), ...await photoBlock(photos, 4, 230, 150, imageCache), ...block("教學省思", f.reflection));
  } else if (templateId === "formative") {
    children.push(labelValue("評量期間", f.dateRange), labelValue("幼兒姓名／老師", `${report?.child.name || ""}　${meta.ownerName || ""}`));
    const records = draft.rows.length ? draft.rows : (report?.indicators || []).map((item) => ({ item }));
    const rows = records.length ? records : Array.from({ length: 7 }, () => ({}));
    children.push(table(["領域", "評量項目", "穩定發展", "發展中", "加油"], rows.map((item) => [item.domain, item.item, item.rating === "穩定發展" ? "✓" : "", item.rating === "發展中" ? "✓" : "", item.rating === "加油" ? "✓" : ""]), [1800, 5466, 1066, 1067, 1067]));
    children.push(...block("綜合觀察", body), ...await photoBlock(photos, 1, 240, 160, imageCache), ...block("家長回饋／簽章", f.parentFeedback));
  } else if (templateId === "summative") {
    children.push(labelValue("幼兒姓名／老師", `${report?.child.name || ""}　${meta.ownerName || ""}`));
    children.push(table(["評量階段", "第一學期期初", "第一學期期末", "第二學期學年末"], [["評量日期", f.firstDate, f.secondDate, f.thirdDate]], [2466, 2666, 2667, 2667]));
    const records = draft.rows.length ? draft.rows : (report?.indicators || []).map((item) => ({ item }));
    const rows = records.length ? records : Array.from({ length: 8 }, () => ({}));
    children.push(table(["素養", "評量項目", "期初", "學期末", "學年末"], rows.map((item) => [item.competency, item.item, item.first, item.second, item.third]), [1766, 5167, 1177, 1178, 1178]));
    children.push(...block("整體學習表現", body), ...block("家長回饋／簽章", f.parentFeedback));
  } else if (templateId === "monthly-plan") {
    children.push(labelValue("活動日期／主題", `${f.dateRange || f.month}　${f.topic}`), labelValue("班級老師", meta.ownerName));
    children.push(tableForDraft(ctx, [2093, 2093, 2094, 2093, 2093], Array.from({ length: 5 }, () => ({}))));
  } else if (templateId === "daily-routine") {
    children.push(labelValue("班級老師", f.teachers || meta.ownerName));
    const times = ["8:00–8:35", "8:35–8:50", "8:50–9:00", "9:00–9:20", "9:20–9:30", "9:30–10:15", "10:15–10:50", "10:50–11:30", "11:30–12:00", "12:00–13:30", "13:30–15:00", "15:00–16:30"];
    children.push(tableForDraft(ctx, [1366, 1820, 1820, 1820, 1820, 1820], times.map((time) => ({ time }))));
    children.push(...block("備註", f.notes));
  } else if (templateId.startsWith("contact-") || templateId === "course-share") {
    return contactPages(templateId, state, draft, childId ? [childId] : state.children.map((item) => item.id), imageCache);
  } else if (templateId === "notice") {
    children.push(labelValue("日期", f.date), ...block("親愛的家長您好：", f.body), ...block("家長協助事項", f.reminder));
    children.push(para(`${meta.ownerName || "班級老師"} 敬上`, { align: AlignmentType.RIGHT, after: 230 }));
    children.push(para("✂ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈", { after: 130 }));
    children.push(heading("回條"), ...lines(f.receipt || " "), labelValue("幼兒姓名／家長簽名", "＿＿＿＿＿＿＿＿＿＿＿＿＿＿"));
  }
  return children;
}

function makeDocument(template, children) {
  const landscape = template.orientation === "landscape";
  const [short, long] = PAGE[template.pageSize];
  const margin = template.pageSize === "A3" ? 540 : 720;
  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 20, color: INK }, paragraph: { spacing: { after: 80 } } } } },
    sections: [{
      properties: { page: { size: { width: short, height: long, orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: margin, right: margin, bottom: margin, left: margin } } },
      footers: { default: new Footer({ children: [para(" ", { size: 13 })] }) },
      children: children.length ? children : [blankParagraph()],
    }],
  });
}

export async function buildWordBlob(templateId, state, draft, childId = "", imageCache = new Map()) {
  const template = getDocumentTemplate(templateId);
  const children = await documentContent(templateId, state, draft, childId, imageCache);
  const blob = await Packer.toBlob(makeDocument(template, children));
  return new Blob([blob], { type: DOCX_MIME });
}

export async function buildClassWordBlob(templateId, state, draft) {
  const template = getDocumentTemplate(templateId);
  if (template.scope !== "child" || templateId.startsWith("contact-") || templateId === "course-share") return buildWordBlob(templateId, state, draft, "");
  const children = [];
  const imageCache = new Map();
  for (const child of state.children) {
    if (children.length) children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun("")] }));
    children.push(...await documentContent(templateId, state, draft, child.id, imageCache));
  }
  const blob = await Packer.toBlob(makeDocument(template, children));
  return new Blob([blob], { type: DOCX_MIME });
}

export async function buildClassZipBlob(templateId, state, draft) {
  const template = getDocumentTemplate(templateId);
  if (template.scope !== "child") throw new Error("This document is not child-specific");
  const zip = new JSZip();
  const imageCache = new Map();
  for (const child of state.children) {
    const blob = await buildWordBlob(templateId, state, draft, child.id, imageCache);
    zip.file(`${String(child.seat).padStart(2, "0")}-${child.name}-${template.name}.docx`, await blob.arrayBuffer());
  }
  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}

export async function buildGrowthReportBlob(report, settings = {}) {
  const meta = report.classMeta || {};
  const children = [
    para(meta.school || "園所名稱", { align: AlignmentType.CENTER, bold: true, size: 22 }),
    para(`${report.child.name}的${settings.title || "成長報告"}`, { align: AlignmentType.CENTER, bold: true, size: 30 }),
    para([meta.className, meta.period, meta.ageGroup].filter(Boolean).join("　·　"), { align: AlignmentType.CENTER, size: 17, after: 180 }),
    ...lines(settings.intro || "", { after: 120 }),
    heading("老師的觀察"),
  ];
  for (const observation of report.observations) children.push(para(observation.date, { bold: true, size: 17 }), ...lines(observation.text, { after: 140 }));
  children.push(heading("成長片刻"), ...await photoBlock(report.photos, 3, 240, 160, new Map()));
  children.push(heading("學習指標"), ...report.indicators.map((indicator) => para(`• ${indicator}`)));
  children.push(para(`紀錄者：${meta.ownerName || "未填寫"}`, { align: AlignmentType.RIGHT, after: 0 }));
  const blob = await Packer.toBlob(makeDocument({ pageSize: "A4", orientation: "portrait" }, children));
  return new Blob([blob], { type: DOCX_MIME });
}
