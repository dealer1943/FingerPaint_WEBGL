import type { FieldSettingsState } from './FieldSettings';
import type { TrackedTip } from '../tracking/HandTracker';

export interface SmoothTip {
  key: string;
  x: number;
  y: number;
  /** Smoothed bloom intensity 0..1 before gain. */
  energy: number;
}

interface Slot {
  key: string;
  x: number;
  y: number;
  energy: number;
  /** EMA of live tip energy — attack target. */
  targetEnergy: number;
  live: boolean;
}

const DROP = 0.008;

/**
 * Slow bloom / long fade tip field. Live tips attack toward energy;
 * missing tips decay. Position is heavily smoothed to kill jitter.
 */
export class TipSmoother {
  private slots = new Map<string, Slot>();

  update(tips: TrackedTip[], dt: number, settings: FieldSettingsState, maxOut = 2): SmoothTip[] {
    const dtClamped = Math.min(0.1, Math.max(0, dt));
    const attack = Math.max(0.05, settings.attackSeconds);
    const decay = Math.max(0.05, settings.decaySeconds);
    const posTau = Math.max(0.05, settings.positionSmoothSeconds);
    // Short EMA on live energy so MediaPipe noise doesn't ripple.
    const energyTau = 0.25;

    const seen = new Set<string>();
    for (const tip of tips) {
      seen.add(tip.key);
      let slot = this.slots.get(tip.key);
      if (!slot) {
        slot = {
          key: tip.key,
          x: tip.x,
          y: tip.y,
          energy: 0,
          targetEnergy: tip.energy,
          live: true,
        };
        this.slots.set(tip.key, slot);
      }
      slot.live = true;
      const eAlpha = 1 - Math.exp(-dtClamped / energyTau);
      slot.targetEnergy += (tip.energy - slot.targetEnergy) * eAlpha;
      const pAlpha = 1 - Math.exp(-dtClamped / posTau);
      slot.x += (tip.x - slot.x) * pAlpha;
      slot.y += (tip.y - slot.y) * pAlpha;
      const aAlpha = 1 - Math.exp(-dtClamped / attack);
      slot.energy += (slot.targetEnergy - slot.energy) * aAlpha;
    }

    for (const slot of this.slots.values()) {
      if (seen.has(slot.key)) continue;
      slot.live = false;
      slot.targetEnergy = 0;
      const dAlpha = 1 - Math.exp(-dtClamped / decay);
      slot.energy += (0 - slot.energy) * dAlpha;
    }

    for (const [key, slot] of [...this.slots.entries()]) {
      if (!slot.live && slot.energy < DROP) this.slots.delete(key);
    }

    const out: SmoothTip[] = [];
    for (const slot of this.slots.values()) {
      if (slot.energy < DROP) continue;
      out.push({
        key: slot.key,
        x: slot.x,
        y: slot.y,
        energy: Math.min(1, Math.max(0, slot.energy)),
      });
    }
    out.sort((a, b) => b.energy - a.energy);
    const cap = Math.max(1, Math.min(10, Math.floor(maxOut) || 2));
    return out.slice(0, cap);
  }
}
