import type { LofiKey, ScaleMode, NoteName } from "../types/index.js";

export const LOFI_KEYS: LofiKey[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const CHROMATIC = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const MODE_INTERVALS: Record<ScaleMode, number[]> = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  minor:  [0, 2, 3, 5, 7, 8, 10],
};

function noteAtSemitone(root: LofiKey, semitones: number, octave: number): NoteName {
  const rootIdx = CHROMATIC.indexOf(root);
  const noteIdx = (rootIdx + semitones) % 12;
  return `${CHROMATIC[noteIdx]}${octave}`;
}

export function buildScale(root: LofiKey, mode: ScaleMode, octave = 3): NoteName[] {
  const intervals = MODE_INTERVALS[mode];
  const scale: NoteName[] = [];
  for (const interval of intervals) {
    const oct = octave + Math.floor((CHROMATIC.indexOf(root) + interval) / 12);
    scale.push(noteAtSemitone(root, interval, oct));
  }
  scale.push(noteAtSemitone(root, 12, octave + 1));
  return scale;
}

export function buildScaleMultiOctave(root: LofiKey, mode: ScaleMode, startOctave = 2, octaves = 4): NoteName[] {
  const notes: NoteName[] = [];
  for (let o = 0; o < octaves; o++) {
    const slice = buildScale(root, mode, startOctave + o);
    notes.push(...slice.slice(0, 7));
  }
  notes.push(noteAtSemitone(root, 0, startOctave + octaves));
  return notes;
}
