import * as Tone from "tone";
import type { EngineState, LofiKey, FeedEntry, ChordEvent } from "../types/index.js";
import { LOFI_KEYS } from "../theory/scales.js";
import { ChordEngine } from "./ChordEngine.js";
import { MelodyEngine } from "./MelodyEngine.js";
import { BassEngine } from "./BassEngine.js";
import { DrumEngine } from "./DrumEngine.js";
import { VinylCrackle } from "./VinylCrackle.js";
import { AutoDJ } from "./AutoDJ.js";
import { EffectsChain } from "./EffectsChain.js";

const BPM        = 156;
const PROG_LENGTH = 8;
const PHRASE_BARS = 4;

const ROMAN_UPPER = ["I", "II", "III", "IV", "V", "VI", "VII"];
const ROMAN_LOWER = ["i", "ii", "iii", "iv", "v", "vi", "vii"];
function toRoman(degree: number, quality: string): string {
  const idx = degree - 1;
  return quality === "maj7" || quality === "dom7" ? ROMAN_UPPER[idx] : ROMAN_LOWER[idx];
}

const PIANO_BASE = "/piano/";
const PIANO_URLS = {
  A1: "A1v1.mp3",  C1: "C1v1.mp3",  "D#1": "Dsharp1v1.mp3", "F#1": "Fsharp1v1.mp3",
  A2: "A2v1.mp3",  C2: "C2v1.mp3",  "D#2": "Dsharp2v1.mp3", "F#2": "Fsharp2v1.mp3",
  A3: "A3v1.mp3",  C3: "C3v1.mp3",  "D#3": "Dsharp3v1.mp3", "F#3": "Fsharp3v1.mp3",
  A4: "A4v1.mp3",  C4: "C4v1.mp3",  "D#4": "Dsharp4v1.mp3", "F#4": "Fsharp4v1.mp3",
  A5: "A5v1.mp3",  C5: "C5v1.mp3",  "D#5": "Dsharp5v1.mp3", "F#5": "Fsharp5v1.mp3",
  A6: "A6v1.mp3",  C6: "C6v1.mp3",  "D#6": "Dsharp6v1.mp3", "F#6": "Fsharp6v1.mp3",
};

export class AudioEngine {
  private chordEngine!: ChordEngine;
  private melodyEngine!: MelodyEngine;
  private bassEngine!: BassEngine;
  private drumEngine!: DrumEngine;
  private vinylCrackle!: VinylCrackle;
  private autoDJ!: AutoDJ;

  // Piano chain — connects directly to Tone.getDestination(), no master bus
  private piano!: Tone.Sampler;
  private pianoLPF!: Tone.Filter;
  private pianoWidener!: Tone.StereoWidener;

  private progression: ChordEvent[] = [];
  private progIndex  = 0;
  private pianoOff   = false;
  private bassOff    = false;
  private bassEnabled  = false; // off by default — toggle in UI
  private drumsEnabled = true;

  // Single continuous Sequence for chords — matches lofi-engine approach
  private chordSeq!: Tone.Sequence<string>;

  private state: EngineState;
  private listeners: Array<(s: EngineState) => void> = [];

  constructor() {
    this.state = {
      isPlaying: false,
      bpm: BPM,
      currentKey: LOFI_KEYS[0],
      currentChord: null,
      barCount: 0,
      drums: { kick: false, snare: false, hat: false },
      lastFeedEntry: null,
    };
  }

  async load(): Promise<void> {
    const key: LofiKey = LOFI_KEYS[Math.floor(Math.random() * LOFI_KEYS.length)];

    // Piano chain: piano → LPF(1000Hz) → StereoWidener(0.5) → destination (no master bus)
    this.pianoLPF     = new Tone.Filter(1000, "lowpass");
    this.pianoWidener = new Tone.StereoWidener(0.5);
    this.pianoWidener.connect(Tone.getDestination());
    this.pianoLPF.connect(this.pianoWidener);

    this.chordEngine  = new ChordEngine(key);
    this.melodyEngine = new MelodyEngine();
    this.bassEngine   = new BassEngine();
    this.drumEngine   = new DrumEngine();
    this.vinylCrackle = new VinylCrackle();

    await Promise.all([
      new Promise<void>((resolve) => {
        this.piano = new Tone.Sampler({
          urls: PIANO_URLS,
          baseUrl: PIANO_BASE,
          onload: () => { this.piano.connect(this.pianoLPF); resolve(); },
        });
      }),
      this.drumEngine.load(),
    ]);

    this.melodyEngine.setSampler(this.piano);
    this.melodyEngine.updateScale(key);
    this.melodyEngine.randomize();
    this.melodyEngine.init();

    // AutoDJ only sweeps the piano LPF now — no master LPF
    this.autoDJ = new AutoDJ(this.chordEngine, this.melodyEngine, this.pianoLPF);

    this._generateProgression();
    this._configureTransport();
    this._buildChordSeq();

    this.state.currentKey   = key;
    this.state.currentChord = this.progression[0];
    this._notify();
  }

