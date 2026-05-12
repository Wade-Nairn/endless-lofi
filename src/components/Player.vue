<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import type { EngineState, FeedEntry } from "../types/index.js";
import Drawer from "./Drawer.vue";

const isLoaded     = ref(false);
const isLoading    = ref(false);
const isPlaying    = ref(false);
const hasError     = ref(false);
const barCount     = ref(0);
const currentKey   = ref("—");
const feed         = ref<FeedEntry[]>([]);
const activeDrawer = ref<"feed" | "about" | null>(null);

let engine: import("../engine/AudioEngine.js").AudioEngine | null = null;
let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  const { AudioEngine } = await import("../engine/AudioEngine.js");
  engine = new AudioEngine();
  unsubscribe = engine.onStateChange((s: EngineState) => {
    isPlaying.value  = s.isPlaying;
    barCount.value   = s.barCount;
    currentKey.value = s.currentKey;
    if (s.lastFeedEntry) {
      if (!feed.value.length || feed.value[0].bar !== s.lastFeedEntry.bar) {
        feed.value.unshift(s.lastFeedEntry);
        if (feed.value.length > 20) feed.value.pop();
      }
    }
  });

  window.addEventListener("keydown", onKeydown);
  document.addEventListener("visibilitychange", onVisibilityChange);
});

onUnmounted(() => {
  unsubscribe?.();
  engine?.dispose();
  window.removeEventListener("keydown", onKeydown);
  document.removeEventListener("visibilitychange", onVisibilityChange);
});

function onVisibilityChange() {
  if (!engine || !isLoaded.value) return;
  if (document.hidden) {
    engine.pause();
  } else if (isPlaying.value) {
    engine.resume();
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.code === "Space" && !(e.target instanceof HTMLInputElement) && !isLoading.value) {
    e.preventDefault();
    toggle();
  }
}

async function toggle() {
  if (!engine || isLoading.value) return;
  if (!isLoaded.value) {
    isLoading.value = true;
    hasError.value  = false;
    try {
      await engine.load();
      isLoaded.value  = true;
      isLoading.value = false;
      await engine.start();
    } catch {
      isLoading.value = false;
      hasError.value  = true;
    }
    return;
  }
  const state = engine.getState();
  if (!state.isPlaying) await engine.resume();
  else engine.pause();
}

function openDrawer(name: "feed" | "about") {
  activeDrawer.value = name;
}

function drumLabel(entry: FeedEntry): string {
  const k = entry.drums.kick  ? "·" : "K";
  const s = entry.drums.snare ? "·" : "S";
  const h = entry.drums.hat   ? "·" : "H";
  return `${k} ${s} ${h}`;
}

function voicingLabel(entry: FeedEntry): string {
  return entry.chordNotes.map(n => n.replace(/\d/, "")).join(" ");
}
</script>

