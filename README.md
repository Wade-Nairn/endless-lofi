# endless lofi

A procedural lofi music generator that runs entirely in the browser. Chords, melody, and drums are generated in real-time using music theory rules and a Markov chain — no pre-recorded loops, just synthesis and sampled piano/drums on every session.

> **Work in progress.** Expect rough edges. Issues and PRs are welcome.

## How it works

- **Chord engine** — generates 8-chord progressions using a diatonic Markov chain, cycling through all 12 keys. Voicings are shuffled on each chord for natural variation.
- **Melody** — a continuous weighted random walk through a two-octave scale, biased toward stepwise motion. Plays half-note durations so notes bleed into each other.
- **Drums** — sampled kick, snare, and hi-hat with multiple pattern variants that rotate every 4 bars. Individual per-instrument EQ and stereo widening.
- **Vinyl crackle** — pink noise at -32dB for analog texture.
- **Auto DJ** — every 16–48 bars, sweeps the piano LPF and modulates to a new key.

## Stack

- [Astro](https://astro.build) — static site builder
- [Vue 3](https://vuejs.org) — interactive player UI
- [Tone.js](https://tonejs.github.io) — Web Audio synthesis, sequencing, transport

Inspired by [lofi-engine](https://github.com/meel-hd/lofi-engine).

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:4321` and click play. Samples load on first interaction.

## Project structure

```
src/
  engine/       # Audio engine — framework-agnostic TypeScript
    AudioEngine.ts    # Orchestrator
    ChordEngine.ts    # Markov chord progressions
    MelodyEngine.ts   # Continuous melody sequence
    DrumEngine.ts     # Drum patterns and sequencing
    BassEngine.ts     # Optional walking bass
    VinylCrackle.ts   # Pink noise
    EffectsChain.ts   # Per-instrument effects
    AutoDJ.ts         # Section transitions
  theory/       # Music theory helpers (scales, chords, Markov transitions)
  components/   # Vue components (Player, Drawer)
  pages/        # Astro pages
public/
  piano/        # Salamander grand piano samples (v1 velocity layer)
  drums/        # Kick, snare, hi-hat samples
```

## Contributing

Issues and pull requests are welcome. This is an early-stage project so there's plenty of room to improve — sound quality, new instruments, better UI, mobile support, and more.

## License

MIT
