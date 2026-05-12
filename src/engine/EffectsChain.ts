import * as Tone from "tone";

export class EffectsChain {
  // Set by AudioEngine after creating the master bus
  static masterInput: Tone.ToneAudioNode | null = null;

  readonly input: Tone.Gain;
  private compressor: Tone.Compressor;
  private lpf: Tone.Filter;
  private widener: Tone.StereoWidener;

  constructor(lpfFreq = 2000, widenerWidth = 0.6) {
    this.input = new Tone.Gain(1);
    this.compressor = new Tone.Compressor({ threshold: -6, ratio: 3, attack: 0.003, release: 0.1, knee: 10 });
    this.lpf = new Tone.Filter({ frequency: lpfFreq, type: "lowpass", rolloff: -24 });
    this.widener = new Tone.StereoWidener(widenerWidth);
    this.input.chain(this.compressor, this.lpf, this.widener);
  }

  connect(destination: Tone.ToneAudioNode): this {
    this.widener.connect(destination);
    return this;
  }

  connectToMaster(): this {
    return this.connect(EffectsChain.masterInput ?? Tone.getDestination());
  }

  setLPF(freq: number, rampTime: Tone.Unit.Time): void {
    this.lpf.frequency.rampTo(freq, rampTime);
  }

  dispose(): void {
    this.input.dispose();
    this.compressor.dispose();
    this.lpf.dispose();
    this.widener.dispose();
  }
}
