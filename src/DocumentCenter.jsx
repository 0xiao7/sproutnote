import { useState } from "react";
import { DOCUMENT_TEMPLATES, createDefaultDocumentDraft } from "./lib/documentCatalog.js";
import { planChildPages } from "./lib/documentLayout.js";
import "./documentStyles.css";

function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const safeName = (value) => String(value || "文件").replace(/[\\/:*?"<>|]/g, "-");

export function DocumentCenter({ state, setState, notify }) {
  const [templateId, setTemplateId] = useState("contact-text");
  const [childId, setChildId] = useState(state.children[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const template = DOCUMENT_TEMPLATES.find((item) => item.id === templateId);
  const draft = { ...createDefaultDocumentDraft(templateId), ...(state.documentDrafts?.[templateId] || {}) };
  const fields = { ...createDefaultDocumentDraft(templateId).fields, ...draft.fields };
  const child = state.children.find((item) => item.id === childId);
  const isChild = template.scope === "child";
  const isGrid = template.id.startsWith("contact-") || template.id === "course-share";

  function updateDraft(change) {
    setState((current) => {
      const previous = { ...createDefaultDocumentDraft(templateId), ...(current.documentDrafts?.[templateId] || {}) };
      return { ...current, documentDrafts: { ...current.documentDrafts, [templateId]: { ...previous, ...change } } };
    });
  }
  function setField(key, value) { updateDraft({ fields: { ...fields, [key]: value } }); }
  function setRow(index, key, value) {
    const rows = [...draft.rows];
    rows[index] = { ...rows[index], [key]: value };
    updateDraft({ rows });
  }
  function setChildNote(value) { updateDraft({ childNotes: { ...draft.childNotes, [childId]: value } }); }
  function togglePhoto(id) {
    const ids = draft.photoIds.includes(id) ? draft.photoIds.filter((item) => item !== id) : [...draft.photoIds, id];
    updateDraft({ photoIds: ids });
  }
  async function exportDocument(kind) {
    if (isChild && !state.children.length) { notify("請先在班級頁加入幼兒"); return; }
    setBusy(true);
    try {
      const word = await import("./lib/wordDocuments.js");
      const stem = safeName(`${state.classMeta.period}-${state.classMeta.className}-${template.name}`);
      if (kind === "zip") saveDownload(await word.buildClassZipBlob(templateId, state, draft), `${stem}-個別檔案.zip`);
      else if (kind === "class") saveDownload(await word.buildClassWordBlob(templateId, state, draft), `${stem}-全班排版.docx`);
      else saveDownload(await word.buildWordBlob(templateId, state, draft, isChild ? childId : ""), `${stem}${isChild ? `-${safeName(child?.name)}` : ""}.docx`);
      notify("可編輯 Word 檔已產出");
    } catch (error) {
      console.error("Word export failed", error);
      notify(`產出失敗：${error?.message || "請檢查內容後重試"}`);
    } finally { setBusy(false); }
  }

  const groups = [...new Set(DOCUMENT_TEMPLATES.map((item) => item.group))];
  const layout = isGrid ? planChildPages(templateId, state.children.map((entry) => ({
    id: entry.id,
    text: [fields.common, fields.body, draft.childNotes?.[entry.id], fields.reminder, fields.songs].filter(Boolean).join(" "),
    photoCount: draft.photoIds.length ? state.photos.filter((photo) => draft.photoIds.includes(photo.id) && photo.childIds.includes(entry.id)).length : state.photos.filter((photo) => photo.childIds.includes(entry.id)).length,
    linkCount: [fields.link1, fields.link2, fields.link3, fields.link4].filter(Boolean).length,
  }))) : null;

  return <section className="screen documents-screen">
    <header className="screen-title"><div><span className="eyebrow">文件工作台</span><h1>內容填好，版面自動排</h1><p>依你提供的實際 Word 文件建立版型。園所、班級、老師與名單會自動帶入；內容可自行輸入或選用現有紀錄。</p></div></header>
    <div className="documents-layout">
      <aside className="panel document-picker"><span className="eyebrow">選擇文件</span>{groups.map((group) => <div className="document-group" key={group}><h2>{group}</h2>{DOCUMENT_TEMPLATES.filter((item) => item.group === group).map((item) => <button type="button" key={item.id} className={templateId === item.id ? "is-selected" : ""} onClick={() => setTemplateId(item.id)}>{item.name}<small>{item.pageSize} {item.orientation === "landscape" ? "橫式" : "直式"}</small></button>)}</div>)}</aside>
      <div className="document-editor">
        <article className="panel document-form"><div className="document-form-head"><div><span className="eyebrow">{template.group}</span><h2>{template.name}</h2><p>{state.classMeta.school} · {state.classMeta.className} · {state.classMeta.ownerName} · {state.classMeta.period}</p></div><span className="document-size">{template.pageSize} {template.orientation === "landscape" ? "橫式" : "直式"}</span></div>
          {isGrid && <div className="layout-readout" role="status"><strong>自動排版：每面 {layout.cellsPerPage} 格</strong><span>{state.children.length} 位幼兒，共 {layout.pages.length} 面；內容增加時會自動改為較大的格子。</span></div>}
          <div className="document-fields">{template.fields.map((field) => <label key={field.key}>{field.label}{field.kind === "textarea" ? <textarea rows="3" value={fields[field.key] || ""} onChange={(event) => setField(field.key, event.target.value)} placeholder={field.hint || "可自行輸入"} /> : <input value={fields[field.key] || ""} onChange={(event) => setField(field.key, event.target.value)} placeholder={field.hint || "可自行輸入"} />}</label>)}</div>
          {template.columns.length > 0 && <div className="document-rows"><div className="document-subhead"><h3>表格內容</h3><button type="button" className="secondary" onClick={() => updateDraft({ rows: [...draft.rows, {}] })}>＋ 增加一列</button></div>{draft.rows.length ? draft.rows.map((row, index) => <div className="document-row" key={index}><strong>第 {index + 1} 列</strong><div>{template.columns.map((column) => <label key={column.key}>{column.label}{column.key === "rating" || ["first", "second", "third"].includes(column.key) && template.ratingOptions ? <select value={row[column.key] || ""} onChange={(event) => setRow(index, column.key, event.target.value)}><option value="">請選擇</option>{template.ratingOptions.map((option) => <option key={option}>{option}</option>)}</select> : <input value={row[column.key] || ""} onChange={(event) => setRow(index, column.key, event.target.value)} />}</label>)}</div><button type="button" className="text-button" onClick={() => updateDraft({ rows: draft.rows.filter((_, rowIndex) => rowIndex !== index) })}>刪除這列</button></div>) : <p className="document-hint">尚未填列；輸出時會保留可編輯的空白表格。</p>}</div>}
          {isChild && <div className="document-individual"><h3>個別內容</h3><label>選擇幼兒<select value={childId} onChange={(event) => setChildId(event.target.value)}>{state.children.map((item) => <option key={item.id} value={item.id}>{item.seat} 號 · {item.name}</option>)}</select></label><label>{child?.name || "幼兒"}的補充內容<textarea rows="4" value={draft.childNotes?.[childId] || ""} onChange={(event) => setChildNote(event.target.value)} placeholder="留空會使用歷程頁既有的觀察紀錄；填入後以此內容為準" /></label><p className="document-hint">切換幼兒可分別填寫；欄位和段落會自動儲存在這台裝置。</p></div>}
          {state.photos.length > 0 && ["teaching-record", "formative", "contact-photo", "course-share"].includes(templateId) && <div className="document-photos"><h3>照片</h3><p className="document-hint">不勾選時，自動使用已標記給該幼兒的照片；勾選後只使用選取的照片。</p><div>{state.photos.map((photo) => <label key={photo.id}><input type="checkbox" checked={draft.photoIds.includes(photo.id)} onChange={() => togglePhoto(photo.id)} /><img src={photo.src} alt="" /><span>{photo.title || "照片"}</span></label>)}</div></div>}
        </article>
        <div className="document-actions"><button type="button" className="primary" disabled={busy || isChild && !child} onClick={() => exportDocument("single")}>{busy ? "產生中…" : isChild ? `下載 ${child?.name || "幼兒"} Word` : "下載 Word"}</button>{isChild && <><button type="button" className="secondary" disabled={busy || !state.children.length} onClick={() => exportDocument("class")}>{isGrid ? "下載全班 A3 排版" : "下載全班 Word"}</button><button type="button" className="secondary" disabled={busy || !state.children.length} onClick={() => exportDocument("zip")}>全班個別 Word ZIP</button></>}</div>
        <p className="document-privacy">真實姓名、照片與文件內容只保存在目前裝置；下載的 Word 檔會留在你的裝置。換手機或電腦不會自動同步。</p>
      </div>
    </div>
  </section>;
}
