<template>
  <div v-if="store.recent.length" class="recent-section">
    <div class="recent-header">
      <span class="recent-label">最近使用</span>
      <div class="recent-header-actions">
        <button v-if="!editing" class="recent-edit-btn" @click="editing = true">編輯</button>
        <button v-if="editing" class="recent-edit-btn" @click="clearAll">全部清除</button>
        <button v-if="editing" class="recent-edit-btn dark" @click="editing = false">完成</button>
      </div>
    </div>

    <div class="recent-list">
      <span
        v-for="(food, i) in store.recent"
        :key="food['名稱']"
        class="recent-chip"
        @click="!editing && emit('select', food)"
      >
        {{ food['名稱'] }}
        <span v-if="editing" class="chip-remove" @click.stop="remove(i)">
          <X :size="10" :stroke-width="2.5" />
        </span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { store, removeFromRecent, saveRecent, showToast } from '../store/index.js'

const emit    = defineEmits(['select'])
const editing = ref(false)

function remove(i) {
  removeFromRecent(i)
  if (!store.recent.length) editing.value = false
}

function clearAll() {
  store.recent  = []
  editing.value = false
  saveRecent()
  showToast('已清除最近使用')
}
</script>
