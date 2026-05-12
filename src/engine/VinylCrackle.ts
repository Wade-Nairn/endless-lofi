import * as Tone from "tone";
import { EffectsChain } from "./EffectsChain.js";

export class VinylCrackle {
  private noise: Tone.Noise;
  private lpf: Tone.Filter;
  private volume: Tone.Volume;

  constructor() {
    this.noise = new Tone.Noise("pink");
    this.lpf = new Tone.Filter(2000, "lowshelf");
    this.volume = new Tone.Volume(-32);
    const dest = EffectsChain.masterInput ?? Tone.getDestination();
    this.noise.chain(this.lpf, this.volume, dest);
  }

  start(): void { this.noise.start(); }
  stop(): void  { this.noise.stop(); }

  setLevel(db: number): void {
    this.volume.volume.rampTo(db, 0.1);
  }

  dispose(): void {
    this.noise.dispose();
    this.lpf.dispose();
    this.volume.dispose();
  }
}
