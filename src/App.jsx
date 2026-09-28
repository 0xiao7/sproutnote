import { useEffect, useRef, useState } from "react";
import { addChild, addIndicator, archiveCurrentTerm, createInitialState, expandObservation, movePhotoToActivity, removeChild, removeIndicator, reportForChild, toggleChildTag, updateChild, updateObservation } from "./lib/model.js";
import { loadState, saveState } from "./lib/storage.js";
import { buildReportHtml, buildWordHtml } from "./lib/export.js";
import { ACTIVITY_PRESETS, DOMAIN_PRESETS, INDICATOR_PRESETS, OBSERVATION_TYPES, REPORT_TEMPLATES } from "./lib/templates.js";

const NAV = [
  { id: "import", number: "01", label: "照片" },
  { id: "organize", number: "02", label: "活動" },
  { id: "class", number: "03", label: "班級" },
  { id: "tag", number: "04", label: "標記" },
  { id: "journal", number: "05", label: "歷程" },
  { id: "report", number: "06", label: "報告" },
];
const DOMAINS = ["美感與創作", "認知與探索", "語言與表達", "社會互動", "生活自理", "自然觀察"];
const formatDate = (value) => new Intl.DateTimeFormat("zh-TW", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));

function Notice({ message }) { return <div className={`notice ${message ? "is-on" : ""}`} role="status">{message}</div>; }

function PhotoCard({ photo, activity, children, selected, onClick, compact = false }) {
  return <button className={`photo-card ${selected ? "is-selected" : ""} ${compact ? "is-compact" : ""}`} onClick={onClick}>
    <img src={photo.src} alt={photo.title || `${activity?.name ?? "活動"}照片`} /><span className="photo-shade" />
    <span className="photo-meta"><strong>{photo.title || activity?.name || "未命名照片"}</strong><small>{formatDate(photo.date)} · {photo.childIds.length ? `${photo.childIds.length} 位孩子` : "尚未標記"}</small></span>
    {children?.length > 0 && <span className="avatar-stack" aria-label={`已標記 ${children.map((child) => child.name).join("、")}`}>{children.slice(0, 3).map((child) => <i key={child.id} style={{ background: child.color }}>{child.name.slice(0, 1)}</i>)}</span>}
  </button>;
}

function EmptyState({ title, copy }) { return <div className="empty-state"><span className="empty-mark">＋</span><h3>{title}</h3><p>{copy}</p></div>; }

