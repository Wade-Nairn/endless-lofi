import type { ChordEvent, LofiKey, ScaleDegree, ChordQuality } from "../types/index.js";
import { LOFI_KEYS } from "../theory/scales.js";
import { LOFI_TRANSITIONS, nextDegree } from "../theory/markov.js";

// Semitone distances from root for each major-scale degree
const MAJOR_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

// Extended chord intervals (semitones from chord root) — ported from lofi-engine
const CHORD_INTERVALS: number[][] = [
  [0, 4, 7, 11, 14, 17, 21],  // I   maj9/13
  [0, 3, 7, 10, 14, 17, 21],  // ii  m9/13
  [0, 3, 7, 10, 13, 17, 20],  // iii m11
  [0, 4, 7, 11, 14, 18, 21],  // IV  maj9#11
  [0, 4, 7, 10, 14, 17, 21],  // V   dom9/13
  [0, 3, 7, 10, 14, 17, 20],  // vi  m9/b13
  [0, 3, 6, 10, 13, 17, 20],  // vii m7b5/11
];

const CHORD_QUALITIES: ChordQuality[] = ["maj7", "min7", "min7", "maj7", "dom7", "min7", "min7b5"];

const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_TO_IDX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

function noteFromSemitone(rootNote: string, semitones: number): string {
  const pitchLen = rootNote.length > 2 && rootNote[1] !== "b" ? 2 : (rootNote[1] === "b" || rootNote[1] === "#" ? 2 : 1);
  const pitch = rootNote.slice(0, pitchLen);
  const octave = parseInt(rootNote.slice(pitchLen));
  const rootIdx = NOTE_TO_IDX[pitch] ?? 0;
  const total = rootIdx + semitones;
  const noteIdx = ((total % 12) + 12) % 12;
  return `${CHROMATIC[noteIdx]}${octave + Math.floor(total / 12)}`;
}

// Shuffle upper intervals then sort ascending — lofi-engine's voicing approach
function generateVoicing(intervals: number[], size = 4): number[] {
  const upper = [...intervals.slice(1, size)];
  upper.sort(() => Math.random() - 0.5);
  for (let i = 1; i < upper.length; i++) {
    while (upper[i] < upper[i - 1]) upper[i] += 12;
  }
  return [0, ...upper];
}

export class ChordEngine {
  private currentDegree: ScaleDegree = 1;
  private _currentKey: LofiKey;

  constructor(key: LofiKey = "C") {
    this._currentKey = key;
  }

  private _buildChord(degree: ScaleDegree): ChordEvent {
    const semitoneDist = MAJOR_SEMITONES[degree - 1];
    const chordRoot = noteFromSemitone(this._currentKey + "3", semitoneDist);
    const voicing = generateVoicing(CHORD_INTERVALS[degree - 1]);
    const notes = voicing.map((offset) => noteFromSemitone(chordRoot, offset));
    return {
      root: chordRoot,
      quality: CHORD_QUALITIES[degree - 1],
      degree,
      notes,
    };
  }

  current(): ChordEvent {
    return this._buildChord(this.currentDegree);
  }

  next(): ChordEvent {
    this.currentDegree = nextDegree(this.currentDegree, LOFI_TRANSITIONS);
    return this._buildChord(this.currentDegree);
  }

  peek(): ChordEvent {
    const nextDeg = nextDegree(this.currentDegree, LOFI_TRANSITIONS);
    return this._buildChord(nextDeg);
  }

  get currentKey(): LofiKey {
    return this._currentKey;
  }

  regenerate(): LofiKey {
    const remaining = LOFI_KEYS.filter((k) => k !== this._currentKey);
    this._currentKey = remaining[Math.floor(Math.random() * remaining.length)];
    this.currentDegree = 1;
    return this._currentKey;
  }
}
