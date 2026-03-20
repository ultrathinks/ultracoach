export interface GazeMetric {
  pitch: number;
  yaw: number;
  isFrontFacing: boolean;
}

export interface PostureMetric {
  shoulderTilt: number;
  headOffset: number;
  isUpright: boolean;
}

export interface ExpressionMetric {
  frownScore: number;
  isPositiveOrNeutral: boolean;
}

export interface GestureMetric {
  wristMovement: number;
  isModerate: boolean;
}

export interface MetricSnapshot {
  timestamp: number;
  gaze: GazeMetric;
  posture: PostureMetric;
  expression: ExpressionMetric;
  gesture: GestureMetric;
}

export interface MetricEvent {
  timestamp: number;
  type: "gaze" | "posture" | "expression" | "gesture";
  message: string;
}
