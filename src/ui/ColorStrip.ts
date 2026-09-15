import { ROYGBIV } from '../field/ModuleCatalog';

const LS = 'fpw.roygbiv';

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

type Fn = (rgb: [number, number, number], hex: string) => void;

/** Bottom ROYGBIV strip — independent of family modules. */
export class ColorStrip {
  private hex: string;
  private listeners = new Set<Fn>();

  constructor() {
    this.hex = localStorage.getItem(LS) || ROYGBIV[4].hex;
    const root = document.createElement('div');
    root.id = 'color-strip';
    const label = document.createElement('div');
    label.className = 'color-strip-label';
    label.textContent = 'ROYGBIV';
    root.appendChild(label);
    const row = document.createElement('div');
    row.className = 'color-strip-row';
    for (const c of ROYGBIV) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'color-chip';
      b.dataset.hex = c.hex;
      b.title = c.name;
      b.style.setProperty('--c', c.hex);
      b.textContent = c.id;
      b.addEventListener('click', () => this.set(c.hex));
      row.appendChild(b);
    }
    root.appendChild(row);
    document.body.appendChild(root);
    this.root = root;
    this.sync();
    this.emit();
  }

  private root: HTMLElement;

  onChange(fn: Fn): () => void {
    this.listeners.add(fn);
    fn(hexToRgb01(this.hex), this.hex);
    return () => this.listeners.delete(fn);
  }

  private set(hex: string): void {
    this.hex = hex;
    localStorage.setItem(LS, hex);
    this.sync();
    this.emit();
  }

  private sync(): void {
    this.root.querySelectorAll('.color-chip').forEach((el) => {
      const b = el as HTMLButtonElement;
      b.classList.toggle('on', b.dataset.hex === this.hex);
    });
  }

  private emit(): void {
    const rgb = hexToRgb01(this.hex);
    for (const fn of this.listeners) fn(rgb, this.hex);
  }
}
