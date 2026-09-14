# Finger depth view prism (webcam working volume)

Measured for FingerPaint_WEBGL fingertip illumination / MediaPipe detection against a typical laptop webcam.

## Depth range (camera axis)

| Bound | Distance from camera | Role |
|-------|----------------------|------|
| Near | **9 inches** | Earliest an illuminated fingertip is reliably detected |
| Far | **18 inches** | Practical outer detection limit for the same tip |

Working depth span: **9 inches** (near → far).

## Frustum cross-section at the near plane

When the fingertip is **9 inches** from the camera, using the **circle of the fingertip** as the measuring stick for the webcam’s viewable area:

| Axis | Size (finger-circle units) |
|------|----------------------------|
| Width | **9** |
| Height | **5** |

So the near face of the usable volume is a **9 × 5** rectangle in those units.

## 3D working volume

These measurements define a **rectangular prism** (axis-aligned box in finger-space):

- **Width (X):** 9 units (at the near plane; may perspective-widen with depth if you model a true frustum — for interaction math we treat the usable box as this prism unless calibrated otherwise)
- **Height (Y):** 5 units
- **Depth (Z):** 9 inches of travel from near (9″) to far (18″)

```
            camera
               *
              /|\
             / | \
            /  |  \     ← detection starts at 9″
           +---+---+      near face: 9 wide × 5 high
           |   |   |
           |   |   |      depth = 9″ of Z travel
           |   |   |
           +---+---+      far face (~18″): still usable to tip detect
```

## Why this matters for FingerPaint_WEBGL

- Hand / tip positions from MediaPipe are normalized 2D (`x,y` in 0..1). Mapping them into this prism gives a **consistent 3D space** for shader fields, SDF scenes, and depth-aware intensity.
- Suggested normalized coordinates inside the prism:
  - `u = x_norm` → map to `[-4.5, +4.5]` or `[0, 9]` in width units
  - `v = y_norm` → map to `[-2.5, +2.5]` or `[0, 5]` in height units
  - `w` from tip apparent size / calibration → map near→far to `[0, 1]` or inches `[9, 18]`
- Intensity / attack-decay bloom can be keyed off `(u,v,w)` so the field lives in the same volume the hand occupies.

## Notes / calibration caveats

- “Finger-circle units” are relative to fingertip apparent size at **9″**; absolute centimeters depend on the user’s finger and lens FOV.
- Different webcams change FOV; re-measure width×height at 9″ if the lens changes.
- Illumination matters: “illuminated finger” is part of the near-bound measurement.

## Source

User measurement, 2026-09-14, for FingerPaint_WEBGL research.