<template>
  <div class="root">

    <!-- Player card -->
    <div class="player">
      <h1 class="title">endless lofi</h1>

      <button
        class="play-btn"
        :class="{ playing: isPlaying, loading: isLoading, error: hasError }"
        :disabled="isLoading"
        @click="toggle"
        :aria-label="isPlaying ? 'Pause' : (hasError ? 'Retry' : 'Play')"
      >
        <span v-if="isLoading" class="icon icon--loading">···</span>
        <svg v-else-if="hasError" class="icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 3a7 7 0 1 0 0 14A7 7 0 0 0 10 3zm0 4v4m0 2v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
        <svg v-else-if="isPlaying" class="icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <rect x="4" y="3" width="4" height="14" rx="1.5"/>
          <rect x="12" y="3" width="4" height="14" rx="1.5"/>
        </svg>
        <svg v-else class="icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M6 4l11 6-11 6V4z"/>
        </svg>
      </button>

      <p v-if="hasError" class="error-msg">failed to load — tap to retry</p>

      <!-- Drawer trigger buttons -->
      <div class="drawer-triggers">
        <button class="trigger-btn" @click="openDrawer('feed')" :disabled="!isLoaded">bar feed</button>
        <button class="trigger-btn" @click="openDrawer('about')">about</button>
      </div>
    </div>

    <!-- Feed drawer -->
    <Drawer
      :open="activeDrawer === 'feed'"
      title="feed"
      @close="activeDrawer = null"
    >
      <div class="feed" v-if="feed.length">
        <div class="feed-header">
          <span class="feed-col feed-col--bar">bar</span>
          <span class="feed-col feed-col--key">key</span>
          <span class="feed-col feed-col--prog">pos</span>
          <span class="feed-col feed-col--roman">fn</span>
          <span class="feed-col feed-col--chord">chord</span>
          <span class="feed-col feed-col--voicing">voicing</span>
          <span class="feed-col feed-col--drums">drums</span>
          <span class="feed-col feed-col--flags">p m</span>
        </div>
        <div
          v-for="(entry, i) in feed"
          :key="entry.timestamp"
          class="feed-row"
          :class="{ 'feed-row--latest': i === 0 }"
        >
          <span class="feed-col feed-col--bar">{{ entry.bar }}</span>
          <span class="feed-col feed-col--key feed-key">{{ entry.key }}</span>
          <span class="feed-col feed-col--prog feed-prog">{{ entry.progIndex }}/{{ entry.progLength }}</span>
          <span class="feed-col feed-col--roman feed-roman">{{ entry.roman }}</span>
          <span class="feed-col feed-col--chord">{{ entry.chord }}</span>
          <span class="feed-col feed-col--voicing feed-voicing">{{ voicingLabel(entry) }}</span>
          <span class="feed-col feed-col--drums feed-drums">{{ drumLabel(entry) }}</span>
          <span class="feed-col feed-col--flags feed-flags">
            <span :class="{ muted: entry.pianoOff }">p</span>
            <span :class="{ muted: entry.melodyOff }">m</span>
          </span>
        </div>
      </div>
      <p v-else class="feed-empty">play to see the feed</p>
    </Drawer>

    <!-- About drawer -->
    <Drawer
      :open="activeDrawer === 'about'"
      title="about"
      @close="activeDrawer = null"
    >
      <div class="about">
        <h2 class="about-title">endless lofi</h2>
        <p class="about-wip">work in progress</p>

        <p class="about-body">
          A procedural lofi music generator that runs entirely in the browser.
          Chords, melody, and drums are generated in real-time using music theory
          rules and a Markov chain — no loops, no samples beyond the piano and
          drum kit. Every session sounds a little different.
        </p>

        <p class="about-body">
          Open sourced at <a href="https://github.com/wadenairn/endless-lofi" target="_blank" rel="noopener">github.com/wadenairn/endless-lofi</a>.
        </p>

        <p class="about-body">
          Created by <a href="https://wadenairn.dev" target="_blank" rel="noopener">Wade Nairn</a>.
        </p>

        <p class="about-body">
          Built with <a href="https://astro.build" target="_blank" rel="noopener">Astro</a>,
          <a href="https://vuejs.org" target="_blank" rel="noopener">Vue</a>, and
          <a href="https://tonejs.github.io" target="_blank" rel="noopener">Tone.js</a>.
          Inspired by <a href="https://github.com/meel-hd/lofi-engine" target="_blank" rel="noopener">lofi-engine</a>.
        </p>
      </div>
    </Drawer>

  </div>
</template>

<style scoped>
.root {
  display: contents;
}

/* Player card */
.player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  padding: 2.5rem 3rem;
  background: rgba(10, 10, 15, 0.55);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  user-select: none;
}

.title {
  font-size: 1.1rem;
  font-weight: 400;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.7);
  text-transform: lowercase;
  margin: 0;
}

.play-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}

.play-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

.play-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.play-btn.playing {
  border-color: rgba(180, 160, 255, 0.5);
  background: rgba(140, 100, 255, 0.12);
}

