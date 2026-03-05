<template>
  <Teleport to="body">
    <div v-if="modal.addFood.visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ food?.['名稱'] }}</h2>
          <button class="icon-btn" @click="close"><X :size="16" :stroke-width="1.5" /></button>
        </div>

        <div class="modal-body">
          <!-- 食材資訊 -->
          <div class="food-info">
            <span v-if="food?.['品牌']">{{ food['品牌'] }} · </span>
            <span>{{ food?.['分類'] }}</span>
            <span v-if="food?.['每 100g 熱量']"> · {{ food['每 100g 熱量'] }} kcal / 100g</span>
            <span v-if="food?.['每份量(g)']"> · 每份 {{ food['每份量(g)'] }}g</span>
          </div>

          <!-- 克數 / 份數切換 -->
          <div class="input-mode-toggle">
            <button
              class="toggle-btn"
              :class="{ active: mode === 'gram' }"
              @click="setMode('gram')"
            >克數 (g)</button>
            <button
              class="toggle-btn"
              :class="{ active: mode === 'serving' }"
              :disabled="!food?.['每份量(g)']"
              @click="setMode('serving')"
            >份數</button>
          </div>

          <!-- 數量輸入 -->
          <div class="quantity-row">
            <button class="qty-btn" @click="adjust(-1)">
              <Minus :size="14" :stroke-width="2" />
            </button>
            <input
              v-model.number="quantity"
              type="number"
              class="input qty-input"
              min="0"
              :step="mode === 'gram' ? 10 : 0.5"
            />
            <span class="qty-unit">{{ mode === 'gram' ? 'g' : '份' }}</span>
            <button class="qty-btn" @click="adjust(1)">
              <Plus :size="14" :stroke-width="2" />
            </button>
          </div>

          <!-- 營養預覽 -->
          <div v-if="n" class="nutrition-preview">
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">熱量</span>
              <span class="nutrition-preview-value">{{ Math.round(n.calories) }} kcal</span>
            </div>
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">碳水</span>
              <span class="nutrition-preview-value">{{ n.carb }}g</span>
            </div>
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">蛋白質</span>
              <span class="nutrition-preview-value">{{ n.protein }}g</span>
            </div>
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">脂肪</span>
              <span class="nutrition-preview-value">{{ n.fat }}g</span>
            </div>
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">膳食纖維</span>
              <span class="nutrition-preview-value">{{ n.fiber }}g</span>
            </div>
          </div>

          <!-- 備註 -->
          <div class="field">
            <span class="field-label">備註</span>
            <input v-model="note" type="text" class="input" placeholder="選填" />
          </div>

          <!-- 選群組（新增模式才顯示） -->
          <div v-if="!modal.addFood.editMode" class="field">
            <span class="field-label">加入群組</span>
            <select v-model="selectedGroup" class="input">
              <option v-for="g in store.groupOrder" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>

          <button class="btn btn-primary btn-block" @click="confirm">
            {{ modal.addFood.editMode ? '儲存' : '加入' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X, Minus, Plus } from 'lucide-vue-next'
import { store, addFoodToGroup, addToRecent, saveState } from '../../store/index.js'
import { compute } from '../../utils/calc.js'

const modal = store.modal

// ── 本地狀態 ──────────────────────────────────────────
const mode          = ref('gram')
const quantity      = ref(100)
const note          = ref('')
const selectedGroup = ref('')

const food = computed(() => modal.addFood.food)

// 每次開啟重置
watch(() => modal.addFood.visible, (v) => {
  if (!v) return
  if (modal.addFood.editMode) {
    // 編輯模式：預填現有值
    const item = store.groups[modal.addFood.groupName]?.[modal.addFood.index]
    mode.value     = item?.mode     ?? 'gram'
    quantity.value = item?.quantity ?? 100
    note.value     = item?.note     ?? ''
  } else {
    mode.value          = 'gram'
    quantity.value      = modal.addFood.initQuantity ?? 100
    note.value          = ''
    selectedGroup.value = store.activeGroup
    modal.addFood.initQuantity = null
  }
})

// ── 即時營養計算 ──────────────────────────────────────
const n = computed(() =>
  food.value && quantity.value > 0
    ? compute(food.value, quantity.value, mode.value)
    : null
)

// ── 操作 ─────────────────────────────────────────────
function setMode(m) {
  mode.value     = m
  quantity.value = m === 'gram' ? 100 : 1
}

function adjust(dir) {
  const step = mode.value === 'gram' ? 10 : 0.5
  quantity.value = Math.max(0, +(quantity.value + dir * step).toFixed(1))
}

function confirm() {
  if (!food.value || quantity.value <= 0) return
  if (modal.addFood.editMode) {
    const item = store.groups[modal.addFood.groupName]?.[modal.addFood.index]
    if (item) {
      item.quantity = quantity.value
      item.mode     = mode.value
      item.note     = note.value.trim()
      saveState()
    }
  } else {
    addFoodToGroup(food.value, quantity.value, mode.value, selectedGroup.value, { note: note.value.trim() })
    addToRecent(food.value)
  }
  close()
}

function close() {
  modal.addFood.visible  = false
  modal.addFood.editMode = false
}
</script>
