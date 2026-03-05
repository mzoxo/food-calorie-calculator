<template>
  <Teleport to="body">
    <div v-if="modal.presetSave.visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h2>儲存常用組合</h2>
          <button class="icon-btn" @click="close"><X :size="16" :stroke-width="1.5" /></button>
        </div>
        <div class="modal-body">
          <!-- 組合名稱 -->
          <label class="field">
            <span class="field-label">組合名稱</span>
            <input v-model="name" type="text" class="input" placeholder="例如：混合飯、便當菜" />
          </label>

          <!-- 份數分割 -->
          <label class="field">
            <span class="field-label">分成幾份（食材會除以此數值）</span>
            <div class="quantity-row">
              <button class="qty-btn" @click="divider = Math.max(1, divider - 1)">
                <Minus :size="14" :stroke-width="2" />
              </button>
              <input v-model.number="divider" type="number" class="input qty-input" min="1" step="1" />
              <span class="qty-unit">份</span>
              <button class="qty-btn" @click="divider++">
                <Plus :size="14" :stroke-width="2" />
              </button>
            </div>
          </label>

          <!-- 每份預覽 -->
          <div v-if="preview" class="nutrition-preview">
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">熱量 / 份</span>
              <span class="nutrition-preview-value">{{ fmt(preview.calories) }} kcal</span>
            </div>
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">碳水</span>
              <span class="nutrition-preview-value">{{ preview.carb }}g</span>
            </div>
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">蛋白質</span>
              <span class="nutrition-preview-value">{{ preview.protein }}g</span>
            </div>
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">脂肪</span>
              <span class="nutrition-preview-value">{{ preview.fat }}g</span>
            </div>
            <div v-if="preview.fiber > 0" class="nutrition-preview-item">
              <span class="nutrition-preview-label">膳食纖維</span>
              <span class="nutrition-preview-value">{{ preview.fiber }}g</span>
            </div>
          </div>

          <button class="btn btn-primary btn-block" :disabled="!name.trim()" @click="confirm">儲存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X, Minus, Plus } from 'lucide-vue-next'
import { store, savePresets, showToast } from '../../store/index.js'
import { subtotal, fmt } from '../../utils/calc.js'

const modal   = store.modal
const name    = ref('')
const divider = ref(1)

// 重置
watch(() => modal.presetSave.visible, (v) => {
  if (v) { name.value = ''; divider.value = 1 }
})

const currentItems = computed(() => store.groups[store.activeGroup] || [])

const preview = computed(() => {
  if (!currentItems.value.length) return null
  const s = subtotal(currentItems.value)
  const d = divider.value || 1
  return {
    calories: s.calories / d,
    carb:     Math.round(s.carb     / d * 10) / 10,
    protein:  Math.round(s.protein  / d * 10) / 10,
    fat:      Math.round(s.fat      / d * 10) / 10,
    fiber:    Math.round(s.fiber    / d * 10) / 10,
  }
})

function confirm() {
  if (!name.value.trim() || !currentItems.value.length) return
  store.presets.push({
    name:    name.value.trim(),
    divider: divider.value || 1,
    items:   currentItems.value.map(it => ({ ...it })),
  })
  savePresets()
  showToast(`「${name.value.trim()}」已儲存`)
  close()
}

function close() { modal.presetSave.visible = false }
</script>