.play-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.play-btn.error {
  border-color: rgba(255, 100, 100, 0.4);
  color: rgba(255, 100, 100, 0.8);
}

.play-btn:focus-visible {
  outline: 2px solid rgba(180, 160, 255, 0.6);
  outline-offset: 4px;
}

.error-msg {
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: rgba(255, 100, 100, 0.7);
  text-transform: lowercase;
  margin-top: -0.5rem;
}

.icon {
  display: block;
}

.icon--loading {
  font-size: 1.2rem;
  line-height: 1;
  letter-spacing: 0.1em;
}

/* Drawer triggers */
.drawer-triggers {
  display: flex;
  gap: 0.5rem;
}

.trigger-btn {
  padding: 0.25rem 0.85rem;
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: lowercase;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.trigger-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.7);
}

.trigger-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.trigger-btn:focus-visible {
  outline: 2px solid rgba(180, 160, 255, 0.6);
  outline-offset: 2px;
  border-color: transparent;
}

.status {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
  text-transform: lowercase;
  min-height: 1em;
}

/* Feed (inside drawer) */
.feed {
  font-family: "SF Mono", "Fira Code", "Fira Mono", monospace;
  font-size: 0.66rem;
  color: rgba(255, 255, 255, 0.4);
}

.feed-empty {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.2);
  text-align: center;
  margin-top: 2rem;
  letter-spacing: 0.1em;
  text-transform: lowercase;
}

.feed-header {
  display: flex;
  gap: 10px;
  padding-bottom: 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.55rem;
}

.feed-row {
  display: flex;
  gap: 10px;
  padding: 3px 0;
  opacity: 0.35;
  transition: opacity 0.3s;
}

.feed-row--latest {
  opacity: 1;
  color: rgba(255, 255, 255, 0.85);
}

.feed-col--bar     { width: 26px; }
.feed-col--key     { width: 22px; }
.feed-col--prog    { width: 26px; }
.feed-col--roman   { width: 28px; }
.feed-col--chord   { width: 72px; }
.feed-col--voicing { width: 72px; }
.feed-col--drums   { width: 36px; }
.feed-col--flags   { width: 24px; display: flex; gap: 4px; }

.feed-key   { color: rgba(255, 210, 120, 0.6); }
.feed-row--latest .feed-key   { color: rgba(255, 210, 120, 1); }
.feed-roman { color: rgba(180, 160, 255, 0.6); }
.feed-row--latest .feed-roman { color: rgba(180, 160, 255, 1); }
.feed-prog  { color: rgba(150, 200, 255, 0.5); }
.feed-row--latest .feed-prog  { color: rgba(150, 200, 255, 0.9); }
.feed-voicing { color: rgba(140, 200, 180, 0.5); }
.feed-row--latest .feed-voicing { color: rgba(140, 200, 180, 0.9); }
.feed-drums { letter-spacing: 0.15em; }
.feed-flags span       { opacity: 0.8; }
.feed-flags span.muted { opacity: 0.2; text-decoration: line-through; }

/* About (inside drawer) */
.about {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.about-title {
  font-size: 1.1rem;
  font-weight: 400;
  letter-spacing: 0.25em;
  color: rgba(255, 255, 255, 0.75);
  text-transform: lowercase;
  margin: 0;
}

.about-wip {
  display: inline-block;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(180, 160, 255, 0.7);
  border: 1px solid rgba(180, 160, 255, 0.3);
  border-radius: 4px;
  padding: 2px 8px;
  margin-top: -0.5rem;
}

.about-body {
  font-size: 0.8rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.about-body a {
  color: rgba(180, 160, 255, 0.8);
  text-decoration: none;
  border-bottom: 1px solid rgba(180, 160, 255, 0.3);
  transition: color 0.15s, border-color 0.15s;
}

.about-body a:hover {
  color: rgba(180, 160, 255, 1);
  border-bottom-color: rgba(180, 160, 255, 0.7);
}

</style>
