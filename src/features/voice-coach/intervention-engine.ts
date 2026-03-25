import type { MetricSnapshot } from "@/entities/metrics";

export type InterventionType = "gaze" | "posture" | "expression" | "gesture";

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

interface EngineConfig {
  cooldown: number;
  minInterval: number;
  triggerDuration: number;
}

interface State {
  lastInterventionTime: number;
  lastCooldownEnd: number;
  issueStartTimes: Record<InterventionType, number | null>;
}

export function createInterventionEngine(config?: Partial<EngineConfig>) {
  const cooldown = config?.cooldown ?? 20;
  const minInterval = config?.minInterval ?? 20;
  const triggerDuration = config?.triggerDuration ?? 5;

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

    if (isSpeaking) return null;
    if (now - state.lastInterventionTime < minInterval) return null;
    if (now < state.lastCooldownEnd) return null;

    const issues: { type: InterventionType; severity: number }[] = [];

    if (!snapshot.gaze.isFrontFacing) {
      if (!state.issueStartTimes.gaze) state.issueStartTimes.gaze = now;
      if (now - state.issueStartTimes.gaze >= triggerDuration) {
        issues.push({
          type: "gaze",
          severity: Math.abs(snapshot.gaze.yaw) + Math.abs(snapshot.gaze.pitch),
        });
      }
    } else {
      state.issueStartTimes.gaze = null;
    }

    if (!snapshot.posture.isUpright) {
      if (!state.issueStartTimes.posture) state.issueStartTimes.posture = now;
      if (now - state.issueStartTimes.posture >= triggerDuration) {
        issues.push({
          type: "posture",
          severity: snapshot.posture.shoulderTilt + snapshot.posture.headOffset,
        });
      }
    } else {
      state.issueStartTimes.posture = null;
    }

    if (!snapshot.expression.isPositiveOrNeutral) {
      if (!state.issueStartTimes.expression)
        state.issueStartTimes.expression = now;
      if (now - state.issueStartTimes.expression >= triggerDuration) {
        issues.push({
          type: "expression",
          severity: snapshot.expression.frownScore,
        });
      }
    } else {
      state.issueStartTimes.expression = null;
    }

    if (!snapshot.gesture.isModerate) {
      if (!state.issueStartTimes.gesture) state.issueStartTimes.gesture = now;
      if (now - state.issueStartTimes.gesture >= triggerDuration) {
        issues.push({
          type: "gesture",
          severity: snapshot.gesture.wristMovement,
        });
      }
    } else {
      state.issueStartTimes.gesture = null;
    }

    if (issues.length === 0) return null;

    issues.sort((a, b) => b.severity - a.severity);
    const worst = issues[0];

    state.lastInterventionTime = now;
    state.lastCooldownEnd = now + cooldown;
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