function ImportScreen({ state, setState, notify, onInstall }) {
  const inputRef = useRef(null); const [dragging, setDragging] = useState(false);
  async function importFiles(fileList) {
    const files = [...fileList]; if (!files.length) return;
    const invalid = files.find((file) => !file.type.startsWith("image/") || file.size > 12 * 1024 * 1024);
    if (invalid) { notify(`「${invalid.name}」不是支援的圖片，或超過 12MB`); return; }
    notify(`正在整理 ${files.length} 張照片…`);
    const imported = await Promise.all(files.map(async (file, index) => ({ id: `photo-${Date.now()}-${index}`, src: await compressImage(file), title: file.name.replace(/\.[^.]+$/, ""), activityId: "", childIds: [], date: new Date(file.lastModified || Date.now()).toISOString().slice(0, 10) })));
    setState((current) => ({ ...current, photos: [...imported, ...current.photos] })); notify(`已匯入 ${files.length} 張，只保存在這台裝置`);
  }
  return <section className="screen import-screen">
    <header className="screen-title"><div><span className="eyebrow">本機照片庫</span><h1>把今天的故事放進來</h1><p>照片會先在裝置內縮圖處理，不會自動上傳到任何平台。</p></div><div className="screen-actions"><button className="secondary" onClick={onInstall}>安裝 Web App</button><button className="primary" onClick={() => inputRef.current?.click()}>選擇照片</button></div><input ref={inputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={(event) => importFiles(event.target.files)} /></header>
    <div className="stats-row"><article><b>{state.photos.length}</b><span>本學期照片</span></article><article><b>{state.activities.length}</b><span>活動群組</span></article><article><b>{state.children.length}</b><span>孩子</span></article><article><b>{state.observations.length}</b><span>觀察紀錄</span></article></div>
    <div className={`drop-zone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); importFiles(event.dataTransfer.files); }}><div><span className="drop-kicker">快速匯入</span><h2>拖進來，或從相簿挑選</h2><p>支援 JPG、PNG、HEIC；每張上限 12MB。匯入時會自動縮成適合報告的尺寸。</p></div><button className="secondary" onClick={() => inputRef.current?.click()}>瀏覽檔案</button></div>
    <div className="section-heading"><div><span className="eyebrow">最近匯入</span><h2>這學期的片刻</h2></div><span className="privacy-chip">僅此裝置</span></div>
    {state.photos.length ? <div className="photo-grid">{state.photos.map((photo) => <PhotoCard key={photo.id} photo={photo} activity={state.activities.find((item) => item.id === photo.activityId)} children={state.children.filter((child) => photo.childIds.includes(child.id))} />)}</div> : <EmptyState title="還沒有照片" copy="選幾張照片匯入，活動與成長報告會從這裡開始。" />}
  </section>;
}

function OrganizeScreen({ state, setState, notify }) {
  const [selectedId, setSelectedId] = useState(state.photos[0]?.id || ""); const [newName, setNewName] = useState(""); const [newDomain, setNewDomain] = useState(DOMAINS[0]); const selected = state.photos.find((photo) => photo.id === selectedId);
  function addActivity(event) { event.preventDefault(); const name = newName.trim(); const domain = newDomain.trim() || DOMAINS[0]; if (!name) { notify("請選擇或輸入活動名稱"); return; } const item = { id: `activity-${Date.now()}`, name, date: new Date().toISOString().slice(0, 10), domain }; setState((current) => ({ ...current, activities: [...current.activities, item] })); setNewName(""); notify(`已建立「${name}」`); }
  return <section className="screen"><header className="screen-title"><div><span className="eyebrow">整理活動</span><h1>把照片分成一場場回憶</h1><p>先選照片，再指定活動。分類錯了也能隨時改回來。</p></div></header><div className="organize-layout">
    <div className="panel photo-picker-panel"><div className="panel-head"><div><span className="eyebrow">照片牆</span><h2>{state.photos.length} 張</h2></div><span className="selection-count">{selected ? "已選 1 張" : "未選"}</span></div><div className="picker-grid">{state.photos.map((photo) => <PhotoCard key={photo.id} photo={photo} compact selected={photo.id === selectedId} onClick={() => setSelectedId(photo.id)} />)}</div></div>
    <aside className="panel detail-panel"><span className="eyebrow">移到活動</span><h2>{selected?.title || "先選一張照片"}</h2>{selected && <img className="detail-image" src={selected.src} alt={selected.title} />}<div className="activity-options">{state.activities.map((activity) => <button key={activity.id} className={selected?.activityId === activity.id ? "is-current" : ""} disabled={!selected} onClick={() => { setState((current) => movePhotoToActivity(current, selectedId, activity.id)); notify(`已移到「${activity.name}」`); }}><span>{activity.name}</span><small>{activity.domain} · {state.photos.filter((photo) => photo.activityId === activity.id).length} 張</small></button>)}</div><form className="activity-form" onSubmit={addActivity}><label>活動名稱<input list="activity-presets" aria-label="新活動名稱" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="選常用項目或直接輸入" /></label><datalist id="activity-presets">{ACTIVITY_PRESETS.map((value) => <option key={value} value={value} />)}</datalist><label>學習領域<input list="domain-presets" value={newDomain} onChange={(event) => setNewDomain(event.target.value)} /></label><datalist id="domain-presets">{DOMAIN_PRESETS.map((value) => <option key={value} value={value} />)}</datalist><button className="secondary">建立活動</button></form></aside>
  </div></section>;
}

const CHILD_COLORS = ["#D66A4A", "#C49A36", "#4E7A68", "#6E7FA3", "#9A6F86", "#5D8C8A", "#A27652", "#7B8D6A"];

function ClassScreen({ state, setState, notify }) {
  const [name, setName] = useState("");
  const updateMeta = (key, value) => setState((current) => ({ ...current, classMeta: { ...current.classMeta, [key]: value } }));
  function createChild(event) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { notify("請先輸入姓名"); return; }
    const seat = Math.max(0, ...state.children.map((child) => Number(child.seat) || 0)) + 1;
    const child = { id: `child-${Date.now()}`, seat, name: cleanName, color: CHILD_COLORS[state.children.length % CHILD_COLORS.length] };
    setState((current) => addChild(current, child));
    setName("");
    notify(`已加入 ${cleanName}，資料只保存在這台裝置`);
  }
  function deleteChild(child) {
    if (state.children.length === 1) { notify("名單至少保留一位孩子"); return; }
    if (!window.confirm(`刪除 ${child.name}？相關照片標記與觀察紀錄也會移除。`)) return;
    setState((current) => removeChild(current, child.id));
    notify(`已刪除 ${child.name}`);
  }
  function saveHistory() {
    setState((current) => archiveCurrentTerm(current));
    notify(`已保存「${state.classMeta.period}」歷年紀錄`);
  }
  function downloadHistory(record) {
    downloadBlob(new Blob([JSON.stringify(record, null, 2)], { type: "application/json;charset=utf-8" }), `${record.classMeta.period}-${record.classMeta.className}-完整紀錄.json`);
    notify("歷年紀錄備份已下載");
  }
  return <section className="screen class-screen"><header className="screen-title"><div><span className="eyebrow">班級資料庫</span><h1>把班級與姓名集中放好</h1><p>名單會自動套用到照片標記、成長歷程與報告，全程保存在本機。</p></div><span className="privacy-chip">{state.children.length} 位孩子</span></header><div className="class-layout">
    <article className="panel class-profile"><div className="panel-head"><div><span className="eyebrow">自用設定</span><h2>我的工作區</h2></div><span className="local-badge">自動保存</span></div><div className="class-fields"><label>紀錄者姓名<input value={state.classMeta.ownerName} onChange={(event) => updateMeta("ownerName", event.target.value)} placeholder="例如：Fay 或林老師" /></label><label>園所名稱<input value={state.classMeta.school} onChange={(event) => updateMeta("school", event.target.value)} placeholder="例如：晨光幼兒園" /></label><label>班級名稱<input value={state.classMeta.className} onChange={(event) => updateMeta("className", event.target.value)} placeholder="例如：向日葵班" /></label><label>學期／期間<input value={state.classMeta.period} onChange={(event) => updateMeta("period", event.target.value)} placeholder="例如：2026 上學期" /></label><label>年齡層<select value={state.classMeta.ageGroup} onChange={(event) => updateMeta("ageGroup", event.target.value)}>{["幼幼班 2–3 歲", "小班 3–4 歲", "小中混齡 3–5 歲", "中班 4–5 歲", "中大混齡 4–6 歲", "大班 5–6 歲"].map((value) => <option key={value}>{value}</option>)}</select></label></div></article>
    <article className="panel roster-manager"><div className="panel-head"><div><span className="eyebrow">幼兒名單</span><h2>座號與姓名</h2></div><span>{state.children.length} 人</span></div><form className="add-child-form" onSubmit={createChild}><input aria-label="新增幼兒姓名" value={name} onChange={(event) => setName(event.target.value)} placeholder="輸入姓名" /><button className="primary">加入名單</button></form><div className="roster-table" role="list">{state.children.map((child) => <div className="roster-row" role="listitem" key={child.id}><i style={{ background: child.color }}>{child.name.slice(0, 1)}</i><label><span>座號</span><input type="number" min="1" value={child.seat} onChange={(event) => setState((current) => updateChild(current, child.id, { seat: event.target.value }))} /></label><label className="name-field"><span>姓名</span><input value={child.name} onChange={(event) => setState((current) => updateChild(current, child.id, { name: event.target.value }))} /></label><button className="remove-child" type="button" aria-label={`刪除 ${child.name}`} onClick={() => deleteChild(child)}>刪除</button></div>)}</div></article>
  </div><section className="history-section"><div className="section-heading"><div><span className="eyebrow">歷年紀錄</span><h2>把每一學期保存下來</h2></div><button className="secondary" onClick={saveHistory}>封存目前學期</button></div>{state.history.length ? <div className="history-grid">{state.history.map((record) => <article className="history-card" key={record.id}><div><span>{record.classMeta.school} · {record.classMeta.className}</span><h3>{record.classMeta.period}</h3><p>紀錄者：{record.classMeta.ownerName || "未填寫"}</p></div><div className="history-counts"><span><b>{record.children.length}</b> 位孩子</span><span><b>{record.photos.length}</b> 張照片</span><span><b>{record.observations.length}</b> 則觀察</span></div><button className="text-button" onClick={() => downloadHistory(record)}>下載完整紀錄</button></article>)}</div> : <EmptyState title="還沒有歷年紀錄" copy="完成一個學期後按「封存目前學期」，之後更改學期名稱也不會蓋掉舊資料。" />}</section></section>;
}

function TagScreen({ state, setState, notify }) {
  const [index, setIndex] = useState(0); const photo = state.photos[index]; const previous = state.photos[index - 1];
  if (!photo) return <section className="screen"><EmptyState title="還沒有可標記的照片" copy="先到照片頁匯入圖片。" /></section>;
  const activity = state.activities.find((item) => item.id === photo.activityId);
  return <section className="screen tag-screen"><header className="screen-title"><div><span className="eyebrow">孩子標記</span><h1>這張照片裡有誰？</h1><p>可同時選多位孩子，標記會直接累積到每個人的歷程。</p></div><span className="counter">{index + 1} / {state.photos.length}</span></header><div className="tag-layout">
    <div className="tag-photo-wrap"><img src={photo.src} alt={photo.title} /><div className="tag-caption"><span>{activity?.name || "尚未分活動"}</span><strong>{photo.title}</strong></div></div>
    <aside className="panel roster-panel"><div className="panel-head"><div><span className="eyebrow">點名表</span><h2>選擇孩子</h2></div><span>{photo.childIds.length} 人</span></div><div className="roster-grid">{state.children.map((child) => { const active = photo.childIds.includes(child.id); return <button key={child.id} className={active ? "is-tagged" : ""} onClick={() => setState((current) => toggleChildTag(current, photo.id, child.id))}><i style={{ background: child.color }}>{child.seat}</i><span>{child.name}</span><small>{active ? "已標記" : "點一下加入"}</small></button>; })}</div><button className="text-button" disabled={!previous} onClick={() => { setState((current) => ({ ...current, photos: current.photos.map((item) => item.id === photo.id ? { ...item, childIds: [...previous.childIds] } : item) })); notify("已套用上一張的標記"); }}>同上一張</button><div className="pager"><button className="secondary" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>上一張</button><button className="primary" disabled={index === state.photos.length - 1} onClick={() => setIndex((value) => Math.min(state.photos.length - 1, value + 1))}>下一張</button></div></aside>
  </div></section>;
}

function JournalScreen({ state, setState, notify }) {
  const [childId, setChildId] = useState(state.children[0]?.id || ""); const [activityId, setActivityId] = useState(state.activities[0]?.id || ""); const [observationType, setObservationType] = useState(OBSERVATION_TYPES[0].id); const [keywords, setKeywords] = useState(""); const [draft, setDraft] = useState(""); const report = childId ? reportForChild(state, childId) : null;
  function saveObservation() { if (!keywords.trim() || !draft.trim()) { notify("先填關鍵字並產生觀察初稿"); return; } const item = { id: `obs-${Date.now()}`, childId, activityId, typeId: observationType, keywords, text: draft, date: new Date().toISOString().slice(0, 10) }; setState((current) => updateObservation(current, item)); setKeywords(""); setDraft(""); notify("觀察紀錄已保存"); }
  return <section className="screen"><header className="screen-title"><div><span className="eyebrow">成長歷程</span><h1>把值得記住的那一刻寫下來</h1><p>本機助手只整理你的關鍵字，判斷與最後文字仍由你決定。</p></div></header><div className="journal-layout">
    <aside className="child-strip" aria-label="選擇孩子">{state.children.map((child) => <button key={child.id} className={child.id === childId ? "is-active" : ""} onClick={() => setChildId(child.id)}><i style={{ background: child.color }}>{child.seat}</i><span>{child.name}</span></button>)}</aside>
    <div className="journal-main"><article className="panel composer"><div className="panel-head"><div><span className="eyebrow">觀察初稿</span><h2>{report?.child.name}</h2></div><span className="local-badge">本機整理</span></div><label>觀察類型<select value={observationType} onChange={(event) => setObservationType(event.target.value)}>{OBSERVATION_TYPES.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label>對應活動<select value={activityId} onChange={(event) => setActivityId(event.target.value)}>{state.activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name}</option>)}</select></label><label>你看到的關鍵字<textarea value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="可自己打字，例如：自己穿鞋、試了三次、沒有放棄" rows="3" /></label><button className="secondary align-left" onClick={() => setDraft(expandObservation(keywords, observationType))}>套用類型並整理</button><label>老師確認後的文字<textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="可直接修改或全部重寫" rows="5" /></label><button className="primary" onClick={saveObservation}>保存這則觀察</button></article>
      <div className="timeline"><div className="section-heading"><div><span className="eyebrow">時間線</span><h2>{report?.child.name}的成長誌</h2></div><span>{report?.observations.length || 0} 則</span></div>{report?.observations.length ? report.observations.map((item) => { const activity = state.activities.find((entry) => entry.id === item.activityId); const photo = state.photos.find((entry) => entry.activityId === item.activityId && entry.childIds.includes(childId)); return <article className="timeline-card" key={item.id}>{photo && <img src={photo.src} alt="" />}<div><span>{formatDate(item.date)} · {activity?.name}</span><p>{item.text}</p><small>{activity?.domain}</small></div></article>; }) : <EmptyState title="還沒有觀察紀錄" copy="用左側的關鍵字整理器寫下第一則。" />}</div>
    </div>
  </div></section>;
}

function ReportScreen({ state, setState, notify }) {
  const [childId, setChildId] = useState(state.children[0]?.id || ""); const [exporting, setExporting] = useState(false); const [indicatorDraft, setIndicatorDraft] = useState(""); const report = childId ? reportForChild(state, childId) : null;
  const updateMeta = (key, value) => setState((current) => ({ ...current, classMeta: { ...current.classMeta, [key]: value } }));
  const updateReportSetting = (key, value) => setState((current) => ({ ...current, reportSettings: { ...current.reportSettings, [key]: value } }));
  const settingsFor = (childReport) => ({ ...state.reportSettings, title: `${childReport.child.name}的${state.reportSettings.title}` });
  function downloadWord() { const html = buildWordHtml(report, settingsFor(report)); downloadBlob(new Blob([html], { type: "application/msword" }), `${report.child.name}-成長報告.doc`); notify("可編輯 Word 檔已下載"); }
  function downloadFamilyHtml() { const html = buildReportHtml(report, settingsFor(report)); downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${report.child.name}-家長分享.html`); notify("家長分享 HTML 已下載"); }
  async function downloadPhotos() { setExporting(true); try { const { default: JSZip } = await import("jszip"); const zip = new JSZip(); await Promise.all(report.photos.map(async (photo, index) => { const blob = await fetch(photo.src).then((response) => response.blob()); zip.file(`${String(index + 1).padStart(2, "0")}-${photo.title}.jpg`, blob); })); downloadBlob(await zip.generateAsync({ type: "blob" }), `${report.child.name}-照片.zip`); notify("照片 ZIP 已下載"); } catch { notify("照片打包失敗，請稍後再試"); } finally { setExporting(false); } }
  async function downloadClassReports() { setExporting(true); try { const { default: JSZip } = await import("jszip"); const zip = new JSZip(); state.children.forEach((child) => { const childReport = reportForChild(state, child.id); const folder = zip.folder(`${String(child.seat).padStart(2, "0")}-${child.name}`); folder.file(`${child.name}-成長報告.doc`, buildWordHtml(childReport, settingsFor(childReport))); folder.file(`${child.name}-家長分享.html`, buildReportHtml(childReport, settingsFor(childReport))); }); downloadBlob(await zip.generateAsync({ type: "blob" }), `${state.classMeta.className}-全班報告.zip`); notify(`已產出 ${state.children.length} 位孩子的全班報告`); } catch { notify("全班報告產生失敗，請稍後再試"); } finally { setExporting(false); } }
  function saveIndicator(event) { event.preventDefault(); const value = indicatorDraft.trim(); if (!value) { notify("請選擇或輸入學習指標"); return; } setState((current) => addIndicator(current, childId, value)); setIndicatorDraft(""); notify("學習指標已加入"); }
  return <section className="screen report-screen"><header className="screen-title no-print"><div><span className="eyebrow">成長報告</span><h1>選一個版型，再寫成你的內容</h1><p>模板只是起點，標題、引言、觀察與指標都能直接修改。</p></div><div className="report-actions"><button className="secondary" onClick={downloadFamilyHtml}>家長分享檔</button><button className="secondary" onClick={downloadWord}>下載 Word</button><button className="secondary" disabled={exporting} onClick={downloadPhotos}>照片 ZIP</button><button className="secondary" disabled={exporting} onClick={downloadClassReports}>{exporting ? "產生中…" : "全班報告 ZIP"}</button><button className="primary" onClick={() => window.print()}>列印 / PDF</button></div></header><div className="report-workspace">
    <aside className="panel report-settings no-print"><span className="eyebrow">報告設定</span><h2>內容與模板</h2><label>孩子<select value={childId} onChange={(event) => setChildId(event.target.value)}>{state.children.map((child) => <option key={child.id} value={child.id}>{child.seat} 號 · {child.name}</option>)}</select></label><div className="template-picker" aria-label="報告模板">{REPORT_TEMPLATES.map((template) => <button key={template.id} className={state.reportSettings.templateId === template.id ? "is-selected" : ""} onClick={() => updateReportSetting("templateId", template.id)}><strong>{template.name}</strong><small>{template.description}</small></button>)}</div><label>報告標題<input value={state.reportSettings.title} onChange={(event) => updateReportSetting("title", event.target.value)} /></label><label>開場文字<textarea rows="3" value={state.reportSettings.intro} onChange={(event) => updateReportSetting("intro", event.target.value)} /></label><details><summary>署名與班級資料</summary><div className="details-fields"><label>紀錄者姓名<input value={state.classMeta.ownerName} onChange={(event) => updateMeta("ownerName", event.target.value)} /></label><label>園所名稱<input value={state.classMeta.school} onChange={(event) => updateMeta("school", event.target.value)} /></label><label>班級<input value={state.classMeta.className} onChange={(event) => updateMeta("className", event.target.value)} /></label><label>期間<input value={state.classMeta.period} onChange={(event) => updateMeta("period", event.target.value)} /></label><label>年齡層<select value={state.classMeta.ageGroup} onChange={(event) => updateMeta("ageGroup", event.target.value)}>{["幼幼班 2–3 歲", "小班 3–4 歲", "小中混齡 3–5 歲", "中班 4–5 歲", "中大混齡 4–6 歲", "大班 5–6 歲"].map((value) => <option key={value}>{value}</option>)}</select></label></div></details><div className="indicator-box"><span>學習指標</span><form className="indicator-form" onSubmit={saveIndicator}><input list="indicator-presets" value={indicatorDraft} onChange={(event) => setIndicatorDraft(event.target.value)} placeholder="選常用項目或直接輸入" /><datalist id="indicator-presets">{INDICATOR_PRESETS.map((value) => <option key={value} value={value} />)}</datalist><button className="secondary">加入</button></form><div className="indicator-editor">{report?.indicators.map((indicator) => <span key={indicator}>{indicator}<button type="button" aria-label={`移除 ${indicator}`} onClick={() => setState((current) => removeIndicator(current, childId, indicator))}>×</button></span>)}</div></div></aside>
    <article className={`paper template-${state.reportSettings.templateId}`} id="print-report"><header><div><span>SPROUTNOTE · GROWTH JOURNAL</span><h2>{report?.child.name}的{state.reportSettings.title}</h2><p>{state.classMeta.school} · {state.classMeta.className}</p></div><div className="report-avatar" style={{ background: report?.child.color }}>{report?.child.name.slice(0, 1)}</div></header><p className="report-intro">{state.reportSettings.intro}</p><div className="paper-meta"><span>{state.classMeta.period}</span><span>{state.classMeta.ageGroup}</span><span>{report?.photos.length || 0} 個成長片刻</span></div><div className="paper-gallery">{report?.photos.slice(0, 3).map((photo) => <img key={photo.id} src={photo.src} alt={photo.title} />)}</div><section><span className="eyebrow">老師的觀察</span>{report?.observations.length ? report.observations.map((item) => <div className="report-note" key={item.id}><time>{item.date}</time><p>{item.text}</p></div>) : <p className="muted">還沒有觀察紀錄。</p>}</section><section><span className="eyebrow">這段時間看見的成長</span><div className="indicator-list">{report?.indicators.map((indicator) => <span key={indicator}>{indicator}</span>)}</div></section><footer><span>紀錄者：{state.classMeta.ownerName || "未填寫"} · 由芽記整理</span><span>{new Date().toLocaleDateString("zh-TW")}</span></footer></article>
  </div></section>;
}

