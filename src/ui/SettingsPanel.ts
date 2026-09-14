import {
  FieldSettings,
  FIELD_SETTINGS_RANGES,
  type FieldSettingsState,
} from '../field/FieldSettings';

type Key = keyof FieldSettingsState;

const KEYS: Key[] = [
  'attackSeconds',
  'decaySeconds',
  'intensity',
  'positionSmoothSeconds',
];

export class SettingsPanel {
  private root: HTMLDivElement;
  private panel: HTMLDivElement;
  private open = false;

  constructor(private settings: FieldSettings) {
    this.root = document.createElement('div');
    this.root.id = 'settings-root';

    const gear = document.createElement('button');
    gear.type = 'button';
    gear.id = 'settings-gear';
    gear.title = 'Field settings';
    gear.textContent = '⚙';
    gear.addEventListener('click', () => this.toggle());

    this.panel = document.createElement('div');
    this.panel.id = 'settings-panel';
    this.panel.hidden = true;

    const title = document.createElement('div');
    title.className = 'settings-title';
    title.textContent = 'Field feel';
    this.panel.appendChild(title);

    for (const key of KEYS) {
      this.panel.appendChild(this.row(key));
    }

    this.root.appendChild(gear);
    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);

    this.settings.onChange((s) => this.syncInputs(s));
    this.syncInputs(this.settings.get());
  }

  private row(key: Key): HTMLDivElement {
    const r = FIELD_SETTINGS_RANGES[key];
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.dataset.key = key;

    const label = document.createElement('label');
    label.textContent = r.label;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(r.min);
    slider.max = String(r.max);
    slider.step = String(r.step);
    slider.dataset.role = 'slider';

    const num = document.createElement('input');
    num.type = 'number';
    num.min = String(r.min);
    num.max = String(r.max);
    num.step = String(r.step);
    num.dataset.role = 'number';

    const apply = (raw: string) => {
      const v = parseFloat(raw);
      if (!Number.isFinite(v)) return;
      this.settings.set({ [key]: v });
    };
    slider.addEventListener('input', () => apply(slider.value));
    num.addEventListener('change', () => apply(num.value));

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(num);
    return row;
  }

  private syncInputs(s: FieldSettingsState): void {
    for (const key of KEYS) {
      const row = this.panel.querySelector(`[data-key="${key}"]`);
      if (!row) continue;
      const slider = row.querySelector('[data-role="slider"]') as HTMLInputElement;
      const num = row.querySelector('[data-role="number"]') as HTMLInputElement;
      const v = s[key];
      if (document.activeElement !== slider) slider.value = String(v);
      if (document.activeElement !== num) num.value = String(v);
    }
  }

  private toggle(): void {
    this.open = !this.open;
    this.panel.hidden = !this.open;
  }
}
