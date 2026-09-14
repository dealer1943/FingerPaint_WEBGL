# FingerPaint WEBGL

Webcam fingertips drive a **WebGL / Shadertoy-style** math field — not MS Paint strokes.

Each extended fingertip becomes a live uniform in a fragment shader (distance fields, ripples, domain warp). Raise fingers → the equation reacts at those points.

## Stack

- Vite + TypeScript
- Raw WebGL (fullscreen triangle)
- MediaPipe Hands (Tasks Vision)

## Run

```bash
cd ~/Source/repos/FingerPaint_WEBGL
npm install
npm run dev
```

Open http://127.0.0.1:5174/ (HTTPS or localhost for webcam). First load needs network once for MediaPipe WASM/model.

## Slice 1

- Fullscreen shader field
- Up to 10 tips (2 hands × extended digits)
- Upper-cluster filter (folded tips lower on Y ignored)
- Mirrored webcam preview + tip circles
- Anon toggle (hide selfie, keep circles)

## Next slices (ideas)

- Hot-swap fragment shaders / equation presets
- Tip velocity → energy
- Audio-reactive params
- Record / export frames

Separate from classic [FingerPaint](https://github.com/dealer1943/FingerPaint) canvas drawing.
