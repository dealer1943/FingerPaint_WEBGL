/**
 * Pottery wheel profile: radii along height. Tip molds when near the clay.
 */
export class ClayWheel {
  /** 8 samples from base→rim, world radius */
  radii: number[] = [0.35, 0.42, 0.48, 0.5, 0.48, 0.4, 0.32, 0.28];
  angle = 0;

  update(
    tip: { x: number; y: number; energy: number } | null,
    dt: number,
    mode: string,
  ): void {
    this.angle += dt * 2.2;
    if (!tip) return;
    // map tip y to profile index, tip x / energy to push radius
    const t = 1 - tip.y;
    const idx = Math.min(7, Math.max(0, Math.floor(t * 8)));
    const push = (tip.x - 0.5) * 2;
    let target = this.radii[idx];
    if (mode === 'open' || mode === 'front' || mode === 'top') {
      target += push * 0.35 * (0.4 + tip.energy);
    }
    if (mode === 'pull') {
      // raise upper rings
      for (let i = 4; i < 8; i++) {
        this.radii[i] = Math.min(0.85, this.radii[i] + tip.energy * 0.15 * dt);
      }
    }
    if (mode === 'smooth') {
      for (let i = 1; i < 7; i++) {
        this.radii[i] =
          this.radii[i] * 0.7 +
          0.15 * this.radii[i - 1] +
          0.15 * this.radii[i + 1];
      }
    } else {
      const blend = Math.min(1, dt * 4);
      this.radii[idx] = this.radii[idx] * (1 - blend) + target * blend;
      this.radii[idx] = Math.min(0.9, Math.max(0.08, this.radii[idx]));
      // neighbor soft
      if (idx > 0) {
        this.radii[idx - 1] =
          this.radii[idx - 1] * 0.85 + this.radii[idx] * 0.15;
      }
      if (idx < 7) {
        this.radii[idx + 1] =
          this.radii[idx + 1] * 0.85 + this.radii[idx] * 0.15;
      }
    }
  }

  reset(): void {
    this.radii = [0.35, 0.42, 0.48, 0.5, 0.48, 0.4, 0.32, 0.28];
  }
}
