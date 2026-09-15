import {
  FieldModules,
  FAMILY_DEFS,
  type FamilyId,
  type ModulesState,
} from '../field/FieldModules';
import { familyById } from '../field/ModuleCatalog';

const LS_OPEN = 'fpw.paletteOpen';

type ChangeFn = (state: ModulesState) => void;

/**
 * Left rail: function families. Click a family to slide out numbered
 * IqEzles samples: [A][B][1][2][3][C]. Pick B2 + C5 to compose.
 */
export class PalettePanel {
  private root: HTMLElement;
  private rail: HTMLElement;
  private open: boolean;
  private modules: FieldModules;
  private expanded: FamilyId | null = null;
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
    toggle.title = 'Modules';
    toggle.innerHTML = '<span class="palette-chevron"></span>';
    toggle.addEventListener('click', () => this.setOpen(!this.open));

    this.rail = document.createElement('div');
    this.rail.id = 'palette-rail';

    const head = document.createElement('div');
    head.className = 'palette-head';
    head.innerHTML = '<span class="palette-mark"></span><span>MOD</span>';
    this.rail.appendChild(head);

    const list = document.createElement('div');
    list.className = 'palette-families';
    list.id = 'palette-families';
    this.rail.appendChild(list);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'palette-reset';
    reset.title = 'Reset families to factory samples (all on, variant 1)';
    reset.textContent = '↺';
    reset.addEventListener('click', () => {
      this.expanded = null;
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

  private renderList(s: ModulesState): void {
    const list = this.rail.querySelector('#palette-families') as HTMLElement;
    list.innerHTML = '';

    for (const def of FAMILY_DEFS) {
      const row = document.createElement('div');
      row.className = 'palette-row';
      row.dataset.family = def.id;
      if (this.expanded === def.id) row.classList.add('expanded');
      if (!s[def.id].enabled) row.classList.add('disabled');

      const fam = document.createElement('button');
      fam.type = 'button';
      fam.className = 'palette-mod';
      fam.classList.toggle('on', s[def.id].enabled);
      fam.classList.toggle('off', !s[def.id].enabled);
      fam.title = `${def.title} — ${def.blurb}\nClick: expand samples · Alt-click: enable/disable`;
      fam.innerHTML = `<span class="palette-mod-ring"></span><span class="palette-mod-id">${def.label}</span>`;
      fam.addEventListener('click', (ev) => {
        if (ev.altKey) {
          this.modules.toggleEnabled(def.id);
          return;
        }
        this.expanded = this.expanded === def.id ? null : def.id;
        this.renderList(this.modules.get());
      });
      row.appendChild(fam);

      if (this.expanded === def.id) {
        const samples = document.createElement('div');
        samples.className = 'palette-samples';
        for (const v of def.variants) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'palette-sample';
          b.textContent = String(v.n);
          b.title = `${def.label}[${v.n}] ${v.name}\n${v.method}\n\n${v.source}`;
          const active =
            s[def.id].enabled && s[def.id].variant === v.n;
          b.classList.toggle('on', active);
          b.addEventListener('click', () => {
            this.modules.setVariant(def.id, v.n);
          });
          samples.appendChild(b);
        }
        row.appendChild(samples);
      } else if (s[def.id].enabled) {
        const chip = document.createElement('span');
        chip.className = 'palette-variant-chip';
        chip.textContent = String(s[def.id].variant);
        chip.title = familyById(def.id).variants.find(
          (v) => v.n === s[def.id].variant,
        )?.name ?? '';
        row.appendChild(chip);
      }

      list.appendChild(row);
    }
  }
}
