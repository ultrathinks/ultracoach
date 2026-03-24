/// <reference lib="webworker" />

import {
  FaceLandmarker,
  PoseLandmarker,
  HandLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;
let poseLandmarker: PoseLandmarker | null = null;
let handLandmarker: HandLandmarker | null = null;
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

const VISION_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";

async function init() {
  const vision = await FilesetResolver.forVisionTasks(VISION_CDN);

  const [face, pose, hand] = await Promise.all([
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      outputFaceBlendshapes: true,
      numFaces: 1,
    }),
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    }),
    HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
    }),
  ]);

  faceLandmarker = face;
  poseLandmarker = pose;
  handLandmarker = hand;

  self.postMessage({ type: "ready" });
}

function computeGaze(faceResult: ReturnType<FaceLandmarker["detectForVideo"]>) {
  if (!faceResult.faceLandmarks?.[0]) {
    return { pitch: 0, yaw: 0, isFrontFacing: true };
  }
  const lm = faceResult.faceLandmarks[0];
  const nose = lm[1];
  const leftEye = lm[33];
  const rightEye = lm[263];
  const yaw = (leftEye.x + rightEye.x) / 2 - nose.x;
  const pitch = (leftEye.y + rightEye.y) / 2 - nose.y;
  return {
    pitch,
    yaw,
    isFrontFacing: Math.abs(pitch) < 0.3 && Math.abs(yaw) < 0.3,
  };
}

function computePosture(
  poseResult: ReturnType<PoseLandmarker["detectForVideo"]>,
) {
  if (!poseResult.landmarks?.[0]) {
    return { shoulderTilt: 0, headOffset: 0, isUpright: true };
  }
  const lm = poseResult.landmarks[0];
  const leftShoulder = lm[11];
  const rightShoulder = lm[12];
  const nose = lm[0];
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
  const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
  const headOffset = Math.abs(nose.x - shoulderCenter);
  return {
    shoulderTilt,
    headOffset,
    isUpright: shoulderTilt < 0.05 && headOffset < 0.08,
  };
}

function computeExpression(
  faceResult: ReturnType<FaceLandmarker["detectForVideo"]>,
) {
  if (!faceResult.faceBlendshapes?.[0]) {
    return { frownScore: 0, isPositiveOrNeutral: true };
  }
  const categories = faceResult.faceBlendshapes[0].categories;
  const browDown =
    categories.find((b) => b.categoryName === "browDownLeft")?.score ?? 0;
  const mouthFrown =
    categories.find((b) => b.categoryName === "mouthFrownLeft")?.score ?? 0;
  const frownScore = (browDown + mouthFrown) / 2;
  return { frownScore, isPositiveOrNeutral: frownScore < 0.3 };
}

let prevWrists: { x: number; y: number }[] = [];

function computeGesture(
  handResult: ReturnType<HandLandmarker["detectForVideo"]>,
) {
  if (!handResult.landmarks?.length) {
    prevWrists = [];
    return { wristMovement: 0, isModerate: true };
  }
  const currentWrists = handResult.landmarks.map((h) => ({
    x: h[0].x,
    y: h[0].y,
  }));
  let movement = 0;
  if (prevWrists.length > 0) {
    for (
      let i = 0;
      i < Math.min(currentWrists.length, prevWrists.length);
      i++
    ) {
      const dx = currentWrists[i].x - prevWrists[i].x;
      const dy = currentWrists[i].y - prevWrists[i].y;
      movement += Math.sqrt(dx * dx + dy * dy);
    }
    movement /= Math.min(currentWrists.length, prevWrists.length);
  }
  prevWrists = currentWrists;
  return { wristMovement: movement, isModerate: movement < 0.05 };
}

function processFrame(bitmap: ImageBitmap, timestamp: number) {
  if (!faceLandmarker || !poseLandmarker || !handLandmarker || !canvas || !ctx)
    return;

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const ts = performance.now();

  const faceResult = faceLandmarker.detectForVideo(canvas as unknown as HTMLCanvasElement, ts);
  const poseResult = poseLandmarker.detectForVideo(canvas as unknown as HTMLCanvasElement, ts);
  const handResult = handLandmarker.detectForVideo(canvas as unknown as HTMLCanvasElement, ts);

  const snapshot = {
    timestamp,
    gaze: computeGaze(faceResult),
    posture: computePosture(poseResult),
    expression: computeExpression(faceResult),
    gesture: computeGesture(handResult),
  };

  self.postMessage({ type: "snapshot", data: snapshot });

  // send raw landmarks for visualization (lightweight — just x,y arrays)
  const landmarks: { face: number[][]; pose: number[][]; hands: number[][][] } = {
    face: [],
    pose: [],
    hands: [],
  };

  if (faceResult.faceLandmarks?.[0]) {
    landmarks.face = faceResult.faceLandmarks[0].map((p: { x: number; y: number }) => [p.x, p.y]);
  }
  if (poseResult.landmarks?.[0]) {
    landmarks.pose = poseResult.landmarks[0].map((p: { x: number; y: number }) => [p.x, p.y]);
  }
  for (const hand of handResult.landmarks ?? []) {
    landmarks.hands.push(hand.map((p: { x: number; y: number }) => [p.x, p.y]));
  }

  self.postMessage({ type: "landmarks", data: landmarks });
}

self.onmessage = (e) => {
  if (e.data.type === "init") {
    canvas = new OffscreenCanvas(640, 480);
    ctx = canvas.getContext("2d");
    init().catch((err) => {
      self.postMessage({ type: "error", data: String(err) });
    });
  } else if (e.data.type === "frame") {
    processFrame(e.data.bitmap, e.data.timestamp);
  }
};
