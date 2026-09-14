const LS_OPEN = 'fpw.paletteOpen';
const LS_COLOR = 'fpw.paletteColor';

export const PALETTE_COLORS: { id: string; hex: string; label: string }[] = [
  { id: 'R', hex: '#ff3b3b', label: 'Red' },
  { id: 'O', hex: '#ff8a1f', label: 'Orange' },
  { id: 'Y', hex: '#ffd84a', label: 'Yellow' },
  { id: 'G', hex: '#3dff8a', label: 'Green' },
  { id: 'B', hex: '#3db8ff', label: 'Blue' },
  { id: 'I', hex: '#6a5cff', label: 'Indigo' },
  { id: 'V', hex: '#c84dff', label: 'Violet' },
  { id: 'W', hex: '#f4f6ff', label: 'White' },
  { id: 'K', hex: '#1a1c22', label: 'Black' },
];

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

type TintListener = (rgb: [number, number, number], hex: string) => void;

/**
 * Left-docked minimizable palette — minimalist / futuristic HUD.
 */
export class PalettePanel {
  private root: HTMLElement;
  private rail: HTMLElement;
  private open: boolean;
  private colorHex: string;
  private listeners = new Set<TintListener>();

  constructor() {
    this.open = localStorage.getItem(LS_OPEN) !== '0';
    this.colorHex = localStorage.getItem(LS_COLOR) || PALETTE_COLORS[4].hex;

    this.root = document.createElement('aside');
    this.root.id = 'palette-root';
    this.root.classList.toggle('collapsed', !this.open);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'palette-toggle';
    toggle.title = 'Palette';
    toggle.setAttribute('aria-label', 'Toggle palette');
    toggle.innerHTML = '<span class="palette-chevron"></span>';
    toggle.addEventListener('click', () => this.setOpen(!this.open));

    this.rail = document.createElement('div');
    this.rail.id = 'palette-rail';

    const head = document.createElement('div');
    head.className = 'palette-head';
    head.innerHTML = '<span class="palette-mark"></span><span>PALETTE</span>';
    this.rail.appendChild(head);

    const wells = document.createElement('div');
    wells.className = 'palette-wells';
    for (const c of PALETTE_COLORS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-well';
      btn.dataset.hex = c.hex;
      btn.title = c.label;
      btn.setAttribute('aria-label', c.label);
      btn.style.setProperty('--well', c.hex);
      btn.innerHTML = `<span class="palette-well-core"></span><span class="palette-well-id">${c.id}</span>`;
      btn.addEventListener('click', () => this.setColor(c.hex));
      wells.appendChild(btn);
    }
    this.rail.appendChild(wells);

    const swatch = document.createElement('div');
    swatch.className = 'palette-active';
    swatch.id = 'palette-active-swatch';
    this.rail.appendChild(swatch);

    this.root.appendChild(toggle);
    this.root.appendChild(this.rail);
    document.body.appendChild(this.root);

    this.syncWells();
    this.emit();
  }

  getTint(): [number, number, number] {
    return hexToRgb01(this.colorHex);
  }

  getHex(): string {
    return this.colorHex;
  }

  onChange(fn: TintListener): () => void {
    this.listeners.add(fn);
    fn(this.getTint(), this.colorHex);
    return () => this.listeners.delete(fn);
  }

  private setOpen(open: boolean): void {
    this.open = open;
    localStorage.setItem(LS_OPEN, open ? '1' : '0');
    this.root.classList.toggle('collapsed', !open);
  }

  private setColor(hex: string): void {
    this.colorHex = hex;
    localStorage.setItem(LS_COLOR, hex);
    this.syncWells();
    this.emit();
  }

  private syncWells(): void {
    const wells = this.rail.querySelectorAll('.palette-well');
    wells.forEach((el) => {
      const btn = el as HTMLButtonElement;
      btn.classList.toggle('on', btn.dataset.hex === this.colorHex);
    });
    const sw = this.rail.querySelector('#palette-active-swatch') as HTMLElement | null;
    if (sw) sw.style.setProperty('--active', this.colorHex);
  }

  private emit(): void {
    const rgb = this.getTint();
    for (const fn of this.listeners) fn(rgb, this.colorHex);
  }
}
