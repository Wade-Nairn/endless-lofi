<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

const props = defineProps<{ open: boolean; title: string }>();
const emit  = defineEmits<{ close: [] }>();

const drawerEl = ref<HTMLElement | null>(null);
const closeBtn = ref<HTMLButtonElement | null>(null);

// Focus the close button when the drawer opens
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    closeBtn.value?.focus();
  }
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    emit("close");
    return;
  }
  // Basic focus trap — keep Tab cycling inside the drawer
  if (e.key !== "Tab" || !drawerEl.value) return;
  const focusable = Array.from(
    drawerEl.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => !el.hasAttribute("disabled"));

  if (focusable.length === 0) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="open" class="backdrop" @click="$emit('close')" aria-hidden="true" />
    </Transition>

    <Transition name="drawer">
      <div
        v-if="open"
        ref="drawerEl"
        class="drawer"
        role="dialog"
        :aria-label="title"
        aria-modal="true"
        @keydown="onKeydown"
      >
        <div class="drawer-header">
          <span class="drawer-title">{{ title }}</span>
          <button ref="closeBtn" class="drawer-close" @click="$emit('close')" aria-label="Close drawer">×</button>
        </div>
        <div class="drawer-body">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 40;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100dvh;
  width: 360px;
  max-width: 90vw;
  background: rgba(12, 12, 18, 0.85);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border-left: 1px solid rgba(255, 255, 255, 0.07);
  z-index: 50;
  display: flex;
  flex-direction: column;
  outline: none;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}

.drawer-title {
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: lowercase;
  color: rgba(255, 255, 255, 0.5);
}

.drawer-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.15s;
}

.drawer-close:hover       { color: rgba(255, 255, 255, 0.8); }
.drawer-close:focus-visible {
  outline: 2px solid rgba(180, 160, 255, 0.6);
  outline-offset: 2px;
  color: rgba(255, 255, 255, 0.8);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  scrollbar-width: none;
}

.drawer-body::-webkit-scrollbar { display: none; }

.drawer-enter-active,
.drawer-leave-active { transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1); }
.drawer-enter-from,
.drawer-leave-to     { transform: translateX(100%); }

.backdrop-enter-active,
.backdrop-leave-active { transition: opacity 0.28s ease; }
.backdrop-enter-from,
.backdrop-leave-to     { opacity: 0; }
</style>
