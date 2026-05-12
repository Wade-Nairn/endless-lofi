import * as Tone from "tone";
import type { ChordEngine } from "./ChordEngine.js";
import type { MelodyEngine } from "./MelodyEngine.js";
import type { LofiKey } from "../types/index.js";

export const DEBUG_BAR_OVERRIDE: number | null = null;

export class AutoDJ {
  private transitioning = false;
  private readonly transitionInterval: number;

  constructor(
    private chordEngine: ChordEngine,
    private melodyEngine: MelodyEngine,
    private masterLPF: Tone.Filter
  ) {
    this.transitionInterval = DEBUG_BAR_OVERRIDE ?? this._pickInterval();
  }

  private _pickInterval(): number {
    const options = [16, 20, 24, 28, 32, 48];
    return options[Math.floor(Math.random() * options.length)];
  }

  onBarEnd(barCount: number, onKeyChange?: (key: LofiKey) => void): void {
    if (this.transitioning) return;
    if (barCount % this.transitionInterval !== 0) return;

    this.transitioning = true;

    // Muffle
    this.masterLPF.frequency.linearRampTo(300, 2);

    setTimeout(() => {
      const newKey = this.chordEngine.regenerate();
      this.melodyEngine.updateScale(newKey);
      this.melodyEngine.randomize();
      onKeyChange?.(newKey);

      // Open back up
      this.masterLPF.frequency.linearRampTo(1200, 2);

      setTimeout(() => {
        this.transitioning = false;
      }, 2000);
    }, 2000);
  }
}
