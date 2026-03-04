<template>
  <Teleport to="body">
    <div v-if="modal.export.visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h2>匯出</h2>
          <button class="icon-btn" @click="close"><X :size="16" :stroke-width="1.5" /></button>
        </div>
        <div class="modal-body">
          <textarea :value="text" class="export-textarea" readonly />
          <button class="btn btn-primary btn-block" @click="copy">複製到剪貼簿</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { store, showToast } from '../../store/index.js'
import { generateExport } from '../../utils/export.js'

const modal = store.modal

const text = computed(() =>
  modal.export.visible
    ? generateExport(store.groups, store.groupOrder)
    : ''
)

async function copy() {
  try {
    await navigator.clipboard.writeText(text.value)
    showToast('已複製到剪貼簿')
  } catch {
    // fallback
    const el = document.createElement('textarea')
    el.value = text.value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    showToast('已複製到剪貼簿')
  }
}

function close() { modal.export.visible = false }
</script>