function AppSidebar({ active, setActive, state }) { const [year, ...termParts] = state.classMeta.period.split(" "); return <aside className="app-sidebar no-print"><button className="brand" onClick={() => setActive("import")}><span className="brand-mark">S</span><span><strong>芽記</strong><small>SproutNote</small></span></button><div className="term"><span>{year || "本期"}</span><strong>{state.classMeta.className || "未命名班級"}</strong><small>{termParts.join(" ") || state.classMeta.period}</small></div><nav>{NAV.map((item) => <button key={item.id} className={active === item.id ? "is-active" : ""} onClick={() => setActive(item.id)}><span>{item.number}</span><strong>{item.label}</strong></button>)}</nav><div className="sidebar-foot"><span className="device-dot" />{state.classMeta.ownerName || "我的"} · 只存在此裝置</div></aside>; }
function AppTopbar({ state }) { const completed = [state.photos.length > 0, state.activities.length > 0, state.photos.some((photo) => photo.childIds.length), state.observations.length > 0].filter(Boolean).length; const initial = state.classMeta.ownerName?.trim().slice(0, 1) || "我"; return <header className="app-topbar no-print"><div><span>{state.classMeta.ownerName || "我的"}的工作區</span><strong>{state.classMeta.school}</strong></div><div className="progress-pill"><i style={{ width: `${completed * 25}%` }} /><span>本學期進度 {completed}/4</span></div><button className="profile" title={`${state.classMeta.ownerName || "個人"}本機版`}>{initial}</button></header>; }
function MobileNav({ active, setActive }) { return <nav className="mobile-nav no-print">{NAV.map((item) => <button key={item.id} className={active === item.id ? "is-active" : ""} onClick={() => setActive(item.id)}><span>{item.number}</span>{item.label}</button>)}</nav>; }

