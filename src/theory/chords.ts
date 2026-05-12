import type { ChordEvent, ChordQuality, ScaleDegree, NoteName, LofiKey, ScaleMode } from "../types/index.js";
import { buildScale } from "./scales.js";

// Chord quality per scale degree in dorian and natural minor
const DORIAN_QUALITIES: ChordQuality[] = ["min7", "min7", "maj7", "dom7", "min7", "maj7", "min7b5"];
const MINOR_QUALITIES: ChordQuality[]  = ["min7", "min7b5", "maj7", "min7", "min7", "maj7", "dom7"];

function voicing(scale: NoteName[], degreeIdx: number): NoteName[] {
  // root, third, fifth, seventh — stacked diatonically from the scale
  return [0, 2, 4, 6].map((step) => {
    const idx = degreeIdx + step;
    const octaveShift = Math.floor(idx / scale.length);
    const noteBase = scale[idx % scale.length];
    if (octaveShift === 0) return noteBase;
    const pitch = noteBase.slice(0, -1);
    const oct = parseInt(noteBase.slice(-1)) + octaveShift;
    return `${pitch}${oct}`;
  });
}

export function buildDiatonicChords(root: LofiKey, mode: ScaleMode): ChordEvent[] {
  const scale = buildScale(root, mode, 3);
  const qualities = mode === "dorian" ? DORIAN_QUALITIES : MINOR_QUALITIES;
  return scale.slice(0, 7).map((note, i) => ({
    root: note,
    quality: qualities[i],
    degree: (i + 1) as ScaleDegree,
    notes: voicing(scale, i),
  }));
}
