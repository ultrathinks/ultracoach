import { describe, expect, it } from "vitest";
import type { MetricSnapshot } from "@/entities/metrics";
import { createInterventionEngine } from "@/features/voice-coach/intervention-engine";

function snapshot(
  timestampSec: number,
  overrides: Partial<{
    gazeFront: boolean;
    upright: boolean;
    positive: boolean;
    moderate: boolean;
    yaw: number;
    pitch: number;
    shoulderTilt: number;
    headOffset: number;
    frown: number;
    wrist: number;
  }> = {},
): MetricSnapshot {
  return {
    timestamp: timestampSec * 1000,
    gaze: {
      pitch: overrides.pitch ?? 0,
      yaw: overrides.yaw ?? 0,
      isFrontFacing: overrides.gazeFront ?? true,
    },
    posture: {
      shoulderTilt: overrides.shoulderTilt ?? 0,
      headOffset: overrides.headOffset ?? 0,
      isUpright: overrides.upright ?? true,
    },
    expression: {
      frownScore: overrides.frown ?? 0,
      isPositiveOrNeutral: overrides.positive ?? true,
    },
    gesture: {
      wristMovement: overrides.wrist ?? 0,
      isModerate: overrides.moderate ?? true,
    },
  };
}

describe("createInterventionEngine", () => {
  const cfg = { cooldown: 20, minInterval: 20, triggerDuration: 5 };

  it("never fires while user is speaking", () => {
    const engine = createInterventionEngine(cfg);
    for (let t = 21; t < 40; t++) {
      const r = engine.evaluate(snapshot(t, { upright: false }), true);
      expect(r).toBeNull();
    }
  });

  it("fires after sustained issue beyond triggerDuration", () => {
    const engine = createInterventionEngine(cfg);
    // first eval starts the timer at t=21 (past minInterval)
    expect(
      engine.evaluate(snapshot(21, { upright: false, shoulderTilt: 5 }), false),
    ).toBeNull();
    // still under triggerDuration
    expect(
      engine.evaluate(snapshot(24, { upright: false, shoulderTilt: 5 }), false),
    ).toBeNull();
    // crossed triggerDuration
    const fired = engine.evaluate(
      snapshot(27, { upright: false, shoulderTilt: 5 }),
      false,
    );
    expect(fired?.type).toBe("posture");
  });

  it("respects cooldown after firing", () => {
    const engine = createInterventionEngine(cfg);
    engine.evaluate(snapshot(21, { upright: false }), false);
    engine.evaluate(snapshot(27, { upright: false }), false); // fires
    // 10s later — still in cooldown
    const r = engine.evaluate(snapshot(37, { upright: false }), false);
    expect(r).toBeNull();
  });

  it("picks the highest severity issue when multiple", () => {
    const engine = createInterventionEngine(cfg);
    // sustain both posture (severity 1) and gaze (severity 100) for 6s
    engine.evaluate(
      snapshot(21, { upright: false, gazeFront: false, yaw: 50, pitch: 50 }),
      false,
    );
    const fired = engine.evaluate(
      snapshot(27, { upright: false, gazeFront: false, yaw: 50, pitch: 50 }),
      false,
    );
    expect(fired?.type).toBe("gaze");
  });

  it("clears the issue start when condition recovers", () => {
    const engine = createInterventionEngine(cfg);
    engine.evaluate(snapshot(21, { upright: false }), false);
    // recovers
    engine.evaluate(snapshot(23, { upright: true }), false);
    // re-enters bad state — must restart trigger window, not fire immediately
    expect(
      engine.evaluate(snapshot(25, { upright: false, shoulderTilt: 5 }), false),
    ).toBeNull();
  });
});
