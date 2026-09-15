import {
  PORTAL_DEFS,
  type PortalId,
  type ExploreLayer,
  type MazeTheme,
  type WaterTheme,
  type PourTheme,
  type ClayMode,
} from './ModuleCatalog';

export type { PortalId, ExploreLayer, MazeTheme, WaterTheme, PourTheme, ClayMode };
export { PORTAL_DEFS };

export interface PortalState {
  active: PortalId;
  explore: Record<ExploreLayer, boolean>;
  maze: MazeTheme;
  water: WaterTheme;
  pour: PourTheme;
  clay: ClayMode;
}

const LS_KEY = 'fpw.portal.v2';

const EXPLORE_KEYS: ExploreLayer[] = [
  'jungle', 'mountains', 'valley', 'river', 'day', 'night', 'rain',
];

const PORTALS: PortalId[] = ['explore', 'maze', 'water', 'pour', 'clay'];

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
    pour: 'drip',
    clay: 'front',
  };
}

function load(): PortalState {
  const base = defaultPortalState();
  try {
    localStorage.removeItem('fpw.portal.v1');
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<PortalState>;
    if (p.active && PORTALS.includes(p.active)) base.active = p.active;
    if (p.explore) {
      for (const k of EXPLORE_KEYS) {
        if (typeof p.explore[k] === 'boolean') base.explore[k] = p.explore[k];
      }
      if (base.explore.day && base.explore.night) base.explore.night = false;
      if (!base.explore.day && !base.explore.night) base.explore.day = true;
    }
    if (typeof p.maze === 'string') base.maze = p.maze as MazeTheme;
    if (typeof p.water === 'string') base.water = p.water as WaterTheme;
    if (typeof p.pour === 'string') base.pour = p.pour as PourTheme;
    if (typeof p.clay === 'string') base.clay = p.clay as ClayMode;
    return base;
  } catch {
    return base;
  }
}

type Listener = (s: PortalState) => void;

export class FieldModules {
  private state: PortalState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = load();
  }

  get(): PortalState {
    return structuredClone(this.state);
  }

  uniforms(): {
    portal: number;
    explore: number[];
    maze: number;
    water: number;
    pour: number;
    clay: number;
  } {
    const e = this.state.explore;
    const exploreBits = [
      e.jungle, e.mountains, e.valley, e.river, e.day, e.night, e.rain,
    ].map((b) => (b ? 1 : 0));
    const idx = (portalIndex: number, id: string) =>
      Math.max(0, PORTAL_DEFS[portalIndex].layers.findIndex((l) => l.id === id));
    const portalMap: Record<PortalId, number> = {
      explore: 1,
      maze: 2,
      water: 3,
      pour: 4,
      clay: 5,
    };
    return {
      portal: portalMap[this.state.active],
      explore: exploreBits,
      maze: idx(1, this.state.maze) + 1,
      water: idx(2, this.state.water) + 1,
      pour: idx(3, this.state.pour) + 1,
      clay: idx(4, this.state.clay) + 1,
    };
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

  setPour(theme: PourTheme): void {
    this.state.pour = theme;
    this.state.active = 'pour';
    this.persist();
  }

  setClay(mode: ClayMode): void {
    this.state.clay = mode;
    this.state.active = 'clay';
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
