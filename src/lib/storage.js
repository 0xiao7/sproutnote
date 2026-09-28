import { normalizeState } from "./model.js";

const KEY = "sproutnote-state-v1";
export function loadState() { try { const value = localStorage.getItem(KEY); if (!value) return null; const parsed = JSON.parse(value); return parsed?.version === 1 ? normalizeState(parsed) : null; } catch { return null; } }
export function saveState(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }
export function clearState() { localStorage.removeItem(KEY); }
