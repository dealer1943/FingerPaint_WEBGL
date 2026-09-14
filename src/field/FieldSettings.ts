export interface FieldSettingsState {
  /** Seconds for intensity to bloom toward target while tip is held. */
  attackSeconds: number;
  /** Seconds for intensity to fade after tip leaves. */
  decaySeconds: number;
  /** Overall field gain (0..1-ish). Quieter default. */
  intensity: number;
  /** Position follow time-constant while tip is live (seconds). */
  positionSmoothSeconds: number;
}

export const FIELD_SETTINGS_DEFAULTS: FieldSettingsState = {
  attackSeconds: 10,
  decaySeconds: 30,
  intensity: 0.4,
  positionSmoothSeconds: 0.55,
};

export const FIELD_SETTINGS_RANGES: Record<
  keyof FieldSettingsState,
  { min: number; max: number; step: number; label: string }
> = {
  attackSeconds: { min: 0.5, max: 60, step: 0.5, label: 'Attack (s)' },
  decaySeconds: { min: 1, max: 120, step: 0.5, label: 'Decay (s)' },
  intensity: { min: 0.05, max: 1.5, step: 0.05, label: 'Intensity' },
  positionSmoothSeconds: {
    min: 0.05,
    max: 2,
    step: 0.05,
    label: 'Position smooth (s)',
  },
};

const LS_KEY = 'fpw.settings';

type Listener = (s: FieldSettingsState) => void;

function clamp(key: keyof FieldSettingsState, v: number): number {
  const r = FIELD_SETTINGS_RANGES[key];
  if (!Number.isFinite(v)) return FIELD_SETTINGS_DEFAULTS[key];
  return Math.min(r.max, Math.max(r.min, v));
}

function load(): FieldSettingsState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...FIELD_SETTINGS_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<FieldSettingsState>;
    return {
      attackSeconds: clamp('attackSeconds', parsed.attackSeconds ?? FIELD_SETTINGS_DEFAULTS.attackSeconds),
      decaySeconds: clamp('decaySeconds', parsed.decaySeconds ?? FIELD_SETTINGS_DEFAULTS.decaySeconds),
      intensity: clamp('intensity', parsed.intensity ?? FIELD_SETTINGS_DEFAULTS.intensity),
      positionSmoothSeconds: clamp(
        'positionSmoothSeconds',
        parsed.positionSmoothSeconds ?? FIELD_SETTINGS_DEFAULTS.positionSmoothSeconds,
      ),
    };
  } catch {
    return { ...FIELD_SETTINGS_DEFAULTS };
  }
}

export class FieldSettings {
  private state: FieldSettingsState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = load();
  }

  get(): FieldSettingsState {
    return { ...this.state };
  }

  set(partial: Partial<FieldSettingsState>): void {
    const next: FieldSettingsState = { ...this.state };
    (Object.keys(partial) as (keyof FieldSettingsState)[]).forEach((k) => {
      const v = partial[k];
      if (typeof v === 'number') next[k] = clamp(k, v);
    });
    this.state = next;
    localStorage.setItem(LS_KEY, JSON.stringify(this.state));
    for (const fn of this.listeners) fn(this.get());
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
