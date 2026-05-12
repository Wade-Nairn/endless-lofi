import * as Tone from "tone";
import type { ChordEvent } from "../types/index.js";
import { EffectsChain } from "./EffectsChain.js";

// Includes all enharmonic equivalents — ChordEngine outputs sharps so both must be covered
const NOTE_TO_IDX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};
const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function transposeNote(note: string, semitones: number): string {
  const pitchLen = note[1] === "#" || note[1] === "b" ? 2 : 1;
  const pitch = note.slice(0, pitchLen);
  const octave = parseInt(note.slice(pitchLen));
  const idx = NOTE_TO_IDX[pitch] ?? 0;
  const total = idx + semitones;
  const newIdx = ((total % 12) + 12) % 12;
  return `${CHROMATIC[newIdx]}${octave + Math.floor(total / 12)}`;
}

export class BassEngine {
  private synth: Tone.MonoSynth;
  private effects: EffectsChain;
  private currentPart: Tone.Part | null = null;

  constructor() {
    this.synth = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      filter: { frequency: 300, type: "lowpass" },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 1.2 },
      filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 1, baseFrequency: 120, octaves: 1.5 },
      volume: -22,
    });
    this.effects = new EffectsChain(400, 0.1);
    this.synth.connect(this.effects.input);
    this.effects.connectToMaster();
  }

  scheduleWalkingBass(chord: ChordEvent, nextChord: ChordEvent, startTime: Tone.Unit.Time): void {
    if (this.currentPart) {
      this.currentPart.dispose();
      this.currentPart = null;
    }

    const root = chord.notes[0];
    const rootPitch = root.slice(0, -1);
    const rootOct = parseInt(root.slice(-1)) - 1; // play one octave down
    const bassRoot = `${rootPitch}${rootOct}`;
    const fifth = transposeNote(bassRoot, 7);
    const octave = transposeNote(bassRoot, 12);
    const nextRoot = nextChord.notes[0];
    const nextPitch = nextRoot.slice(0, -1);
    const nextOctave = parseInt(nextRoot.slice(-1)) - 1;
    const leadingTone = transposeNote(`${nextPitch}${nextOctave}`, -1);

    // Root always plays; other beats are probabilistic for a laid-back feel
    const beats: [string, string, number][] = [
      ["0:0:0", bassRoot,    1.00],  // downbeat always
      ["0:1:0", fifth,       0.55],
      ["0:2:0", octave,      0.45],
      ["0:3:0", leadingTone, 0.60],
    ];

    const events = beats
      .filter(([, , prob]) => Math.random() < prob)
      .map(([time, note]) => [time, note] as [string, string]);

    this.currentPart = new Tone.Part((time, note) => {
      const vel = 0.10 + Math.random() * 0.10;
      this.synth.triggerAttackRelease(note as string, "4n", time, vel);
    }, events);

    this.currentPart.start(startTime);
  }

  stop(): void {
    if (this.currentPart) {
      this.currentPart.dispose();
      this.currentPart = null;
    }
    this.synth.triggerRelease();
  }

  dispose(): void {
    this.stop();
    this.synth.dispose();
    this.effects.dispose();
  }
}
