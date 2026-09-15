import './style.css';
import { FieldSettings } from './field/FieldSettings';
import { TipSmoother } from './field/TipSmoother';
import { FingerFieldRenderer } from './shaders/FingerFieldRenderer';
import { HandTracker, type TrackedTip } from './tracking/HandTracker';
import { SettingsPanel } from './ui/SettingsPanel';
import { FieldModules } from './field/FieldModules';
import { PalettePanel } from './ui/PalettePanel';
import { WorldCamera } from './world/WorldCamera';
import { exploreFree, mazeFree, waterFree } from './world/collide';

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
let renderer: FingerFieldRenderer;
try {
  renderer = new FingerFieldRenderer(canvas);
} catch (e) {
  console.error(e);
  setStatus('WebGL shader failed: ' + (e instanceof Error ? e.message : String(e)));
  throw e;
}
new SettingsPanel(settings);
const fieldModules = new FieldModules();
const palette = new PalettePanel(fieldModules);
const worldCam = new WorldCamera();

function applyPortal(): void {
  const s = fieldModules.get();
  worldCam.setMode(s.active);
  renderer.setPortal(fieldModules.uniforms());
}
palette.onChange(() => applyPortal());
applyPortal();

function syncOverlaySize(): void {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight || Math.round(w * 0.75);
  if (overlay.width !== w || overlay.height !== h) {
    overlay.width = w;
    overlay.height = h;
  }
}

function drawOverlay(tips: { x: number; y: number; energy: number }[]): void {
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
    setStatus('Camera denied — tip still drives the portal if you allow it.');
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
  setStatus('Opening portal…');
  const camP = startCam();
  try {
    await tracker.init();
    trackOk = true;
  } catch (e) {
    console.error(e);
    setStatus('Hand model failed (needs network once).');
  }
  camOk = await camP;
  if (camOk && trackOk) {
    setStatus('Portal open — point a finger to look / move. WILD · MAZE · SEA');
  }
}

boot();

function camBasis() {
  const p = worldCam.pose;
  const cp = Math.cos(p.pitch);
  const sp = Math.sin(p.pitch);
  const cy = Math.cos(p.yaw);
  const sy = Math.sin(p.yaw);
  const fwd: [number, number, number] = [sy * cp, -sp, cy * cp];
  const right: [number, number, number] = [cy, 0, -sy];
  const up: [number, number, number] = [
    right[1] * fwd[2] - right[2] * fwd[1],
    right[2] * fwd[0] - right[0] * fwd[2],
    right[0] * fwd[1] - right[1] * fwd[0],
  ];
  const ul = Math.hypot(up[0], up[1], up[2]) || 1;
  return {
    pos: [p.x, p.y, p.z] as [number, number, number],
    fwd,
    right,
    up: [up[0] / ul, up[1] / ul, up[2] / ul] as [number, number, number],
  };
}

let lastT = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.05, (now - lastT) / 1000);
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
  const tip = smooth[0] ?? null;
  const portal = fieldModules.get().active;
  const collide =
    portal === 'maze' ? mazeFree : portal === 'water' ? waterFree : exploreFree;
  worldCam.update(tip, dt, collide);
  renderer.setCamera(camBasis());
  renderer.setPortal(fieldModules.uniforms());
  renderer.render();

  if (tip) {
    setStatus(
      `${portal.toUpperCase()} · tip ${(tip.energy * 100) | 0}% · move with finger`,
    );
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
window.addEventListener('resize', () => {
  renderer.resize();
  syncOverlaySize();
});
