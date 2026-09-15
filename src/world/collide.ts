/** Cheap CPU collision matching domain-repeated maze walls (cell size 1). */
export function mazeFree(x: number, _y: number, z: number): boolean {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  // walls on even corridors pattern
  const wx = ((cx % 2) + 2) % 2 === 0;
  const wz = ((cz % 2) + 2) % 2 === 0;
  if (wx && wz) return false;
  // keep center cell open
  if (Math.abs(x) < 0.35 && Math.abs(z) < 0.35) return true;
  if (wx || wz) {
    const lx = x - cx - 0.5;
    const lz = z - cz - 0.5;
    if (wx && Math.abs(lx) < 0.22) return false;
    if (wz && Math.abs(lz) < 0.22) return false;
  }
  return true;
}

export function waterFree(x: number, y: number, z: number): boolean {
  // stay underwater volume; avoid coral blobs near origin lattice
  if (y > -0.05 || y < -3.0) return false;
  const gx = Math.floor(x * 0.7);
  const gz = Math.floor(z * 0.7);
  const hx = hash(gx, gz);
  if (hx > 0.72) {
    const cx = gx / 0.7 + 0.5 / 0.7;
    const cz = gz / 0.7 + 0.5 / 0.7;
    const d = Math.hypot(x - cx, z - cz);
    if (d < 0.35 && y > -1.8) return false;
  }
  return true;
}

export function exploreFree(x: number, y: number, z: number): boolean {
  // stay above terrain bowl approx
  const h = 0.35 * Math.sin(x * 0.25) * Math.cos(z * 0.25);
  return y > h + 0.55 && y < 8;
}

function hash(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
