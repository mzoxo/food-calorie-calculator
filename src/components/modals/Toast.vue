<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="store.toast.visible" class="toast">
        {{ store.toast.message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { store } from '../../store/index.js'
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s var(--ease), transform 0.2s var(--ease);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
