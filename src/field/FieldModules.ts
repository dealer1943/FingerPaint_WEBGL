import {
  PORTAL_DEFS,
  type PortalId,
  type ExploreLayer,
  type MazeTheme,
  type WaterTheme,
} from './ModuleCatalog';

export type { PortalId, ExploreLayer, MazeTheme, WaterTheme };
export { PORTAL_DEFS };

export interface PortalState {
  active: PortalId;
  explore: Record<ExploreLayer, boolean>;
  maze: MazeTheme;
  water: WaterTheme;
}

const LS_KEY = 'fpw.portal.v1';

const EXPLORE_KEYS: ExploreLayer[] = [
  'jungle',
  'mountains',
  'valley',
  'river',
  'day',
  'night',
  'rain',
];

export function defaultPortalState(): PortalState {
  return {
    active: 'explore',
    explore: {
      jungle: true,
      mountains: true,
      valley: false,
      river: true,
      day: true,
      night: false,
      rain: false,
    },
    maze: 'maze',
    water: 'underwater',
  };
}

function load(): PortalState {
  const base = defaultPortalState();
  try {
    localStorage.removeItem('fpw.modules');
    localStorage.removeItem('fpw.modules.v2');
    localStorage.removeItem('fpw.modules.v3');
    localStorage.removeItem('fpw.roygbiv');
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<PortalState>;
    if (p.active === 'explore' || p.active === 'maze' || p.active === 'water') {
      base.active = p.active;
    }
    if (p.explore) {
      for (const k of EXPLORE_KEYS) {
        if (typeof p.explore[k] === 'boolean') base.explore[k] = p.explore[k];
      }
      // enforce day XOR night
      if (base.explore.day && base.explore.night) base.explore.night = false;
      if (!base.explore.day && !base.explore.night) base.explore.day = true;
    }
    if (typeof p.maze === 'string') base.maze = p.maze as MazeTheme;
    if (typeof p.water === 'string') base.water = p.water as WaterTheme;
    return base;
  } catch {
    return base;
  }
}

type Listener = (s: PortalState) => void;

/** Back-compat name used by main/PalettePanel */
export class FieldModules {
  private state: PortalState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = load();
  }

  get(): PortalState {
    return structuredClone(this.state);
  }

  /** Uniform pack for the shader */
  uniforms(): {
    portal: number;
    explore: number[];
    maze: number;
    water: number;
  } {
    const e = this.state.explore;
    const exploreBits = [
      e.jungle,
      e.mountains,
      e.valley,
      e.river,
      e.day,
      e.night,
      e.rain,
    ].map((b) => (b ? 1 : 0));
    const mazeIdx = Math.max(
      0,
      PORTAL_DEFS[1].layers.findIndex((l) => l.id === this.state.maze),
    );
    const waterIdx = Math.max(
      0,
      PORTAL_DEFS[2].layers.findIndex((l) => l.id === this.state.water),
    );
    const portal =
      this.state.active === 'explore' ? 1 : this.state.active === 'maze' ? 2 : 3;
    return { portal, explore: exploreBits, maze: mazeIdx + 1, water: waterIdx + 1 };
  }

  setActive(id: PortalId): void {
    this.state.active = id;
    this.persist();
  }

  toggleExplore(layer: ExploreLayer): void {
    const next = !this.state.explore[layer];
    if (layer === 'day' && next) this.state.explore.night = false;
    if (layer === 'night' && next) this.state.explore.day = false;
    this.state.explore[layer] = next;
    if (!this.state.explore.day && !this.state.explore.night) {
      this.state.explore.day = layer !== 'day';
    }
    this.state.active = 'explore';
    this.persist();
  }

  setMaze(theme: MazeTheme): void {
    this.state.maze = theme;
    this.state.active = 'maze';
    this.persist();
  }

  setWater(theme: WaterTheme): void {
    this.state.water = theme;
    this.state.active = 'water';
    this.persist();
  }

  resetToDefaults(): void {
    this.state = defaultPortalState();
    this.persist();
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.get());
    return () => this.listeners.delete(fn);
  }

  private persist(): void {
    localStorage.setItem(LS_KEY, JSON.stringify(this.state));
    const snap = this.get();
    for (const fn of this.listeners) fn(snap);
  }
}
