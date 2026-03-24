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

export interface DashboardAnalytics {
  scoreTrends: ScoreTrendPoint[];
  typeComparison: TypeComparisonGroup[];
  stats: DashboardStats;
}
