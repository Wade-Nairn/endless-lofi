export type NoteName = string;
export type ScaleDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type ChordQuality = "maj7" | "min7" | "dom7" | "min7b5";
export type LofiKey = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
export type ScaleMode = "dorian" | "minor";

export interface ChordEvent {
  root: NoteName;
  quality: ChordQuality;
  degree: ScaleDegree;
  notes: NoteName[];
}

export interface DrumState {
  kick: boolean;
  snare: boolean;
  hat: boolean;
}

export interface FeedEntry {
  bar: number;
  key: LofiKey;
  degree: ScaleDegree;
  roman: string;
  chord: string;
  chordNotes: string[];
  progIndex: number;
  progLength: number;
  drums: DrumState;
  melodyOff: boolean;
  pianoOff: boolean;
  timestamp: number;
}

export interface EngineState {
  isPlaying: boolean;
  bpm: number;
  currentKey: LofiKey;
  currentChord: ChordEvent | null;
  barCount: number;
  drums: DrumState;
  lastFeedEntry: FeedEntry | null;
}
