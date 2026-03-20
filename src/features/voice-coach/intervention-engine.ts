import type { MetricSnapshot } from "@/entities/metrics";

export type InterventionType = "gaze" | "posture" | "expression" | "gesture";

const COOLDOWN_SEC = 20;
const TRIGGER_DURATION_SEC = 5;
const MIN_INTERVAL_SEC = 20;

const messages: Record<InterventionType, string> = {
  gaze: "시선 올려보세요",
  posture: "어깨 펴보세요",
  expression: "표정 풀어보세요",
  gesture: "손 안정시켜요",
};

export interface Intervention {
  type: InterventionType;
  message: string;
}

interface State {
  lastInterventionTime: number;
  lastCooldownEnd: number;
  issueStartTimes: Record<InterventionType, number | null>;
}

export function createInterventionEngine() {
  const state: State = {
    lastInterventionTime: 0,
    lastCooldownEnd: 0,
    issueStartTimes: {
      gaze: null,
      posture: null,
      expression: null,
      gesture: null,
    },
  };

  function evaluate(
    snapshot: MetricSnapshot,
    isSpeaking: boolean,
  ): Intervention | null {
    const now = snapshot.timestamp / 1000;

    // 1. never interrupt during speech
    if (isSpeaking) return null;

    // 2. minimum interval
    if (now - state.lastInterventionTime < MIN_INTERVAL_SEC) return null;

    // 3. cooldown
    if (now < state.lastCooldownEnd) return null;

    const issues: { type: InterventionType; severity: number }[] = [];

    // gaze
    if (!snapshot.gaze.isFrontFacing) {
      if (!state.issueStartTimes.gaze) state.issueStartTimes.gaze = now;
      if (now - state.issueStartTimes.gaze >= TRIGGER_DURATION_SEC) {
        issues.push({
          type: "gaze",
          severity:
            Math.abs(snapshot.gaze.yaw) + Math.abs(snapshot.gaze.pitch),
        });
      }
    } else {
      state.issueStartTimes.gaze = null;
    }

    // posture
    if (!snapshot.posture.isUpright) {
      if (!state.issueStartTimes.posture) state.issueStartTimes.posture = now;
      if (now - state.issueStartTimes.posture >= TRIGGER_DURATION_SEC) {
        issues.push({
          type: "posture",
          severity:
            snapshot.posture.shoulderTilt + snapshot.posture.headOffset,
        });
      }
    } else {
      state.issueStartTimes.posture = null;
    }

    // expression
    if (!snapshot.expression.isPositiveOrNeutral) {
      if (!state.issueStartTimes.expression)
        state.issueStartTimes.expression = now;
      if (now - state.issueStartTimes.expression >= TRIGGER_DURATION_SEC) {
        issues.push({
          type: "expression",
          severity: snapshot.expression.frownScore,
        });
      }
    } else {
      state.issueStartTimes.expression = null;
    }

    // gesture
    if (!snapshot.gesture.isModerate) {
      if (!state.issueStartTimes.gesture) state.issueStartTimes.gesture = now;
      if (now - state.issueStartTimes.gesture >= TRIGGER_DURATION_SEC) {
        issues.push({
          type: "gesture",
          severity: snapshot.gesture.wristMovement,
        });
      }
    } else {
      state.issueStartTimes.gesture = null;
    }

    if (issues.length === 0) return null;

    // 4. pick worst (normalized severity, top 1)
    issues.sort((a, b) => b.severity - a.severity);
    const worst = issues[0];

    state.lastInterventionTime = now;
    state.lastCooldownEnd = now + COOLDOWN_SEC;
    state.issueStartTimes[worst.type] = null;

    return { type: worst.type, message: messages[worst.type] };
  }

  function reset() {
    state.lastInterventionTime = 0;
    state.lastCooldownEnd = 0;
    state.issueStartTimes.gaze = null;
    state.issueStartTimes.posture = null;
    state.issueStartTimes.expression = null;
    state.issueStartTimes.gesture = null;
  }

  return { evaluate, reset };
}
