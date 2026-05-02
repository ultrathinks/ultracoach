import { describe, expect, it } from "vitest";
import { computeAnalytics } from "@/features/analytics/compute-analytics";

const baseFeedback = (questionAnalyses: unknown[] = [], extra = {}) => ({
  deliveryScore: 80,
  contentScore: 70,
  summary: "good",
  growthComparison: null,
  keyMoments: [],
  actionItems: [],
  nextSessionSuggestion: "",
  questionAnalyses,
  ...extra,
});

describe("computeAnalytics", () => {
  it("returns empty analytics for no sessions", () => {
    const a = computeAnalytics([], []);
    expect(a.scoreTrends).toEqual([]);
    expect(a.typeComparison).toEqual([]);
    expect(a.stats.totalSessions).toBe(0);
    expect(a.starRadar).toEqual([]);
    expect(a.fillerHeatmap.sessions).toEqual([]);
    expect(a.actionTracker.items).toEqual([]);
    expect(a.aiRecommendation.suggestion).toBe("");
  });

  it("orders score trends ascending by createdAt", () => {
    const sessions = [
      {
        id: "b",
        interviewType: "personality",
        deliveryScore: 90,
        contentScore: 80,
        createdAt: "2026-03-02T00:00:00.000Z",
      },
      {
        id: "a",
        interviewType: "personality",
        deliveryScore: 70,
        contentScore: 60,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    ];
    const a = computeAnalytics(sessions, []);
    expect(a.scoreTrends.map((p) => p.sessionId)).toEqual(["a", "b"]);
  });

  it("groups type comparison and orders 인성 → 기술 → 컬처핏", () => {
    const sessions = [
      {
        id: "1",
        interviewType: "culture-fit",
        deliveryScore: 80,
        contentScore: 80,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "2",
        interviewType: "personality",
        deliveryScore: 60,
        contentScore: 70,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "3",
        interviewType: "technical",
        deliveryScore: 90,
        contentScore: 50,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    ];
    const a = computeAnalytics(sessions, []);
    expect(a.typeComparison.map((g) => g.type)).toEqual([
      "personality",
      "technical",
      "culture-fit",
    ]);
    expect(
      a.typeComparison.find((g) => g.type === "personality"),
    ).toMatchObject({
      typeLabel: "인성",
      avgDelivery: 60,
      avgContent: 70,
      count: 1,
    });
  });

  it("computes change rate from first to latest completed session", () => {
    const sessions = [
      {
        id: "1",
        interviewType: "personality",
        deliveryScore: 50,
        contentScore: 50,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "2",
        interviewType: "personality",
        deliveryScore: 80,
        contentScore: 70,
        createdAt: "2026-03-05T00:00:00.000Z",
      },
    ];
    const a = computeAnalytics(sessions, []);
    expect(a.stats.changeRate).toEqual({
      deliveryChange: 30,
      contentChange: 20,
      hasEnoughData: true,
    });
  });

  it("flags repeat action items by word overlap", () => {
    const sessions = [
      {
        id: "old",
        interviewType: "personality",
        deliveryScore: null,
        contentScore: null,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "new",
        interviewType: "personality",
        deliveryScore: null,
        contentScore: null,
        createdAt: "2026-03-05T00:00:00.000Z",
      },
    ];
    const feedback = [
      {
        sessionId: "old",
        summaryJson: baseFeedback([], {
          actionItems: [{ id: 1, text: "구체적 사례를 더 추가" }],
        }),
      },
      {
        sessionId: "new",
        summaryJson: baseFeedback([], {
          actionItems: [
            { id: 1, text: "구체적 사례를 더 추가하기" },
            { id: 2, text: "처음 보는 액션" },
          ],
        }),
      },
    ];
    const a = computeAnalytics(sessions, feedback);
    expect(a.actionTracker.items.map((i) => i.tag)).toEqual(["repeat", "new"]);
  });

  it("aggregates STAR radar percentages across all question analyses", () => {
    const sessions = [
      {
        id: "1",
        interviewType: "personality",
        deliveryScore: 80,
        contentScore: 70,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    ];
    const feedback = [
      {
        sessionId: "1",
        summaryJson: baseFeedback([
          {
            questionId: 1,
            questionText: "q",
            answer: "a",
            starFulfillment: {
              situation: true,
              task: false,
              action: true,
              result: false,
            },
            fillerWords: [],
            durationSec: 30,
            contentScore: 70,
            feedback: "ok",
          },
          {
            questionId: 2,
            questionText: "q",
            answer: "a",
            starFulfillment: {
              situation: true,
              task: true,
              action: false,
              result: false,
            },
            fillerWords: [],
            durationSec: 30,
            contentScore: 70,
            feedback: "ok",
          },
        ]),
      },
    ];
    const a = computeAnalytics(sessions, feedback);
    const map = new Map(a.starRadar.map((p) => [p.subject, p.value]));
    expect(map.get("Situation")).toBe(100);
    expect(map.get("Task")).toBe(50);
    expect(map.get("Action")).toBe(50);
    expect(map.get("Result")).toBe(0);
  });
});
