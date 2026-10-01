export function planChildPages(templateId, entries) {
  const list = Array.isArray(entries) ? entries : [];
  const longest = Math.max(0, ...list.map((entry) => String(entry.text || "").length));
  const mostPhotos = Math.max(0, ...list.map((entry) => Number(entry.photoCount) || 0));
  const mostLinks = Math.max(0, ...list.map((entry) => Number(entry.linkCount) || 0));
  let cellsPerPage;
  if (templateId === "course-share") {
    cellsPerPage = longest > 160 || mostPhotos > 1 ? 4 : 6;
  } else if (templateId === "contact-photo") {
    cellsPerPage = longest > 350 || mostPhotos > 1 ? 6 : longest > 150 ? 8 : 12;
  } else if (templateId === "contact-qr") {
    cellsPerPage = longest > 350 || mostLinks > 2 ? 6 : longest > 150 || mostLinks > 1 ? 8 : 12;
  } else {
    cellsPerPage = longest > 350 ? 6 : longest > 150 ? 8 : 12;
  }
  const columns = cellsPerPage === 12 || cellsPerPage === 8 ? 4 : cellsPerPage === 6 ? 3 : 2;
  const pages = [];
  for (let index = 0; index < list.length; index += cellsPerPage) pages.push(list.slice(index, index + cellsPerPage));
  return { cellsPerPage, columns, pages };
}
