export interface ScoreTrendPoint {
  sessionId: string;
  createdAt: string; // ISO 8601
  deliveryScore: number | null;
  contentScore: number | null;
  interviewType: string;
}

export interface TypeComparisonGroup {
  type: string; // "personality" | "technical" | "culture-fit"
  typeLabel: string; // "인성" | "기술" | "컬처핏"
  avgDelivery: number; // 0-100
  avgContent: number; // 0-100
  count: number;
}

export interface ChangeRate {
  deliveryChange: number; // percentage: (latest - first) / first * 100
  contentChange: number;
  hasEnoughData: boolean; // false when sessions < 2
}

export interface DashboardStats {
  totalSessions: number;
  recentWeekSessions: number; // sessions in last 7 days
  changeRate: ChangeRate;
}

export interface StarRadarPoint {
  subject: string; // "Situation" | "Task" | "Action" | "Result"
  value: number; // 0-100 fulfillment percentage
}

export type StarRadarData = StarRadarPoint[];

export interface FillerHeatmapSession {
  sessionId: string;
  label: string; // e.g. "3/24"
}

export interface FillerHeatmapCell {
  sessionIdx: number;
  wordIdx: number;
  freqPerMin: number;
}

export interface FillerHeatmapData {
  sessions: FillerHeatmapSession[];
  words: string[]; // top-N unique filler words, ordered by total frequency
  cells: FillerHeatmapCell[];
  maxFreq: number; // for color normalization
}

export interface BodyLanguageCategory {
  key: string; // "gaze" | "posture" | "expression" | "gesture"
  label: string; // "시선" | "자세" | "표정" | "제스처"
  score: number; // 0-100
  trend: "up" | "down" | "flat" | "none"; // "none" when only 1 session
}

export interface BodyLanguageData {
  categories: BodyLanguageCategory[];
  hasData: boolean;
}

export interface ActionItemEntry {
  id: number;
  text: string;
  tag: "new" | "repeat" | null; // null when only 1 session (no comparison)
}

export interface ActionTrackerData {
  items: ActionItemEntry[];
  sessionDate: string; // ISO string of the latest session
}

export interface AiRecommendationData {
  suggestion: string; // empty string if none
  sessionDate: string; // ISO string of the latest session
}

export interface DashboardAnalytics {
  scoreTrends: ScoreTrendPoint[];
  typeComparison: TypeComparisonGroup[];
  stats: DashboardStats;
  starRadar: StarRadarData;
  fillerHeatmap: FillerHeatmapData;
  actionTracker: ActionTrackerData;
  aiRecommendation: AiRecommendationData;
}
