import { DEFAULT_REPORT_SETTINGS, OBSERVATION_TYPES } from "./templates.js";

const TODAY = "2026-09-29";
const ASSET_BASE = import.meta.env?.BASE_URL || "/";

export function createInitialState() {
  return {
    version: 1,
    classMeta: {
      ownerName: "Fay",
      school: "晨光幼兒園",
      className: "向日葵班",
      period: "2026 上學期",
      ageGroup: "中大混齡 4–6 歲",
    },
    reportSettings: { ...DEFAULT_REPORT_SETTINGS },
    documentDrafts: {},
    history: [],
    children: [
      { id: "child-1", seat: 1, name: "小安", color: "#D66A4A" },
      { id: "child-2", seat: 2, name: "樂樂", color: "#C49A36" },
      { id: "child-3", seat: 3, name: "米米", color: "#4E7A68" },
      { id: "child-4", seat: 4, name: "阿澄", color: "#6E7FA3" },
    ],
    activities: [
      { id: "activity-art", name: "美術創作", date: "2026-09-12", domain: "美感與創作" },
      { id: "activity-blocks", name: "積木建構", date: "2026-09-19", domain: "認知與探索" },
      { id: "activity-garden", name: "雨後小偵探", date: TODAY, domain: "自然觀察" },
    ],
    photos: [
      {
        id: "photo-art",
        src: `${ASSET_BASE}demo/art-table.png`,
        title: "一起畫一座秋天花園",
        activityId: "activity-art",
        childIds: ["child-1", "child-2"],
        date: "2026-09-12",
      },
      {
        id: "photo-blocks",
        src: `${ASSET_BASE}demo/block-bridge.png`,
        title: "讓小車過橋",
        activityId: "activity-blocks",
        childIds: ["child-1", "child-3"],
        date: "2026-09-19",
      },
      {
        id: "photo-garden",
        src: `${ASSET_BASE}demo/garden-observation.png`,
        title: "雨滴裡的小世界",
        activityId: "activity-garden",
        childIds: ["child-2", "child-4"],
        date: TODAY,
      },
    ],
    observations: [
      {
        id: "obs-1",
        childId: "child-1",
        activityId: "activity-blocks",
        keywords: "自己搭橋、失敗兩次、邀請同學一起",
        text: "小安嘗試自己搭橋，兩次倒下後仍重新調整，最後主動邀請同學一起完成。",
        date: "2026-09-19",
      },
      {
        id: "obs-2",
        childId: "child-2",
        activityId: "activity-garden",
        keywords: "發現雨滴、仔細比較、分享看到的形狀",
        text: "樂樂用放大鏡仔細比較葉面上的雨滴，並把看見的形狀分享給同伴。",
        date: TODAY,
      },
    ],
    indicators: {
      "child-1": ["主動嘗試並調整策略", "與同伴合作完成任務"],
      "child-2": ["觀察自然現象並描述發現"],
      "child-3": ["運用素材解決建構問題"],
      "child-4": ["對周遭環境保持好奇"],
    },
  };
}

export function toggleChildTag(state, photoId, childId) {
  return {
    ...state,
    photos: state.photos.map((photo) => {
      if (photo.id !== photoId) return photo;
      const hasTag = photo.childIds.includes(childId);
      return {
        ...photo,
        childIds: hasTag
          ? photo.childIds.filter((id) => id !== childId)
          : [...new Set([...photo.childIds, childId])],
      };
    }),
  };
}

export function movePhotoToActivity(state, photoId, activityId) {
  return {
    ...state,
    photos: state.photos.map((photo) =>
      photo.id === photoId ? { ...photo, activityId } : photo,
    ),
  };
}

