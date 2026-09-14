# IqEzles Method for Shader Art

A cover-to-cover teaching manual synthesizing the Inigo Quilez article corpus (local `RESEARCH/p1.pdf` … `p140.pdf`) into one learnable method for procedural graphics, SDFs, raymarching, noise, lighting, and fractal craft.

**Canonical live index (always start here for originals):**  
[https://iquilezles.org/articles/](https://iquilezles.org/articles/)

## Attribution & license

Methods, derivations, and many code snippets originate with **Inigo Quilez**. His technical snippets are typically offered under the **MIT license**; mathematical/shader *art* imagery may require a separate license — check his site. This manual is an **original teaching reorganization** for humans and LLMs: it explains workflows and mental models in new prose, maps every local PDF to its article title, and points you back to the authoritative pages. It is **not** a verbatim reprint of the articles.

Local mirrors: `RESEARCH/pN.pdf` (printouts). Companion measurement notes: [`finger_depth_view_prism.md`](./finger_depth_view_prism.md).

---

## 0. How to use this book

### Human mode
Read chapters 1 → 8 in order once. Do every **Practice** block in a Shadertoy tab or in FingerPaint_WEBGL’s fragment shader. Then skim 9–14 as reference. Use Chapter 15 when driving fields with fingertips. Appendix A tells you which `pN.pdf` matches which topic.

### LLM mode
Treat chapters as a **method graph**:
1. Identify the goal (color, shape, march, light, noise, filter, fractal).
2. Jump to the matching chapter’s **Method card**.
3. Follow the checklist; cite `pN` + the live articles index when emitting code.
4. Prefer Quilez’s MIT snippets from the live article when implementing exact SDF primitives — do not invent “almost SDFs.”

### The IqEzles loop (memorize this)
1. **Remap** inputs into a nice domain (0..1, -1..1, polar, etc.).
2. **Shape** with distance (or noise) into a scalar field.
3. **Combine** fields (min, smooth-min, warp, repeat).
4. **Sample** along rays or across the pixel plane.
5. **Shade** with normals, lights, fog, AO.
6. **Filter** so high frequencies do not alias.
7. **Grade** color (palette, gamma, tint).

---

## 1. Mental model: worlds on two triangles

A fullscreen triangle/quad means every pixel runs the same program. There is no mesh database unless you invent one in math.

**Raymarching mindset (p65, p49):** for pixel `(x,y)`, build a camera ray `ro + t*rd`, then advance `t` by the distance to the scene until you hit (or miss). If the scene is a **Signed Distance Field (SDF)**, a safe step is approximately `t += map(p)`.

**2D field mindset (FingerPaint_WEBGL default):** for pixel UV `p`, evaluate `f(p, tips, time)` and map `f` through a palette. Fingertips are moving singularities in that field.

**Method card — first shader**
- Normalize `fragCoord / resolution` → `uv`.
- Optionally center: `p = (2*uv - 1) * vec2(aspect, 1)`.
- Compute a scalar `t` from distance/noise.
- `col = palette(t)`; write `fragColor`.

**Practice:** render `length(p)` as grayscale; then `sin(10.0*length(p) - time)`.

Live: search articles index for *Rendering Worlds With Two Triangles* (p65).

---

## 2. Numbers that shape images

### Remapping
Almost all beauty is remapping: clamp, smoothstep, powers, bias/gain. Before inventing a new noise, ask whether a remap of an existing field is enough.

### Smoothstep family (p12, p122, p127)
Classic Hermite smoothstep `x²(3-2x)` on `[0,1]` is the default ease. Variants exist (quartic, quintic, rational, piecewise) with different continuity and invertibility. Use:
- cubic when you need a cheap S-curve,
- higher continuity when stitching noise layers,
- inverse smoothstep when you must undo an ease (p127),
- integrals when you need analytic area under a pulse (p122).

General interval: `smoothstep(a,b,x)` ≡ smoothstep01(`saturate((x-a)/(b-a))`).

### Sigmoids (p13)
Soft global transitions without hard edges; useful for lighting response and soft masks. Prefer true compact smoothsteps when you need local support.

### Trig alternatives (p14, p86–p88, p105)
Sin/cos are expressive but expensive/bulky in size-coding. Quilez collects identities and “avoiding trigonometry” tricks (polynomial approximations, diamond norms, snap-to-angle). Use trig freely in WEBGL art; switch to approximations only under constraints.

**Practice:** replace a hard threshold `step(0.5, d)` with `smoothstep(0.45, 0.55, d)` and feel the edge soften.

---

## 3. Color as math (palettes)

### Cosine palettes (p39)
A powerful compact form (teaching sketch):

```glsl
vec3 palette(float t) {
  return a + b * cos(6.28318 * (c * t + d));
}
```

Choose vectors `a,b,c,d` to get earth, neon, fire, ice. FingerPaint_WEBGL already uses this idea; the left **palette UI tint** biases `b`/`mix` toward a user color without abandoning the cosine structure.

### Gamma awareness (p78, p97)
Light and blur in linear-ish space when you can; display with an encoding curve. Naive averaging in sRGB washes contrast. Outdoors lighting notes also stress working with sensible color spaces for sun/sky/bounce.

**Method card — pick a look**
1. Fix `a` (average color), `b` (amplitude), `c` (frequency per channel), `d` (phase).
2. Drive `t` from your field (distance, angle, noise).
3. Optionally `mix` toward a UI tint.

**Practice:** animate `d.x += 0.01*time` for a slow hue drift.

Live: [articles index](https://iquilezles.org/articles/) → *palettes*.

---

## 4. Distance as the universal primitive

### What an SDF is
`sd(p)` returns signed distance to a surface: negative inside, positive outside, zero on the surface. **Exact** Euclidean SDFs enable robust sphere tracing. Wrong “distance-like” functions may still draw something but break shadows, AO, and step sizes.

### 2D primitives first (p3, p4, p6)
Circles, boxes, segments, polygons, ellipses — many 3D primitives are extrusions/revolutions of 2D SDFs. Prefer formulas with few sqrts/divisions. L∞ variants (p6) give diamond/square metrics for stylistic shapes.

### 3D primitives (p1, p2, p5, p10, p11, p54, p60)
Sphere, box, rounded box, ellipsoid, torus, cylinders, capsules, etc. Keep a personal cheatsheet; when implementing, prefer Quilez’s verified snippets from the live *distance functions* pages.

### Gradients / normals (p4, p5, p53)
`n = normalize(∇sd)`. In practice, tetrahedral or central differences on `map(p)` give normals for lighting. Analytic gradients exist for many 2D/3D prims when you need perfection.

### Bounding volumes (p7, p8, p57, p113–p114)
AABBs and SDF bounding volumes accelerate marches and culling. Design big cheap bounds around expensive detail.

**Method card — first SDF scene**
```text
float map(vec3 p) {
  float d = sdSphere(p - vec3(0,1,0), 0.5);
  d = min(d, sdBox(p, vec3(2,0.1,2))); // floor
  return d;
}
```

**Practice:** union a sphere and a box with `min`; then subtract with `max(a, -b)`.

---

## 5. Building worlds from fields

### Boolean algebra on distances
- Union: `min(a,b)`
- Intersection: `max(a,b)`
- Subtraction: `max(a, -b)`

### Smooth minimum (p50)
`smin` blends surfaces into organic joins. Essential for creatures, blobs, eroded architecture. Remember smooth blends thicken/shrink volumes — tune `k`.

### Domain repetition (p51)
Repeat space with `mod`/`fract` before evaluating a primitive to instance pillars, grids, cities. Combine with limits to avoid infinite copies when needed.

### Domain deformation
Bend, twist, taper by transforming `p` before `map`. Cheap spectacle; watch distance distortion (steps may need clamping).

### XOR / interior / special ops (p55, p56)
Interior SDFs and XOR-style ops expand the CSG vocabulary for cavities and interlocking forms.

**Practice:** `smin` two spheres; animate centers with fingertips mapped into the prism (see Chapter 15).

---

## 6. Raymarching loop

Core sphere tracing (p49, p65):

```text
t = tmin
for i in 0..MAX_STEPS:
  p = ro + t*rd
  d = map(p)
  if d < hitEpsilon: HIT
  t += d
  if t > tmax: MISS
```

**Controls**
- `MAX_STEPS`, `hitEpsilon`, `tmax` trade quality/perf.
- Overshoot / understep: scale `t += k*d` with `k<=1` when map is not exact.
- Binary search refinement near surfaces (p58) can polish hits.
- Terrains (p63) and FBM-detailed SDFs (p59) need care: adding noise can break the SDF contract — use bounded detail or distance estimation techniques (p61).

**Shading at hit**
Normal from gradient → diffuse/specular → fog → palette grade.

**Practice:** march a single sphere; color by normal; then by iteration count (cost viz).

---

## 7. Lighting for tiny demos

### Outdoors three-light rig (p78)
A practical stack: key (sun), fill (sky), rim/bounce; one real soft shadow; cheap AO; fog. Balance intensities so no term dominates.

### Soft shadows (p24, p52)
March toward the light, tracking how close you pass other surfaces; penumbra from minimum openness along the ray.

### Ambient occlusion (p80–p83, p106–p107)
Sample distances around the point (SDF AO) or use screen-space / vertex approaches. Multires AO captures near and far cavity darkening.

### Fog (p79)
Go beyond `mix(col, fogColor, factor(dist))`: colored fog, height fog, sun discs in fog. Fog sells scale.

### Directional derivatives & GI sketches (p81, p84)
Extra tools when you outgrow Lambert.

**Method card — outdoors shade**
1. `sun = lambert(n, sunDir) * sunCol * shadow`
2. `sky = skyCol * (0.5 + 0.5*n.y)`
3. `ind = bounceCol * AO`
4. `col = sun+sky+ind`; then fog

---

## 8. Noise & structure

### Value vs gradient noise (p17, p18)
Gradient noise generally looks cleaner for terrain/clouds; derivatives help analytical filtering and slopes.

### fBM (p16)
Layer octaves: each octave higher frequency, lower amplitude. Hurst exponent `H` controls roughness memory (smooth vs jagged). This is the backbone of procedural landscapes and soft fields.

### Domain warping (p19)
Feed noise into the domain of another noise (`q = p + amp*noise(p)`). Creates flowing marble, cloth, alien maps. Central to FingerPaint-style “math at the fingers” when tips warp UV.

### Voronoi family (p20–p22, p102)
Cellular patterns, smooth voronoi, edges — stones, cells, cracked earth, stylistic HUD textures.

**Practice:** 4-octave fBM grayscale; then warp UV by tip positions.

Live: articles → *fBM*, *domain warping*, *voronoise*.

---

## 9. Filtering & aliasing

Procedurals alias when detail exceeds Nyquist (p69, p70). Strategies:
- Analytic integrals of patterns (checkers, grids) (p15, p72–p74)
- Band-limit by clamping octave count using screen derivatives
- Ray differentials for texture footprints (p71)
- Improved interpolation / hardware filtering notes (p75–p76)
- Premultiplied alpha done right (p66)
- Biplanar mapping for triplanar-like projection without seams hell (p67)
- Avoid naive texture repetition sparkle (p68)

**Method card**
Estimate `w = max(length(dFdx(p)), length(dFdy(p)))` and fade high frequencies as `w` grows.

---

## 10. Oldschool 2D craft

Plane deformations / LUT tunnels (p100), feedback (p101), voronoi effects (p102), Game of Life (p103), simple water/clouds (p98–p99), cube-in-QBasic nostalgia (p104). These teach **UV inventiveness**: polar maps, `atan`, zooming tunnels, trail buffers.

**Practice:** `uv' = uv / length(uv)` tunnel; scroll by `time`.

---

## 11. Fractals & orbit traps

Distance to fractals (p129), Mandelbulb (p130), 3D Julias (p131), orbit traps procedural/bitmap/geometric (p132–p135), Buddhabrot (p136), popcorn/IFS/Lyapunov/icon images (p137–p140), Menger (p62).

**Method path**
1. 2D Mandelbrot continuous iteration feel.
2. Orbit traps for coloring.
3. 3D Mandelbulb / Julia with distance estimators.
4. Hybrid: SDF union of fractal DETAIL onto a base primitive (careful!).

---

## 12. Raytracing beyond SDFs

Classic raytracing intros (p25–p29), GPU tracers, tiled tracing, SSE CPU tricks, path tracing in one hour (p23), sphere soft shadow as analytic light transport helper (p24), ray-triangle hacking (p94), stereo/VR (p95–p96). Use when scenes are meshes/instanced primitives rather than pure SDFs.

---

## 13. Size-coding & demoscene craft

4k/64k constraints (p37–p48, p38 Elevated): compact palettes, tiny float packing, minimal splines, small PNG writers, procedural characters, compile-size hygiene. Even if you are not size-coding, these chapters teach **expressive minimalism** — perfect for elegant FingerPaint fields.

---

## 14. Useful maths toolkit

Spheres/boxes helpers (p10–p11, p106–p110), ellipses (p115–p116), triangles/polygons (p112, p117–p118), mesh normalization (p119), patched sphere (p120), Fourier (p121), quaternions (p125), FM synthesis as wave inspiration (p124), reflect/clip domain tricks (p123), random small floats (p128), trisect (p126). Keep this chapter as a **lookup**, not a first read.

---

## 15. Capstone: FingerPaint_WEBGL recipes

Working volume: see [`finger_depth_view_prism.md`](./finger_depth_view_prism.md) — tips detectable ~9–18″ deep; near face ~9×5 fingertip-circle units → a rectangular prism for 3D thinking.

### Recipe A — tip distance field (2D)
For each tip `ti` with energy `ei`: accumulate `pot += ei / (dot(p-ti,p-ti) + eps)` and optional ripples `sin(k*|p-ti| - time)`.
Palette-map the field; multiply by attack/decay-smoothed energy.

### Recipe B — domain warp from tips
`q = p + 0.05 * sum( normalize(p-ti) * ei * exp(-r) )` then evaluate fBM(`q`).

### Recipe C — prism SDF toy
Map tip into prism coords `(X,Y,Z)`; place `sdSphere` at that point; raymarch a tiny scene under the hand.

### Recipe D — cosine palette + UI tint
Keep Quilez-style `a+b*cos(...)` and `mix` toward palette-well RGB (already in app).

### Checklist before “shipping a feel”
- [ ] Intensity attack/decay comfortable (defaults ~10s / ~30s)
- [ ] Position smoothing kills jitter
- [ ] Gain/intensity not clipping to neon
- [ ] Palette tint subtle
- [ ] Idle field calm when no tips

---

## 16. Study orders

### Weekend path (practical art)
p39 palettes → p12 smoothstep → p3 2D distances → p19 warp → p16 fBM → p100 deformations → Chapter 15 recipes.

### Solid SDF path (2 weeks)
p65 → p49 → p1/p3 primitives → p50 smin → p51 repeat → p53 normals → p52 soft shadow → p78 lights → p79 fog → p59 fbm-in-sdf caution.

### Deep craft path
Add filtering (p69–p74), exact gradients (p4–p5), fractals (p130–p135), path tracing (p23).

---

## Appendix A — Local PDF index (p1–p140)

Find each title on [https://iquilezles.org/articles/](https://iquilezles.org/articles/). Local file: `RESEARCH/pN.pdf`.

- **p1.pdf** — distance functions
- **p2.pdf** — distance functions
- **p3.pdf** — 2D distance functions
- **p4.pdf** — 2D distance and gradient functions (2019)
- **p5.pdf** — 3D distance and gradient functions (2025)
- **p6.pdf** — 2D distance functions in L-infinity norm
- **p7.pdf** — 2D axis aligned bounding boxes
- **p8.pdf** — 3D axis aligned bounding boxes
- **p9.pdf** — intersectors
- **p10.pdf** — sphere functions
- **p11.pdf** — box functions
- **p12.pdf** — smoothstep functions
- **p13.pdf** — sigmoid functions
- **p14.pdf** — trigonometric functions
- **p15.pdf** — filterable procedurals
- **p16.pdf** — fBM (2019)
- **p17.pdf** — gradient noise derivatives (2017)
- **p18.pdf** — value noise derivatives (2008)
- **p19.pdf** — domain warping (2002)
- **p20.pdf** — voronoise (2014)
- **p21.pdf** — smooth voronoi (2012)
- **p22.pdf** — voronoi edges (2012)
- **p23.pdf** — simple pathtracing (2012)
- **p24.pdf** — sphere soft shadow (2014)
- **p25.pdf** — oldschool raytracing (2005)
- **p26.pdf** — simple gpu raytracing (2005)
- **p27.pdf** — tracing in tiles (2008)
- **p28.pdf** — sse for cpu tracers (2005)
- **p29.pdf** — introduction to raytracing (2001)
- **p30.pdf** — volumetric sort (2006)
- **p31.pdf** — voxel lines and occlusion (2013)
- **p32.pdf** — simple voxel (2000)
- **p33.pdf** — genetic algorithms (2010, 2023)
- **p34.pdf** — mesh compression (2007)
- **p35.pdf** — wavelet image compression (2007)
- **p36.pdf** — 3D models generation (2005)
- **p37.pdf** — making graphics in 4 kilobytes
- **p38.pdf** — behind Elevated / Function 2009
- **p39.pdf** — palettes (1999)
- **p40.pdf** — storing floating point in 4k (2008)
- **p41.pdf** — minimal code for splines (2003)
- **p42.pdf** — minimal frustum culling (2010)
- **p43.pdf** — compiling small (2002)
- **p44.pdf** — making textures with gm.dls (2008)
- **p45.pdf** — opening a file in 4k (2008)
- **p46.pdf** — living characters in 4 kilobytes
- **p47.pdf** — tricks and techniques for 64k demos
- **p48.pdf** — mini PNG 64x64 serializer (2025)
- **p49.pdf** — raymarching distance fields (2008)
- **p50.pdf** — smooth minimum (2013)
- **p51.pdf** — domain repetition (2008, 2013, 2023)
- **p52.pdf** — soft shadows in raymarched SDFs (2010)
- **p53.pdf** — normals for an SDF (2015)
- **p54.pdf** — rounded boxes (2024)
- **p55.pdf** — interior SDFs (2020)
- **p56.pdf** — xor SDFs (2023)
- **p57.pdf** — SDF Bounding Volumes (2019)
- **p58.pdf** — binary search for SDFs (2018, 2022)
- **p59.pdf** — FBM detail in SDFs (2019)
- **p60.pdf** — ellipsoid SDF (2008)
- **p61.pdf** — distance estimation (2011)
- **p62.pdf** — menger fractal (2011)
- **p63.pdf** — raymarching terrains (2002)
- **p64.pdf** — rays and polygons (2010)
- **p65.pdf** — Rendering Worlds With Two Triangles (2008)
- **p66.pdf** — premultiplied alpha (2022)
- **p67.pdf** — biplanar mapping (2020)
- **p68.pdf** — texture repetition (2015)
- **p69.pdf** — filtering procedural textures (2013)
- **p70.pdf** — band limiting (2020)
- **p71.pdf** — ray differentials and texturing (2015)
- **p72.pdf** — filtering the checkerboard pattern (2017)
- **p73.pdf** — filtering the checkerboard pattern (2017)
- **p74.pdf** — filtering the checkerboard pattern (2017)
- **p75.pdf** — improved texture interpolation (2009)
- **p76.pdf** — hardware interpolation (2013)
- **p77.pdf** — tunnel artifact / cylinder seams (2013)
- **p78.pdf** — outdoors lighting (2013)
- **p79.pdf** — better fog (2010)
- **p80.pdf** — multiresolution ambient occlusion (2012)
- **p81.pdf** — directional derivative (2013)
- **p82.pdf** — screen space ambient occlusion (2007)
- **p83.pdf** — per vertex ambient occlusion (2005)
- **p84.pdf** — simple global illumination (2004)
- **p85.pdf** — gpu conditionals (2025)
- **p86.pdf** — snap45 / avoiding trigonometry III (2025)
- **p87.pdf** — a sin/cos trick (2010)
- **p88.pdf** — avoiding trigonometry (2013)
- **p89.pdf** — timing in ticks (2017)
- **p90.pdf** — fixing frustum culling (2013)
- **p91.pdf** — rational rendering and floating bar (2018)
- **p92.pdf** — C++ encapsulation (2012)
- **p93.pdf** — C++ encapsulation (2012)
- **p94.pdf** — hacking a generic ray-intersector (2018)
- **p95.pdf** — stereo (2016)
- **p96.pdf** — how to render in VR (2016)
- **p97.pdf** — gamma correct blurring (2015)
- **p98.pdf** — 2D dynamic clouds (2005)
- **p99.pdf** — simple water (2004)
- **p100.pdf** — plane deformations (1999)
- **p101.pdf** — feedback effect (2002)
- **p102.pdf** — voronoi effect (2002)
- **p103.pdf** — the game of life (1998, 2016)
- **p104.pdf** — rendering a cube in QBasic (2003)
- **p105.pdf** — simple IK without trigonometry (2013)
- **p106.pdf** — sphere ambient occlusion (2006)
- **p107.pdf** — box occlusion (2014)
- **p108.pdf** — sphere density (2015)
- **p109.pdf** — sphere visibility (2008)
- **p110.pdf** — sphere projection (2014)
- **p111.pdf** — inverse bilinear interpolation (2010)
- **p112.pdf** — distance to triangle (2014)
- **p113.pdf** — bezier bounding box (2018)
- **p114.pdf** — disk and cylinder bounding box (2016)
- **p115.pdf** — distance to an ellipse (2009)
- **p116.pdf** — working with ellipses (2006)
- **p117.pdf** — normal and areas of n-sided polygons (2008)
- **p118.pdf** — area of a triangle (2011)
- **p119.pdf** — clever normalization of a mesh (2004)
- **p120.pdf** — patched sphere (2008)
- **p121.pdf** — fourier series (2008)
- **p122.pdf** — Smoothstep Integral (2021)
- **p123.pdf** — don't flip, reflect and clip (2014)
- **p124.pdf** — on frequency modulation synthesis (2008)
- **p125.pdf** — thinking with quaternions (2006)
- **p126.pdf** — fast trisect in GLSL (2020)
- **p127.pdf** — inverse smoothstep (2017)
- **p128.pdf** — float, small and random (2005)
- **p129.pdf** — distance to fractals (2004)
- **p130.pdf** — mandelbulb (2009)
- **p131.pdf** — 3D Julia sets (2001)
- **p132.pdf** — 3d orbit traps (2006)
- **p133.pdf** — procedural orbit traps (2002)
- **p134.pdf** — bitmap orbit traps (2002)
- **p135.pdf** — geometric orbit traps (1999)
- **p136.pdf** — budhabrot (2002)
- **p137.pdf** — pop corn images (1999)
- **p138.pdf** — IFS fractals (2002)
- **p139.pdf** — lyapunov fractals (2001)
- **p140.pdf** — icon images (2002)


## Appendix B — Glossary

| Term | Meaning |
|------|---------|
| SDF | Signed distance function/field |
| smin | Smooth minimum blend |
| fBM | Fractional Brownian motion (octave noise) |
| Domain warp | Distort space with a field before sampling |
| Sphere tracing | Raymarch using distance steps |
| Orbit trap | Color fractal by closeness to a trap shape |
| Penumbra | Soft shadow soft edge |
| Nyquist | Sampling limit before aliasing |
| Cosine palette | `a+b*cos(2π(c·t+d))` color ramp |
| Exact SDF | True Euclidean distance (safe to march) |

## Appendix C — LLM prompt patterns

- “Implement an **exact** SDF for *shape* using Quilez’s distance-functions approach; cite articles index; avoid fake distances.”
- “Combine A and B with **smin**; expose `k` as a uniform.”
- “Add **outdoors** sun/sky/bounce + distance fog; one soft shadow march.”
- “Build **fBM** with `H` control; warp domain by fingertip uniforms.”
- “Filter this procedural checker with screen derivatives / analytic integral.”
- “Map MediaPipe tips into the **9×5×9″ prism** then shade Recipe B.”

---

*End of IqEzles Method for Shader Art. When in doubt, open the live index and the matching `pN.pdf`, then return to the IqEzles loop.*
