import * as Tone from "tone";
import type { LofiKey } from "../types/index.js";

const INTERVAL_WEIGHTS = [0.10, 0.30, 0.20, 0.15, 0.15, 0.025, 0.025, 0.05];
const FIVE_TO_FIVE = [-5, -3, -1, 0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];

const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_TO_IDX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

function noteFromSemitone(rootNote: string, semitones: number): string {
  const pitchLen = rootNote[1] === "#" || rootNote[1] === "b" ? 2 : 1;
  const pitch = rootNote.slice(0, pitchLen);
  const octave = parseInt(rootNote.slice(pitchLen));
  const rootIdx = NOTE_TO_IDX[pitch] ?? 0;
  const total = rootIdx + semitones;
  const noteIdx = ((total % 12) + 12) % 12;
  return `${CHROMATIC[noteIdx]}${octave + Math.floor(total / 12)}`;
}

export class MelodyEngine {
  private sampler: Tone.Sampler | null = null;
  // Single continuous sequence — fires every 8th note, never rebuilt
  private seq: Tone.Sequence<string> | null = null;
  private scaleNotes: string[] = [];
  private scalePos = 0;
  private melodyDensity = 0.33;
  private melodyOff = false;

  setSampler(sampler: Tone.Sampler): void {
    this.sampler = sampler;
  }

  // Called once after sampler is ready — creates the sequence and leaves it running
  init(): void {
    this.seq = new Tone.Sequence(
      (time) => {
        if (!this.sampler || this.melodyOff || this.scaleNotes.length === 0) return;
        if (Math.random() >= this.melodyDensity) return;
        const note = this._nextNote();
        this.sampler.triggerAttackRelease(note, "2n", time, 0.30 + Math.random() * 0.15);
      },
      [""],
      "8n"
    );
    this.seq.humanize = true;
  }

  start(): void {
    this.seq?.start(0);
  }

  updateScale(key: LofiKey): void {
    this.scaleNotes = FIVE_TO_FIVE.map((offset) => noteFromSemitone(key + "5", offset));
    this.scalePos = Math.floor(Math.random() * this.scaleNotes.length);
  }

  randomize(): void {
    this.melodyDensity = 0.2 + Math.random() * 0.3;
    this.melodyOff = Math.random() < 0.25;
  }

  isMuted(): boolean {
    return this.melodyOff;
  }

  // Weighted random walk — ported from lofi-engine playMelody()
  private _nextNote(): string {
    const descendRange = Math.min(this.scalePos, 7) + 1;
    const ascendRange  = Math.min(this.scaleNotes.length - this.scalePos, 7);

    let descend = descendRange > 1;
    let ascend  = ascendRange  > 1;

    if (descend && ascend) {
      if (Math.random() > 0.5) ascend = false;
      else descend = false;
    }

    let weights = descend
      ? INTERVAL_WEIGHTS.slice(0, descendRange)
      : INTERVAL_WEIGHTS.slice(0, ascendRange);

    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map((w) => w / sum);
    for (let i = 1; i < weights.length; i++) weights[i] += weights[i - 1];

    const r = Math.random();
    let dist = 0;
    while (dist < weights.length - 1 && r > weights[dist]) dist++;

    this.scalePos = Math.max(
      0,
      Math.min(this.scaleNotes.length - 1, this.scalePos + (descend ? -dist : dist))
    );
    return this.scaleNotes[this.scalePos];
  }

  stop(): void {
    this.seq?.stop();
  }

  dispose(): void {
    this.seq?.dispose();
    this.seq = null;
  }
}