  private _generateProgression(): void {
    this.progression = [];
    for (let i = 0; i < PROG_LENGTH; i++) {
      this.progression.push(this.chordEngine.next());
    }
    this.progIndex = 0;
    this.melodyEngine.randomize();
    this.drumEngine.randomizePhrase();
  }

  private _configureTransport(): void {
    const t = Tone.getTransport();
    t.bpm.value        = BPM;
    t.swing            = 1;
    t.swingSubdivision = "8n";
    t.timeSignature    = 4;
  }

  // Continuous Sequence matching lofi-engine — fires every whole note
  private _buildChordSeq(): void {
    this.chordSeq = new Tone.Sequence(
      (time) => {
        const chord     = this.progression[this.progIndex];
        const nextChord = this.progression[(this.progIndex + 1) % PROG_LENGTH];
        this.progIndex  = (this.progIndex + 1) % PROG_LENGTH;

        // Piano chord — default velocity 1 to match lofi-engine, skip occasionally
        if (!this.pianoOff) {
          this.piano.triggerAttackRelease(chord.notes, "1n", time);
        }

        // Bass
        if (this.bassEnabled && !this.bassOff) {
          this.bassEngine.scheduleWalkingBass(chord, nextChord, time);
        }

        // Phrase boundary
        const barInPhrase = this.state.barCount % PHRASE_BARS;
        if (this.state.barCount > 0 && barInPhrase === 0) {
          this.drumEngine.randomizePhrase();
          this.melodyEngine.randomize();
          this.pianoOff = Math.random() < 0.10;
          this.bassOff  = Math.random() < 0.25;
        }

        if (this.progIndex === 0) this._generateProgression();

        const drumMutes = this.drumEngine.getMutes();
        this.state.barCount++;
        this.state.currentChord = chord;
        this.state.drums        = drumMutes;
        this.state.lastFeedEntry = {
          bar:        this.state.barCount,
          key:        this.state.currentKey,
          degree:     chord.degree,
          roman:      toRoman(chord.degree, chord.quality),
          chord:      `${chord.root.slice(0, -1)} ${chord.quality}`,
          chordNotes: chord.notes,
          progIndex:  this.progIndex,
          progLength: PROG_LENGTH,
          drums:      { ...drumMutes },
          melodyOff:  this.melodyEngine.isMuted(),
          pianoOff:   this.pianoOff,
          timestamp:  Date.now(),
        };
        this._notify();

        this.autoDJ.onBarEnd(this.state.barCount, (newKey) => {
          this.state.currentKey = newKey;
          this._generateProgression();
          this._notify();
        });
      },
      [""],
      "1n"
    );
    this.chordSeq.humanize = true;
  }

  async start(): Promise<void> {
    await Tone.start();
    this.drumEngine.start();
    this.melodyEngine.start();
    this.vinylCrackle.start();
    this.chordSeq.start(0);
    Tone.getTransport().start();
    this.state.isPlaying = true;
    this._notify();
  }

  pause(): void {
    Tone.getTransport().pause();
    this.state.isPlaying = false;
    this._notify();
  }

  async resume(): Promise<void> {
    await Tone.start();
    this.melodyEngine.start();
    Tone.getTransport().start();
    this.state.isPlaying = true;
    this._notify();
  }

  stop(): void {
    Tone.getTransport().stop();
    this.drumEngine.stop();
    this.vinylCrackle.stop();
    this.melodyEngine.stop();
    this.bassEngine.stop();
    this.chordSeq?.stop();
    this.state.isPlaying = false;
    this.state.barCount  = 0;
    this._notify();
  }

  toggleBass(): boolean {
    this.bassEnabled = !this.bassEnabled;
    if (!this.bassEnabled) this.bassEngine.stop();
    return this.bassEnabled;
  }

  toggleDrums(): boolean {
    this.drumsEnabled = !this.drumsEnabled;
    if (this.drumsEnabled) this.drumEngine.start();
    else this.drumEngine.stop();
    return this.drumsEnabled;
  }

  isBassEnabled(): boolean  { return this.bassEnabled; }
  isDrumsEnabled(): boolean { return this.drumsEnabled; }

  getState(): Readonly<EngineState> {
    return this.state;
  }

  onStateChange(cb: (s: EngineState) => void): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter((l) => l !== cb); };
  }

  private _notify(): void {
    const snapshot = { ...this.state };
    for (const cb of this.listeners) cb(snapshot);
  }

  dispose(): void {
    this.stop();
    this.chordSeq?.dispose();
    this.melodyEngine.dispose();
    this.bassEngine.dispose();
    this.drumEngine.dispose();
    this.vinylCrackle.dispose();
    this.piano?.dispose();
    this.pianoLPF?.dispose();
    this.pianoWidener?.dispose();
    EffectsChain.masterInput = null;
  }
}
