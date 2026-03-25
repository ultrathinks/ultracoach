import { z } from "zod";

export const metricSnapshotSchema = z.object({
  timestamp: z.number(),
  gaze: z.object({
    pitch: z.number(),
    yaw: z.number(),
    isFrontFacing: z.boolean(),
  }),
  posture: z.object({
    shoulderTilt: z.number(),
    headOffset: z.number(),
    isUpright: z.boolean(),
  }),
  expression: z.object({
    frownScore: z.number(),
    isPositiveOrNeutral: z.boolean(),
  }),
  gesture: z.object({
    wristMovement: z.number(),
    isModerate: z.boolean(),
  }),
});

export const metricEventSchema = z.object({
  timestamp: z.number(),
  type: z.enum(["gaze", "posture", "expression", "gesture"]),
  message: z.string(),
});

export const metricSnapshotsArraySchema = z.array(metricSnapshotSchema);
