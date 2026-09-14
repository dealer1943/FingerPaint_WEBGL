import './style.css';
import { FingerFieldRenderer } from './shaders/FingerFieldRenderer';
import { HandTracker } from './tracking/HandTracker';

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

const renderer = new FingerFieldRenderer(canvas);
const tracker = new HandTracker();

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
    setStatus('FingerPaint WEBGL — extend fingertips to drive the field.');
  }
}

boot();

function frame(): void {
  let tips: { x: number; y: number; energy: number }[] = [];
  if (camOk && trackOk && video.readyState >= 2) {
    const tracked = tracker.detect(video);
    tips = tracked.map((t) => ({ x: t.x, y: t.y, energy: t.energy }));
    drawOverlay(tips);
    if (tips.length) {
      setStatus(`Driving ${tips.length} tip field${tips.length === 1 ? '' : 's'}`);
    }
  } else {
    drawOverlay([]);
  }

  // Shader UV y=0 is bottom in gl_FragCoord; MediaPipe y=0 is top.
  // Flip Y for uniforms so tips line up with the fullscreen field.
  renderer.render(
    tips.map((t) => ({ x: t.x, y: 1 - t.y, energy: t.energy })),
  );
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
window.addEventListener('resize', () => {
  renderer.resize();
  syncOverlaySize();
});
