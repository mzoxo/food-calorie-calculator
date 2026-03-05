<template>
  <Teleport to="body">
    <div v-if="modal.input.visible" class="overlay" style="z-index:150" @click.self="resolve(null)">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ modal.input.title }}</h2>
          <button class="icon-btn" @click="resolve(null)">
            <X :size="16" :stroke-width="1.5" />
          </button>
        </div>
        <div class="modal-body">
          <input
            ref="inputEl"
            v-model="value"
            type="text"
            class="input"
            @keydown.enter="(e) => { if (!e.isComposing) resolve(value) }"
            @keydown.esc="resolve(null)"
          />
          <div style="display:flex;gap:var(--gap-sm)">
            <button class="btn btn-outline" style="flex:1" @click="resolve(null)">取消</button>
            <button class="btn btn-primary" style="flex:1" @click="resolve(value)">確定</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import { store } from '../../store/index.js'

const modal   = store.modal
const value   = ref('')
const inputEl = ref(null)

// 每次開啟時同步預設值並 focus
watch(() => modal.input.visible, async (v) => {
  if (v) {
    value.value = modal.input.defaultValue || ''
    await nextTick()
    inputEl.value?.focus()
    inputEl.value?.select()
  }
})

function resolve(result) {
  modal.input.resolve?.(result)
  modal.input.visible = false
}
</script>
