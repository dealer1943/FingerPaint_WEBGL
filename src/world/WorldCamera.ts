/**
 * Tip-driven portal camera.
 * Explore: free look + move on all axes.
 * Maze/Water: X strafe, Y forward/back, soft collision.
 */

export type CamMode = 'explore' | 'maze' | 'water';

export interface CamPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export class WorldCamera {
  pose: CamPose = { x: 0, y: 1.2, z: 4.5, yaw: 0, pitch: -0.12 };
  private mode: CamMode = 'explore';

  setMode(mode: CamMode): void {
    if (mode !== this.mode) {
      this.mode = mode;
      if (mode === 'explore') {
        this.pose = { x: 0, y: 1.4, z: 5.5, yaw: 0, pitch: -0.08 };
      } else if (mode === 'maze') {
        this.pose = { x: 0.5, y: 0.9, z: 0.5, yaw: 0, pitch: 0 };
      } else {
        this.pose = { x: 0, y: -0.4, z: 2.0, yaw: 0, pitch: -0.05 };
      }
    }
  }

  update(
    tip: { x: number; y: number; energy: number } | null,
    dt: number,
    collide: (x: number, y: number, z: number) => boolean,
  ): void {
    const p = this.pose;
    const dx = tip ? (tip.x - 0.5) * 2 : 0;
    const dy = tip ? (tip.y - 0.5) * 2 : 0;
    const boost = tip ? 0.55 + tip.energy * 1.2 : 0.35;

    if (this.mode === 'explore') {
      p.yaw += dx * 1.1 * dt * boost;
      p.pitch = clamp(p.pitch - dy * 0.7 * dt * boost, -1.2, 1.2);
      const moveZ = -Math.sin(p.yaw) * dx * 0.15 + Math.cos(p.yaw) * (-dy) * 2.2;
      const moveX = Math.cos(p.yaw) * dx * 2.2 + Math.sin(p.yaw) * (-dy) * 0.15;
      const moveY =
        (tip ? (0.5 - tip.y) * 0.4 : 0) + (tip ? (tip.energy - 0.35) * 0.8 : 0);
      this.tryMove(moveX * dt * boost, moveY * dt, moveZ * dt * boost, collide);
    } else {
      const forward = -dy * 2.8 * boost;
      const strafe = dx * 2.8 * boost;
      const fx = Math.sin(p.yaw);
      const fz = Math.cos(p.yaw);
      p.yaw += dx * 0.35 * dt;
      this.tryMove(
        (fx * forward + Math.cos(p.yaw) * strafe) * dt,
        0,
        (fz * forward - Math.sin(p.yaw) * strafe) * dt,
        collide,
      );
      if (this.mode === 'maze') p.y = 0.9;
      if (this.mode === 'water') {
        p.y = clamp(p.y + -dy * 0.15 * dt, -2.5, -0.15);
      }
    }
  }

  private tryMove(
    mx: number,
    my: number,
    mz: number,
    collide: (x: number, y: number, z: number) => boolean,
  ): void {
    const p = this.pose;
    const nx = p.x + mx;
    const ny = p.y + my;
    const nz = p.z + mz;
    if (collide(nx, ny, nz)) {
      p.x = nx;
      p.y = ny;
      p.z = nz;
      return;
    }
    if (collide(nx, p.y, p.z)) p.x = nx;
    if (collide(p.x, ny, p.z)) p.y = ny;
    if (collide(p.x, p.y, nz)) p.z = nz;
  }
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
