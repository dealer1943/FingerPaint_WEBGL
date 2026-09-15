import {
  FieldModules,
  PORTAL_DEFS,
  type PortalId,
  type PortalState,
  type ExploreLayer,
  type MazeTheme,
  type WaterTheme,
} from '../field/FieldModules';

const LS_OPEN = 'fpw.paletteOpen';

type ChangeFn = (state: PortalState) => void;

/**
 * Left rail: three portals. Expand for biome chips.
 * Explore layers multi-select (day XOR night). Maze/Water pick one.
 */
export class PalettePanel {
  private root: HTMLElement;
  private rail: HTMLElement;
  private open: boolean;
  private modules: FieldModules;
  private expanded: PortalId | null = 'explore';
  private listeners = new Set<ChangeFn>();

  constructor(modules?: FieldModules) {
    this.modules = modules ?? new FieldModules();
    this.open = localStorage.getItem(LS_OPEN) !== '0';

    this.root = document.createElement('aside');
    this.root.id = 'palette-root';
    this.root.classList.toggle('collapsed', !this.open);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'palette-toggle';
    toggle.title = 'Portals';
    toggle.innerHTML = '<span class="palette-chevron"></span>';
    toggle.addEventListener('click', () => this.setOpen(!this.open));

    this.rail = document.createElement('div');
    this.rail.id = 'palette-rail';

    const head = document.createElement('div');
    head.className = 'palette-head';
    head.innerHTML = '<span class="palette-mark"></span><span>PORTAL</span>';
    this.rail.appendChild(head);

    const list = document.createElement('div');
    list.className = 'palette-families';
    list.id = 'palette-families';
    this.rail.appendChild(list);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'palette-reset';
    reset.title = 'Reset portals';
    reset.textContent = '↺';
    reset.addEventListener('click', () => {
      this.expanded = 'explore';
      this.modules.resetToDefaults();
    });
    this.rail.appendChild(reset);

    this.root.appendChild(toggle);
    this.root.appendChild(this.rail);
    document.body.appendChild(this.root);

    this.modules.onChange((s) => {
      this.renderList(s);
      for (const fn of this.listeners) fn(s);
    });
  }

  getModules(): FieldModules {
    return this.modules;
  }

  onChange(fn: ChangeFn): () => void {
    this.listeners.add(fn);
    fn(this.modules.get());
    return () => this.listeners.delete(fn);
  }

  private setOpen(open: boolean): void {
    this.open = open;
    localStorage.setItem(LS_OPEN, open ? '1' : '0');
    this.root.classList.toggle('collapsed', !open);
  }

  private renderList(s: PortalState): void {
    const list = this.rail.querySelector('#palette-families') as HTMLElement;
    list.innerHTML = '';

    for (const def of PORTAL_DEFS) {
      const row = document.createElement('div');
      row.className = 'palette-row';
      if (this.expanded === def.id) row.classList.add('expanded');
      if (s.active === def.id) row.classList.add('active-portal');

      const fam = document.createElement('button');
      fam.type = 'button';
      fam.className = 'palette-mod';
      fam.classList.toggle('on', s.active === def.id);
      fam.title = `${def.title} — ${def.blurb}`;
      fam.innerHTML = `<span class="palette-mod-ring"></span><span class="palette-mod-id">${def.label}</span>`;
      fam.addEventListener('click', () => {
        this.modules.setActive(def.id);
        this.expanded = this.expanded === def.id ? this.expanded : def.id;
        this.renderList(this.modules.get());
      });
      row.appendChild(fam);

      if (this.expanded === def.id) {
        const samples = document.createElement('div');
        samples.className = 'palette-samples';
        for (const layer of def.layers) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'palette-sample';
          b.textContent = layer.label;
          b.title = `${layer.title}\n${layer.method}`;
          let on = false;
          if (def.id === 'explore') {
            on = !!s.explore[layer.id as ExploreLayer];
            b.addEventListener('click', () => {
              this.modules.toggleExplore(layer.id as ExploreLayer);
            });
          } else if (def.id === 'maze') {
            on = s.maze === layer.id;
            b.addEventListener('click', () => {
              this.modules.setMaze(layer.id as MazeTheme);
            });
          } else {
            on = s.water === layer.id;
            b.addEventListener('click', () => {
              this.modules.setWater(layer.id as WaterTheme);
            });
          }
          b.classList.toggle('on', on);
          samples.appendChild(b);
        }
        row.appendChild(samples);
      }

      list.appendChild(row);
    }
  }
}
