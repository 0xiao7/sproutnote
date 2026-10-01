const field = (key, label, kind = "text", hint = "") => ({ key, label, kind, hint });
const row = (key, label) => ({ key, label });

export const DOCUMENT_TEMPLATES = [
  { id: "whole-school", name: "全園教保活動計畫", group: "園務與計畫", pageSize: "A4", orientation: "portrait", scope: "class", fields: [field("title", "計畫標題"), field("dateRange", "起訖日期"), field("goals", "課程目標", "textarea")], columns: [row("month", "月份"), row("activity", "全園性活動課程內容"), row("domain", "相關領域")] },
  { id: "gross-motor", name: "大肌肉活動計畫", group: "園務與計畫", pageSize: "A4", orientation: "portrait", scope: "class", fields: [field("goals", "課程目標", "textarea"), field("topic", "課程主題")], columns: [row("item", "活動項目"), row("aug", "8月"), row("sep", "9月"), row("oct", "10月"), row("nov", "11月"), row("dec", "12月"), row("jan", "1月")] },
  { id: "field-trip", name: "社區踏查計畫", group: "園務與計畫", pageSize: "A4", orientation: "portrait", scope: "class", fields: [field("topic", "踏查主題"), field("purpose", "目的", "textarea"), field("indicators", "學習指標", "textarea"), field("tasks", "議題與任務", "textarea"), field("work", "工作分配", "textarea"), field("notice", "家長通知內容", "textarea")], columns: [row("date", "日期"), row("place", "地點"), row("activity", "活動流程"), row("owner", "主責人員")] },
  { id: "teaching-record", name: "教學紀實", group: "班級教學", pageSize: "A4", orientation: "portrait", scope: "class", fields: [field("week", "週次"), field("dateRange", "活動日期"), field("goals", "課程目標", "textarea"), field("summary", "課程執行概述", "textarea"), field("body", "活動紀錄", "textarea"), field("reflection", "教學省思", "textarea")], columns: [row("area", "學習區／活動"), row("record", "紀錄"), row("indicator", "對應學習指標")] },
  { id: "formative", name: "形成性評量", group: "幼兒評量", pageSize: "A4", orientation: "portrait", scope: "child", fields: [field("dateRange", "評量期間"), field("body", "綜合觀察", "textarea"), field("parentFeedback", "家長回饋", "textarea")], columns: [row("domain", "領域"), row("item", "評量項目"), row("rating", "幼兒表現")], ratingOptions: ["穩定發展", "發展中", "加油"] },
  { id: "summative", name: "總結性評量", group: "幼兒評量", pageSize: "A4", orientation: "portrait", scope: "child", fields: [field("firstDate", "第一學期期初日期"), field("secondDate", "第一學期期末日期"), field("thirdDate", "第二學期學年末日期"), field("body", "整體學習表現", "textarea"), field("parentFeedback", "家長回饋", "textarea")], columns: [row("competency", "素養"), row("item", "評量項目"), row("first", "期初"), row("second", "學期末"), row("third", "學年末")], ratingOptions: ["已達成", "部分達成", "持續練習"] },
  { id: "monthly-plan", name: "月份活動規劃", group: "班級教學", pageSize: "A4", orientation: "portrait", scope: "class", fields: [field("month", "月份"), field("topic", "活動主題"), field("dateRange", "活動日期")], columns: [row("monday", "星期一"), row("tuesday", "星期二"), row("wednesday", "星期三"), row("thursday", "星期四"), row("friday", "星期五")] },
  { id: "daily-routine", name: "一日作息與協同分工", group: "班級教學", pageSize: "A4", orientation: "portrait", scope: "class", fields: [field("teachers", "班級老師"), field("notes", "備註", "textarea")], columns: [row("time", "時間"), row("monday", "星期一"), row("tuesday", "星期二"), row("wednesday", "星期三"), row("thursday", "星期四"), row("friday", "星期五")] },
  { id: "contact-text", name: "聯絡本・文字", group: "家長聯絡", pageSize: "A3", orientation: "landscape", cellsPerPage: 12, scope: "child", fields: [field("date", "日期"), field("common", "全班共用段落", "textarea"), field("reminder", "小叮嚀", "textarea"), field("songs", "歌曲分享", "textarea"), field("body", "個別補充", "textarea")], columns: [] },
  { id: "contact-photo", name: "聯絡本・照片", group: "家長聯絡", pageSize: "A3", orientation: "landscape", cellsPerPage: 12, scope: "child", fields: [field("date", "日期"), field("common", "全班共用段落", "textarea"), field("body", "照片說明", "textarea"), field("reminder", "小叮嚀", "textarea")], columns: [] },
  { id: "contact-qr", name: "聯絡本・課程連結", group: "家長聯絡", pageSize: "A3", orientation: "landscape", cellsPerPage: 12, scope: "child", fields: [field("date", "日期"), field("common", "全班共用段落", "textarea"), field("body", "個別補充", "textarea"), field("link1", "課程連結 1"), field("link2", "課程連結 2"), field("link3", "課程連結 3"), field("link4", "課程連結 4")], columns: [] },
  { id: "course-share", name: "月底課程分享", group: "家長聯絡", pageSize: "A3", orientation: "landscape", cellsPerPage: 6, scope: "child", fields: [field("month", "月份"), field("topic", "課程主題"), field("common", "全班共用段落", "textarea"), field("body", "個別學習紀錄", "textarea")], columns: [] },
  { id: "notice", name: "小通知單", group: "家長聯絡", pageSize: "A4", orientation: "portrait", scope: "class", fields: [field("title", "通知單標題"), field("date", "日期"), field("body", "通知內容", "textarea"), field("reminder", "家長協助事項", "textarea"), field("receipt", "回條內容", "textarea")], columns: [] },
];

export function getDocumentTemplate(id) {
  const template = DOCUMENT_TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error(`Unknown document template: ${id}`);
  return template;
}

export function createDefaultDocumentDraft(id) {
  const template = getDocumentTemplate(id);
  return { fields: Object.fromEntries(template.fields.map((item) => [item.key, ""])), rows: [], childNotes: {}, photoIds: [] };
}
