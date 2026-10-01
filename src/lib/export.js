function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function reportBody(report, settings) {
  const title = settings.title || `${report.child.name}的成長回顧`;
  const observations = report.observations.length
    ? report.observations.map((item) => `<article><time>${escapeHtml(item.date)}</time><p>${escapeHtml(item.text)}</p></article>`).join("")
    : "<p>目前尚無觀察紀錄。</p>";
  const indicators = report.indicators.length
    ? `<ul>${report.indicators.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "<p>目前尚未設定學習指標。</p>";
  const photos = report.photos.slice(0, 6).map((photo) => `<figure><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.title)}"><figcaption>${escapeHtml(photo.title)}</figcaption></figure>`).join("");
  return `<header><h1>${escapeHtml(title)}</h1><h2>${escapeHtml(report.child.name)}</h2><p>${escapeHtml(settings.intro || "")}</p><small>${escapeHtml(report.classMeta.school)} · ${escapeHtml(report.classMeta.className)} · ${escapeHtml(report.classMeta.period)} · 紀錄者：${escapeHtml(report.classMeta.ownerName)}</small></header><main><section class="gallery">${photos}</section><section><h3>老師的觀察</h3>${observations}</section><section><h3>成長指標</h3>${indicators}</section></main>`;
}

export function buildReportHtml(report, settings = {}) {
  const templateId = settings.templateId || "classic";
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(settings.title || report.child.name)}</title><style>body{font-family:system-ui,"PingFang TC",sans-serif;margin:0;background:#f4f2e9;color:#26332d}body>div{max-width:900px;margin:auto;padding:48px}header{border-bottom:3px solid #264f43;padding-bottom:24px}h1{font-size:38px;margin:0 0 8px}h2{color:#4f7565}.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:28px 0}.gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px}figure{margin:0}figcaption{font-size:12px;margin-top:4px}article{border-top:1px solid #dfe2da;padding:14px 0}article p{line-height:1.8}.photo-story .gallery{grid-template-columns:2fr 1fr}.semester h3{color:#264f43}@media(max-width:600px){body>div{padding:24px}.gallery,.photo-story .gallery{grid-template-columns:1fr 1fr}h1{font-size:30px}}</style></head><body><div class="${escapeHtml(templateId)}">${reportBody(report, settings)}</div></body></html>`;
}
