import {
  FAMILY_DEFS,
  type FamilyId,
  type FamilyDef,
} from './ModuleCatalog';

export type { FamilyId };
export { FAMILY_DEFS };

export interface FamilyState {
  enabled: boolean;
  /** 1-based variant index */
  variant: number;
}

export type ModulesState = Record<FamilyId, FamilyState>;

const LS_KEY = 'fpw.modules.v2';

export function defaultModulesState(): ModulesState {
  const out = {} as ModulesState;
  for (const f of FAMILY_DEFS) {
    out[f.id] = {
      enabled: f.defaultEnabled,
      variant: f.defaultVariant,
    };
  }
  return out;
}

function load(): ModulesState {
  const base = defaultModulesState();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      // migrate away from old boolean module keys quietly
      localStorage.removeItem('fpw.modules');
      return base;
    }
    const parsed = JSON.parse(raw) as Partial<Record<FamilyId, Partial<FamilyState>>>;
    for (const f of FAMILY_DEFS) {
      const p = parsed[f.id];
      if (!p) continue;
      if (typeof p.enabled === 'boolean') base[f.id].enabled = p.enabled;
      if (typeof p.variant === 'number' && p.variant >= 1) {
        const maxN = f.variants.length;
        base[f.id].variant = Math.min(maxN, Math.max(1, Math.floor(p.variant)));
      }
    }
    return base;
  } catch {
    return base;
  }
}

type Listener = (s: ModulesState) => void;

/**
 * Per-family selection: enable + which numbered IqEzles sample is active.
 * Compose DST[i] + WAV[j] + … in the shader.
 */
export class FieldModules {
  private state: ModulesState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = load();
  }

  get(): ModulesState {
    return structuredClone(this.state);
  }

  defs(): FamilyDef[] {
    return FAMILY_DEFS;
  }

  /** Shader modes: 0 = off, else variant number */
  modes(): Record<FamilyId, number> {
    const m = {} as Record<FamilyId, number>;
    for (const f of FAMILY_DEFS) {
      const s = this.state[f.id];
      m[f.id] = s.enabled ? s.variant : 0;
    }
    return m;
  }

  setEnabled(id: FamilyId, enabled: boolean): void {
    this.state[id] = { ...this.state[id], enabled };
    this.persist();
  }

  setVariant(id: FamilyId, variant: number): void {
    const f = FAMILY_DEFS.find((x) => x.id === id);
    if (!f) return;
    const v = Math.min(f.variants.length, Math.max(1, Math.floor(variant)));
    this.state[id] = { enabled: true, variant: v };
    this.persist();
  }

  toggleEnabled(id: FamilyId): void {
    this.setEnabled(id, !this.state[id].enabled);
  }

  resetToDefaults(): void {
    this.state = defaultModulesState();
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