export function expandObservation(keywords, typeId = "") {
  const parts = String(keywords)
    .split(/[、,，]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  const type = OBSERVATION_TYPES.find((item) => item.id === typeId);
  const lead = type ? `${type.lead}，孩子` : "今天的活動中，孩子";
  return `${lead}${parts.join("，並且")}。這段文字保留老師提供的具體事件，請由老師確認後再保存。`;
}

export function reportForChild(state, childId) {
  const child = state.children.find((item) => item.id === childId);
  if (!child) throw new Error(`Unknown child: ${childId}`);
  return {
    child,
    photos: state.photos.filter((photo) => photo.childIds.includes(childId)),
    observations: state.observations.filter((item) => item.childId === childId),
    indicators: state.indicators[childId] || [],
    classMeta: state.classMeta,
  };
}

export function updateObservation(state, observation) {
  const exists = state.observations.some((item) => item.id === observation.id);
  return {
    ...state,
    observations: exists
      ? state.observations.map((item) => (item.id === observation.id ? observation : item))
      : [observation, ...state.observations],
  };
}

export function addChild(state, child) {
  const name = String(child.name || "").trim();
  if (!name) return state;
  return {
    ...state,
    children: [...state.children, { ...child, name, seat: Number(child.seat) || state.children.length + 1 }],
  };
}

export function updateChild(state, childId, changes) {
  return {
    ...state,
    children: state.children.map((child) =>
      child.id === childId
        ? { ...child, ...changes, name: String(changes.name ?? child.name).trim(), seat: Number(changes.seat ?? child.seat) || child.seat }
        : child,
    ),
  };
}

export function removeChild(state, childId) {
  const indicators = { ...state.indicators };
  delete indicators[childId];
  return {
    ...state,
    children: state.children.filter((child) => child.id !== childId),
    photos: state.photos.map((photo) => ({ ...photo, childIds: photo.childIds.filter((id) => id !== childId) })),
    observations: state.observations.filter((item) => item.childId !== childId),
    indicators,
  };
}

export function normalizeState(state) {
  const initial = createInitialState();
  return {
    ...initial,
    ...state,
    classMeta: { ...initial.classMeta, ...(state?.classMeta || {}) },
    reportSettings: { ...DEFAULT_REPORT_SETTINGS, ...(state?.reportSettings || {}) },
    documentDrafts: state?.documentDrafts && typeof state.documentDrafts === "object" ? state.documentDrafts : {},
    children: Array.isArray(state?.children) ? state.children : initial.children,
    activities: Array.isArray(state?.activities) ? state.activities : initial.activities,
    photos: Array.isArray(state?.photos) ? state.photos : initial.photos,
    observations: Array.isArray(state?.observations) ? state.observations : initial.observations,
    indicators: state?.indicators && typeof state.indicators === "object" ? state.indicators : initial.indicators,
    history: Array.isArray(state?.history) ? state.history : [],
  };
}

export function archiveCurrentTerm(state) {
  const archiveId = `term-${state.classMeta.school}-${state.classMeta.className}-${state.classMeta.period}`;
  const snapshot = {
    id: archiveId,
    archivedAt: new Date().toISOString(),
    classMeta: { ...state.classMeta },
    reportSettings: { ...state.reportSettings },
    documentDrafts: structuredClone(state.documentDrafts || {}),
    children: state.children.map((child) => ({ ...child })),
    activities: state.activities.map((activity) => ({ ...activity })),
    photos: state.photos.map((photo) => ({ ...photo, childIds: [...photo.childIds] })),
    observations: state.observations.map((observation) => ({ ...observation })),
    indicators: Object.fromEntries(Object.entries(state.indicators).map(([childId, values]) => [childId, [...values]])),
  };
  return {
    ...state,
    history: [snapshot, ...(state.history || []).filter((item) => item.id !== archiveId)],
  };
}

export function addIndicator(state, childId, indicator) {
  const value = String(indicator || "").trim();
  if (!value) return state;
  const current = state.indicators[childId] || [];
  return { ...state, indicators: { ...state.indicators, [childId]: [...new Set([...current, value])] } };
}

export function removeIndicator(state, childId, indicator) {
  return {
    ...state,
    indicators: {
      ...state.indicators,
      [childId]: (state.indicators[childId] || []).filter((value) => value !== indicator),
    },
  };
}
