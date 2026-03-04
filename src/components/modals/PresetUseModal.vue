<template>
  <Teleport to="body">
    <div v-if="modal.presetUse.visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ preset?.name }}</h2>
          <button class="icon-btn" @click="close"><X :size="16" :stroke-width="1.5" /></button>
        </div>
        <div class="modal-body">
          <!-- 食材清單 -->
          <div class="food-info">
            <div v-for="(entry, i) in scaledItems" :key="i" style="padding:2px 0">
              {{ entry.food['名稱'] }}
              <span style="color:var(--c-text-muted)">
                {{ entry.mode === 'serving' ? `${entry.quantity}份` : `${entry.quantity}g` }}
              </span>
            </div>
          </div>

          <!-- 營養預覽 -->
          <div v-if="preview" class="nutrition-preview">
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">熱量</span>
              <span class="nutrition-preview-value">{{ Math.round(preview.calories) }} kcal</span>
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
          </div>

          <!-- 選群組 -->
          <div class="field">
            <span class="field-label">加入群組</span>
            <select v-model="selectedGroup" class="input">
              <option v-for="g in store.groupOrder" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>

          <button class="btn btn-primary btn-block" @click="confirm">加入</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { store, addFoodToGroup, showToast } from '../../store/index.js'
import { compute, subtotal } from '../../utils/calc.js'

const modal         = store.modal
const selectedGroup = ref('')

const preset = computed(() => modal.presetUse.preset)
const qty    = computed(() => modal.presetUse.qty || 1)

watch(() => modal.presetUse.visible, (v) => {
  if (v) selectedGroup.value = store.activeGroup
})

// 依 qty / divider 縮放後的食材
const scaledItems = computed(() => {
  if (!preset.value) return []
  const multiplier = qty.value / (preset.value.divider || 1)
  return preset.value.items.map(it => ({
    ...it,
    quantity: Math.round(it.quantity * multiplier * 10) / 10,
  }))
})

const preview = computed(() => {
  if (!scaledItems.value.length) return null
  return subtotal(scaledItems.value)
})

function confirm() {
  if (!preset.value) return
  const presetId = `${Date.now()}`
  scaledItems.value.forEach(item => {
    addFoodToGroup(item.food, item.quantity, item.mode, selectedGroup.value, {
      presetName: preset.value.name,
      presetId,
    })
  })
  showToast(`已加入「${preset.value.name}」`)
  close()
}

function close() { modal.presetUse.visible = false }
</script>
