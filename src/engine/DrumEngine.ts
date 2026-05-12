import * as Tone from "tone";
import { EffectsChain } from "./EffectsChain.js";

const CDN = "/drums/";

const KICK_PATTERNS = [
  ["C4", "", "", "", "", "", "", "C4", "C4", "", ".", "", "", "", "", ""],
  ["C4", "", "", "", "", "", "", "", "C4", "", "", "", "", "", "", ""],
  ["C4", "", "", "", "", "", "C4", "", "", "", "C4", "", "", "", "", ""],
  ["C4", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
] as const;

const HAT_PATTERNS = [
  ["C4", "C4", "C4", "C4", "C4", "C4", "C4", "C4"],
  ["C4", "", "C4", "", "C4", "", "C4", ""],
  ["C4", "C4", "C4", "", "C4", "C4", "C4", ""],
] as const;

export class DrumEngine {
  private kickSampler!: Tone.Sampler;
  private snareSampler!: Tone.Sampler;
  private hatSampler!: Tone.Sampler;
  private kickSeq!: Tone.Sequence<string>;
  private snareSeq!: Tone.Sequence<string>;
  private hatSeq!: Tone.Sequence<string>;
  private kickOff  = false;
  private snareOff = false;
  private hatOff   = false;

  load(): Promise<void> {
    const dest = EffectsChain.masterInput ?? Tone.getDestination();

    const kickVol   = new Tone.Volume(-5);
    const snareLPF  = new Tone.Filter(6000, "lowpass");
    const snareVol  = new Tone.Volume(-12);
    const snareWide = new Tone.StereoWidener(0.3);
    const hatLPF    = new Tone.Filter(2400, "lowpass");
    const hatVol    = new Tone.Volume(-11);
    const hatWide   = new Tone.StereoWidener(0.7);

    kickVol.connect(dest);
    snareLPF.chain(snareVol, snareWide, dest);
    hatLPF.chain(hatVol, hatWide, dest);

    const loadSampler = (url: string, chain: Tone.ToneAudioNode) =>
      new Promise<Tone.Sampler>((resolve) => {
        const s = new Tone.Sampler({ C4: url }, () => { s.connect(chain); resolve(s); });
      });

    return Promise.all([
      loadSampler(CDN + "kick.mp3",  kickVol),
      loadSampler(CDN + "snare.mp3", snareLPF),
      loadSampler(CDN + "hat.mp3", hatLPF),
    ]).then(([kick, snare, hat]) => {
      this.kickSampler  = kick;
      this.snareSampler = snare;
      this.hatSampler   = hat;
      this._buildSequences();
    });
  }

  // Built once and kept alive — patterns are updated in place, never rebuilt
  private _buildSequences(): void {
    this.kickSeq = new Tone.Sequence(
      (time, note) => {
        if (this.kickOff) return;
        if (note === "C4" && Math.random() < 0.9)
          this.kickSampler.triggerAttack("C4", time + (Math.random() * 0.008 - 0.004));
        else if (note === "." && Math.random() < 0.1)
          this.kickSampler.triggerAttack("C4", time + (Math.random() * 0.008 - 0.004));
      },
      [...KICK_PATTERNS[0]],
      "8n"
    );

    this.snareSeq = new Tone.Sequence(
      (time, note) => {
        if (this.snareOff || note === "") return;
        if (Math.random() < 0.8)
          this.snareSampler.triggerAttack("C4", time + (Math.random() * 0.008 - 0.004));
      },
      ["", "C4"],
      "2n"
    );

    this.hatSeq = new Tone.Sequence(
      (time, note) => {
        if (this.hatOff || note === "") return;
        if (Math.random() < 0.8)
          this.hatSampler.triggerAttack("C4", time + (Math.random() * 0.008 - 0.004));
      },
      [...HAT_PATTERNS[0]],
      "4n"
    );

    this.kickSeq.humanize  = true;
    this.snareSeq.humanize = true;
    this.hatSeq.humanize   = true;
  }

  start(): void {
    this.kickSeq?.start(0);
    this.snareSeq?.start(0);
    this.hatSeq?.start(0);
  }

  stop(): void {
    this.kickSeq?.stop();
    this.snareSeq?.stop();
    this.hatSeq?.stop();
  }

  // Called at phrase boundaries — updates pattern events in place, no rebuild
  randomizePhrase(): void {
    this.kickOff  = Math.random() < 0.08;
    this.snareOff = Math.random() < 0.12;
    this.hatOff   = Math.random() < 0.15;

    this.kickSeq.events = [...KICK_PATTERNS[Math.floor(Math.random() * KICK_PATTERNS.length)]];
    this.hatSeq.events  = [...HAT_PATTERNS[Math.floor(Math.random() * HAT_PATTERNS.length)]];
  }

  // Called every bar — small chance to flip a mute mid-phrase
  randomizeMutes(): void {
    if (Math.random() < 0.12) this.kickOff  = !this.kickOff;
    if (Math.random() < 0.08) this.snareOff = !this.snareOff;
    if (Math.random() < 0.10) this.hatOff   = !this.hatOff;
  }

  getMutes(): { kick: boolean; snare: boolean; hat: boolean } {
    return { kick: this.kickOff, snare: this.snareOff, hat: this.hatOff };
  }

  dispose(): void {
    this.kickSeq?.dispose();
    this.snareSeq?.dispose();
    this.hatSeq?.dispose();
    this.kickSampler?.dispose();
    this.snareSampler?.dispose();
    this.hatSampler?.dispose();
  }
}
