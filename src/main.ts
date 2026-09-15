import './style.css';
import { FieldSettings } from './field/FieldSettings';
import { TipSmoother } from './field/TipSmoother';
import { FingerFieldRenderer } from './shaders/FingerFieldRenderer';
import { HandTracker, type TrackedTip } from './tracking/HandTracker';
import { SettingsPanel } from './ui/SettingsPanel';
import { FieldModules } from './field/FieldModules';
import { PalettePanel } from './ui/PalettePanel';
import { ColorStrip } from './ui/ColorStrip';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const video = document.getElementById('webcam') as HTMLVideoElement;
const wrap = document.getElementById('webcam-wrap') as HTMLDivElement;
const overlay = document.getElementById('webcam-overlay') as HTMLCanvasElement;
const anonBtn = document.getElementById('anon-btn') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLDivElement;

const LS_ANON = 'fpw.webcamAnon';

function setStatus(msg: string): void {
  status.textContent = msg;
}

const settings = new FieldSettings();
const smoother = new TipSmoother();
const renderer = new FingerFieldRenderer(canvas);
new SettingsPanel(settings);
const fieldModules = new FieldModules();
const palette = new PalettePanel(fieldModules);
palette.onChange(() => {
  renderer.setModes(fieldModules.modes());
});
renderer.setModes(fieldModules.modes());
const colors = new ColorStrip();
colors.onChange(([r, g, b]) => renderer.setTint(r, g, b));

function syncOverlaySize(): void {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight || Math.round(w * 0.75);
  if (overlay.width !== w || overlay.height !== h) {
    overlay.width = w;
    overlay.height = h;
  }
}

function drawOverlay(
  tips: { x: number; y: number; energy: number }[],
): void {
  syncOverlaySize();
  const ctx = overlay.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  for (const t of tips) {
    const px = t.x * overlay.width;
    const py = t.y * overlay.height;
    const r = 5 + t.energy * 6;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 220, 120, ${0.45 + t.energy * 0.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }
}

async function startCam(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    syncOverlaySize();
    return true;
  } catch (e) {
    console.error(e);
    setStatus('Camera denied or unavailable. Allow webcam and reload.');
    return false;
  }
}

let anon = localStorage.getItem(LS_ANON) === '1';
function applyAnon(): void {
  wrap.classList.toggle('anon', anon);
  anonBtn.classList.toggle('on', anon);
  anonBtn.textContent = anon ? 'Anon ON' : 'Anon';
}
applyAnon();
anonBtn.addEventListener('click', () => {
  anon = !anon;
  localStorage.setItem(LS_ANON, anon ? '1' : '0');
  applyAnon();
});

const tracker = new HandTracker();
let camOk = false;
let trackOk = false;

async function boot(): Promise<void> {
  setStatus('Loading MediaPipe Hands…');
  const camP = startCam();
  try {
    await tracker.init();
    trackOk = true;
  } catch (e) {
    console.error(e);
    setStatus('Failed to load hand model (needs network once for CDN).');
  }
  camOk = await camP;
  if (camOk && trackOk) {
    setStatus('FingerPaint WEBGL — hold tips to bloom the field (⚙ for feel).');
  }
}

boot();

let lastT = performance.now();

function frame(now: number): void {
  const dt = (now - lastT) / 1000;
  lastT = now;
  const s = settings.get();
  tracker.maxTips = s.maxTips;

  let live: TrackedTip[] = [];
  if (camOk && trackOk && video.readyState >= 2) {
    live = tracker.detect(video);
    drawOverlay(live);
  } else {
    drawOverlay([]);
  }

  const smooth = smoother.update(live, dt, s, Math.max(2, s.maxTips));

  if (smooth.length) {
    const peak = Math.max(...smooth.map((t) => t.energy));
    setStatus(
      `Bloom ${smooth.length} field${smooth.length === 1 ? '' : 's'} · peak ${(peak * 100) | 0}%`,
    );
  }

  // Shader UV y=0 is bottom; MediaPipe y=0 is top. Flip Y for GL.
  // Apply intensity gain so the fragment sees a quieter field.
  renderer.render(
    smooth.map((t) => ({
      x: t.x,
      y: 1 - t.y,
      energy: t.energy * s.intensity,
    })),
  );
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
window.addEventListener('resize', () => {
  renderer.resize();
  syncOverlaySize();
});
