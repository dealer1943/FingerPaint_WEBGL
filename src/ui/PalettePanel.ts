import {
  FieldModules,
  FIELD_MODULE_DEFS,
  type ModuleId,
  type ModulesState,
} from '../field/FieldModules';

const LS_OPEN = 'fpw.paletteOpen';

type ChangeFn = (state: ModulesState) => void;

/**
 * Left rail: programmable field modules (no color swatches).
 * Click = toggle. ⎌ = reset all to factory defaults (same look as original all-on field).
 */
export class PalettePanel {
  private root: HTMLElement;
  private rail: HTMLElement;
  private open: boolean;
  private modules: FieldModules;
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
    toggle.setAttribute('aria-label', 'Toggle modules');
    toggle.innerHTML = '<span class="palette-chevron"></span>';
    toggle.addEventListener('click', () => this.setOpen(!this.open));

    this.rail = document.createElement('div');
    this.rail.id = 'palette-rail';

    const head = document.createElement('div');
    head.className = 'palette-head';
    head.innerHTML = '<span class="palette-mark"></span><span>MOD</span>';
    this.rail.appendChild(head);

    const wells = document.createElement('div');
    wells.className = 'palette-wells';
    for (const d of FIELD_MODULE_DEFS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-mod';
      btn.dataset.id = d.id;
      btn.title = `${d.title} — ${d.blurb}\n(click toggle; defaults restore full look)`;
      btn.setAttribute('aria-label', d.title);
      btn.innerHTML = `<span class="palette-mod-ring"></span><span class="palette-mod-id">${d.label}</span>`;
      btn.addEventListener('click', () => {
        this.modules.toggle(d.id as ModuleId);
      });
      wells.appendChild(btn);
    }
    this.rail.appendChild(wells);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'palette-reset';
    reset.title = 'Reset all modules to factory defaults';
    reset.textContent = '↺';
    reset.addEventListener('click', () => this.modules.resetToDefaults());
    this.rail.appendChild(reset);

    this.root.appendChild(toggle);
    this.root.appendChild(this.rail);
    document.body.appendChild(this.root);

    this.modules.onChange((s) => {
      this.sync(s);
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

  private sync(s: ModulesState): void {
    this.rail.querySelectorAll('.palette-mod').forEach((el) => {
      const btn = el as HTMLButtonElement;
      const id = btn.dataset.id as ModuleId;
      btn.classList.toggle('on', !!s[id]?.enabled);
      btn.classList.toggle('off', !s[id]?.enabled);
    });
  }
}