export function App() {
  const [state, setState] = useState(() => loadState() || createInitialState()); const [active, setActive] = useState("import"); const [message, setMessage] = useState(""); const [installPrompt, setInstallPrompt] = useState(null); const timerRef = useRef();
  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  useEffect(() => {
    const captureInstallPrompt = (event) => { event.preventDefault(); setInstallPrompt(event); };
    const clearInstallPrompt = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);
  function notify(text) { setMessage(text); clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setMessage(""), 2600); }
  async function installApp() {
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) { notify("芽記已經是 Web App"); return; }
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      notify(outcome === "accepted" ? "芽記已加入這台裝置" : "已取消安裝");
      return;
    }
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    notify(isiOS ? "請點 Safari 分享，再選「加入主畫面」" : "請從瀏覽器選單選「安裝芽記」或「建立捷徑」");
  }
  const props = { state, setState, notify };
  let screen;
  if (active === "organize") screen = <OrganizeScreen {...props} />;
  else if (active === "class") screen = <ClassScreen {...props} />;
  else if (active === "tag") screen = <TagScreen {...props} />;
  else if (active === "journal") screen = <JournalScreen {...props} />;
  else if (active === "report") screen = <ReportScreen {...props} />;
  else screen = <ImportScreen {...props} onInstall={installApp} />;
  return <div className="app-shell"><AppSidebar active={active} setActive={setActive} state={state} /><div className="app-main"><AppTopbar state={state} />{screen}</div><MobileNav active={active} setActive={setActive} /><Notice message={message} /></div>;
}

async function compressImage(file) { const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); const image = await new Promise((resolve, reject) => { const element = new Image(); element.onload = () => resolve(element); element.onerror = reject; element.src = dataUrl; }); const scale = Math.min(1, 1600 / Math.max(image.width, image.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); return canvas.toDataURL("image/jpeg", 0.78); }
function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
