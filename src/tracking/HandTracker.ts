import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

const WRIST = 0;

const FINGERS: Array<{ id: string; tip: number; pip: number; mcp: number }> = [
  { id: 'thumb', tip: 4, pip: 3, mcp: 2 },
  { id: 'index', tip: 8, pip: 6, mcp: 5 },
  { id: 'middle', tip: 12, pip: 10, mcp: 9 },
  { id: 'ring', tip: 16, pip: 14, mcp: 13 },
  { id: 'pinky', tip: 20, pip: 18, mcp: 17 },
];

export interface TrackedTip {
  key: string;
  id: string;
  handIndex: number;
  /** Mirrored normalized [0..1] */
  x: number;
  y: number;
  /** How extended (0..1) — drives shader energy */
  energy: number;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isExtended(
  tip: { x: number; y: number },
  pip: { x: number; y: number },
  mcp: { x: number; y: number },
): boolean {
  return dist(tip, mcp) > dist(pip, mcp) * 1.12;
}

function extensionEnergy(
  tip: { x: number; y: number },
  pip: { x: number; y: number },
  mcp: { x: number; y: number },
): number {
  const ratio = dist(tip, mcp) / (dist(pip, mcp) + 1e-5);
  return Math.min(1, Math.max(0, (ratio - 1.0) / 0.8));
}

/**
 * MediaPipe Hands → one tip at a time: lowest Y (highest on screen)
 * among extended fingertips. Still tagged with which finger it is.
 */
export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;
  private lastTips: TrackedTip[] = [];
  /** How many tips to emit (default 1). */
  maxTips = 1;

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm',
    );
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      // One hand is enough for single-tip drive and lighter on the browser.
      numHands: 1,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.5,
    });
  }

  detect(video: HTMLVideoElement): TrackedTip[] {
    if (!this.landmarker || video.readyState < 2) return this.lastTips;
    if (video.currentTime === this.lastVideoTime) return this.lastTips;
    this.lastVideoTime = video.currentTime;

    let result: HandLandmarkerResult;
    try {
      result = this.landmarker.detectForVideo(video, performance.now());
    } catch {
      return this.lastTips;
    }

    const tips: TrackedTip[] = [];
    const hands = result.landmarks?.length ?? 0;
    for (let h = 0; h < hands; h++) {
      const lm = result.landmarks[h];
      const mirrored = lm.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z }));
      const wrist = mirrored[WRIST];

      for (const f of FINGERS) {
        if (!isExtended(mirrored[f.tip], mirrored[f.pip], mirrored[f.mcp])) {
          continue;
        }
        let energy = extensionEnergy(
          mirrored[f.tip],
          mirrored[f.pip],
          mirrored[f.mcp],
        );
        const heightBoost = Math.min(1, Math.max(0, 1.2 - mirrored[f.tip].y));
        energy = Math.min(1, energy * 0.7 + heightBoost * 0.3);
        const span = dist(wrist, mirrored[f.tip]);
        energy = Math.min(1, energy * (0.75 + span));

        tips.push({
          key: `${h}:${f.id}`,
          id: f.id,
          handIndex: h,
          x: mirrored[f.tip].x,
          y: mirrored[f.tip].y,
          energy,
        });
      }
    }

    // Lowest Y = highest on screen. Keep finger id on the winner.
    tips.sort((a, b) => a.y - b.y || a.x - b.x);
    const n = Math.max(1, Math.min(10, Math.floor(this.maxTips) || 1));
    this.lastTips = tips.slice(0, n);
    return this.lastTips;
  }
}
