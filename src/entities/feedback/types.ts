export interface KeyMoment {
  timestamp: number;
  duration: number;
  description: string;
  type: "positive" | "negative";
}

export interface ActionItem {
  id: number;
  text: string;
}

export interface StarFulfillment {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}

export interface QuestionAnalysis {
  questionId: number;
  questionText: string;
  answer: string;
  starFulfillment: StarFulfillment;
  fillerWords: { word: string; count: number }[];
  durationSec: number;
  contentScore: number;
  feedback: string;
}

export interface SessionFeedback {
  deliveryScore: number;
  contentScore: number;
  summary: string;
  growthComparison: {
    deliveryChange: number;
    contentChange: number;
  } | null;
  keyMoments: KeyMoment[];
  actionItems: ActionItem[];
  nextSessionSuggestion: string;
  questionAnalyses: QuestionAnalysis[];
}
