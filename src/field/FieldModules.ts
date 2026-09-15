/**
 * Programmable field modules. All-on + default sources == current FingerPaint_WEBGL look
 * (pre color-well tint). Each slot can later hold custom GLSL; Reset restores factory.
 */

export type ModuleId =
  | 'pot'
  | 'rip'
  | 'warp'
  | 'flow'
  | 'grade'
  | 'core'
  | 'vig'
  | 'idle';

export interface FieldModuleDef {
  id: ModuleId;
  /** Short rail label */
  label: string;
  title: string;
  /** Human/LLM description of what this slice owns */
  blurb: string;
  /** Default “program” for this slot (reference GLSL; toggles use built-in path today) */
  defaultSource: string;
  defaultEnabled: true;
}

export const FIELD_MODULE_DEFS: FieldModuleDef[] = [
  {
    id: 'pot',
    label: 'POT',
    title: 'Potential',
    blurb: '1/r² tip potential — the mass of the field.',
    defaultEnabled: true,
    defaultSource: `// pot: tip potential
float pot = (0.018 + 0.022 * e) / (r * r + 0.018);
field += active * pot;`,
  },
  {
    id: 'rip',
    label: 'RIP',
    title: 'Ripples',
    blurb: 'Decaying sine rings around each tip.',
    defaultEnabled: true,
    defaultSource: `// rip: tip ripples
float rip = sin(14.0 * r - uTime * 1.6 - e * 4.0) * exp(-5.5 * r);
field += active * 0.12 * rip * (0.35 + e);`,
  },
  {
    id: 'warp',
    label: 'WRP',
    title: 'Domain warp',
    blurb: 'Bend UV before the secondary sample.',
    defaultEnabled: true,
    defaultSource: `// warp: domain warp
q.x += 0.025 * sin(7.0 * p.y + uTime * 0.7 + field * 1.4);
q.y += 0.025 * cos(7.0 * p.x - uTime * 0.5);`,
  },
  {
    id: 'flow',
    label: 'FLW',
    title: 'Flow field',
    blurb: 'Secondary potential sampled in warped space.',
    defaultEnabled: true,
    defaultSource: `// flow: warped tip falloff
warped += active * ((0.012 + 0.018 * e) / (r + 0.05));`,
  },
  {
    id: 'grade',
    label: 'GRD',
    title: 'Grade',
    blurb: 'Cosine palette map from scalar field → RGB (no swatches).',
    defaultEnabled: true,
    defaultSource: `// grade: cosine palette
vec3 a = vec3(0.20, 0.18, 0.28);
vec3 b = vec3(0.55, 0.35, 0.70);
vec3 c = vec3(0.90, 0.55, 0.25);
vec3 d = vec3(0.15, 0.65, 0.85);
col = a + b * cos(6.28318 * (c * t + d));`,
  },
  {
    id: 'core',
    label: 'COR',
    title: 'Core',
    blurb: 'Hot spot at nearest tip.',
    defaultEnabled: true,
    defaultSource: `// core
col += vec3(1.0, 0.85, 0.55) * exp(-55.0 * nearest) * 0.45;`,
  },
  {
    id: 'vig',
    label: 'VIG',
    title: 'Vignette',
    blurb: 'Edge darkening.',
    defaultEnabled: true,
    defaultSource: `// vig
col *= 0.35 + 0.65 * smoothstep(1.2, 0.25, length(uv - 0.5));`,
  },
  {
    id: 'idle',
    label: 'IDL',
    title: 'Idle',
    blurb: 'Quiet backdrop when tip energy is near zero.',
    defaultEnabled: true,
    defaultSource: `// idle
col = mix(col, idleCol, idleAmount);`,
  },
];

export type ModuleState = {
  enabled: boolean;
  source: string;
};

export type ModulesState = Record<ModuleId, ModuleState>;

const LS_KEY = 'fpw.modules';

export function defaultModulesState(): ModulesState {
  const out = {} as ModulesState;
  for (const d of FIELD_MODULE_DEFS) {
    out[d.id] = { enabled: true, source: d.defaultSource };
  }
  return out;
}

function load(): ModulesState {
  const base = defaultModulesState();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<ModuleId, Partial<ModuleState>>>;
    for (const d of FIELD_MODULE_DEFS) {
      const p = parsed[d.id];
      if (!p) continue;
      if (typeof p.enabled === 'boolean') base[d.id].enabled = p.enabled;
      if (typeof p.source === 'string' && p.source.length) base[d.id].source = p.source;
    }
    return base;
  } catch {
    return base;
  }
}

type Listener = (s: ModulesState) => void;

export class FieldModules {
  private state: ModulesState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = load();
  }

  get(): ModulesState {
    return structuredClone(this.state);
  }

  /** Enable flags in def order — for shader uniforms. */
  enables(): Record<ModuleId, boolean> {
    const e = {} as Record<ModuleId, boolean>;
    for (const d of FIELD_MODULE_DEFS) e[d.id] = this.state[d.id].enabled;
    return e;
  }

  setEnabled(id: ModuleId, enabled: boolean): void {
    this.state[id] = { ...this.state[id], enabled };
    this.persist();
  }

  toggle(id: ModuleId): void {
    this.setEnabled(id, !this.state[id].enabled);
  }

  setSource(id: ModuleId, source: string): void {
    this.state[id] = { ...this.state[id], source };
    this.persist();
  }

  /** Factory defaults: all on, original sources. */
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
