<template>
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>新增食物</h2>
          <button class="icon-btn" @click="$emit('close')">
            <X :size="16" :stroke-width="1.5" />
          </button>
        </div>
        <div class="modal-body" style="padding:24px;text-align:center;color:var(--c-text-muted)">
          即將實作…
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { X } from 'lucide-vue-next'

defineProps({
  date:         { type: String, required: true },
  defaultGroup: { type: String, default: '早餐' },
})
defineEmits(['close', 'added'])
</script>
