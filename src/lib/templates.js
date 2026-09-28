export const REPORT_TEMPLATES = [
  { id: "classic", name: "經典紀錄", description: "照片、觀察與指標均衡呈現" },
  { id: "photo-story", name: "照片故事", description: "放大照片，適合分享活動過程" },
  { id: "semester", name: "學期總結", description: "突出成長重點與學習指標" },
];

export const ACTIVITY_PRESETS = ["美術創作", "積木建構", "戶外探索", "繪本閱讀", "音樂律動", "生活操作"];

export const DOMAIN_PRESETS = ["美感與創作", "認知與探索", "語言與表達", "社會互動", "生活自理", "自然觀察", "情緒發展"];

export const OBSERVATION_TYPES = [
  { id: "behavior", name: "行為表現", lead: "在行為表現上" },
  { id: "language", name: "語言表達", lead: "在語言表達中" },
  { id: "cooperation", name: "合作互動", lead: "在合作互動中" },
  { id: "exploration", name: "探索思考", lead: "在探索思考時" },
  { id: "self-care", name: "生活自理", lead: "在生活自理活動中" },
  { id: "emotion", name: "情緒表達", lead: "在情緒表達上" },
];

export const INDICATOR_PRESETS = [
  "主動嘗試並調整策略",
  "與同伴合作完成任務",
  "能清楚描述自己的發現",
  "運用素材解決問題",
  "對周遭環境保持好奇",
  "能表達感受並理解他人",
  "能完成符合年齡的生活自理工作",
];

export const DEFAULT_REPORT_SETTINGS = {
  templateId: "classic",
  title: "成長回顧",
  intro: "一起回顧這段時間值得記住的學習片刻。",
};
