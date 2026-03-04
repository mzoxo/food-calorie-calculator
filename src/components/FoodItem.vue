<template>
  <div class="food-item">
    <div class="food-item-info">
      <!-- 名稱列 -->
      <div class="food-item-name">{{ item.food['名稱'] }}</div>

      <!-- 詳細列：克數 + 營養素 -->
      <div class="food-item-detail">
        {{ qtyLabel }} · 碳 {{ n.carb }}g · 蛋 {{ n.protein }}g · 脂 {{ n.fat }}g
        <span v-if="n.fiber > 0"> · 纖 {{ n.fiber }}g</span>
      </div>

      <!-- 備註區（折疊） -->
      <div v-if="item.note || editingNote" class="food-item-note-wrap">
        <span v-if="!editingNote" class="food-item-note" @click="startEdit">
          {{ item.note }}
        </span>
        <input
          v-else
          ref="noteInput"
          v-model="noteValue"
          class="food-item-note-input"
          placeholder="新增備註…"
          @blur="saveNote"
          @keydown.enter="saveNote"
          @keydown.esc="cancelEdit"
        />
      </div>

      <!-- 無備註時的新增備註按鈕 -->
      <button v-else class="food-item-note-add" @click="startEdit">
        + 備註
      </button>
    </div>

    <!-- 熱量 -->
    <span class="food-item-cal">{{ Math.round(n.calories) }} kcal</span>

    <!-- 刪除 -->
    <button class="icon-btn food-item-remove" @click="$emit('remove')">
      <X :size="14" :stroke-width="2" />
    </button>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import { compute } from '../utils/calc.js'

const props = defineProps({
  item: { type: Object, required: true },
})
const emit = defineEmits(['remove', 'update-note'])

// ── 營養計算 ──────────────────────────────────────────
const n = computed(() => compute(props.item.food, props.item.quantity, props.item.mode))

const qtyLabel = computed(() =>
  props.item.mode === 'serving'
    ? `${props.item.quantity} 份`
    : `${props.item.quantity}g`
)

// ── 備註編輯 ──────────────────────────────────────────
const editingNote = ref(false)
const noteValue   = ref('')
const noteInput   = ref(null)

async function startEdit() {
  noteValue.value   = props.item.note || ''
  editingNote.value = true
  await nextTick()
  noteInput.value?.focus()
}

function saveNote() {
  emit('update-note', noteValue.value.trim())
  editingNote.value = false
}

function cancelEdit() {
  editingNote.value = false
}
</script>

<style scoped>
.food-item-note-wrap {
  margin-top: 2px;
}

.food-item-note {
  font-size: 0.72rem;
  color: var(--c-text-muted);
  cursor: pointer;
  border-bottom: 1px dashed var(--c-border);
}

.food-item-note:hover {
  color: var(--c-text-secondary);
}

.food-item-note-input {
  width: 100%;
  font-size: 0.72rem;
  font-family: var(--font);
  color: var(--c-text);
  border: none;
  border-bottom: 1px solid var(--c-primary);
  outline: none;
  background: transparent;
  padding: 1px 0;
}

.food-item-note-add {
  margin-top: 2px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.72rem;
  color: var(--c-text-muted);
  padding: 0;
  font-family: var(--font);
  opacity: 0;
  transition: opacity var(--duration) var(--ease);
}

.food-item:hover .food-item-note-add {
  opacity: 1;
}
</style>
