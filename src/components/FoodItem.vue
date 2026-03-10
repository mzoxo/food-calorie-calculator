<template>
  <div class="food-item">
    <div class="food-item-info">
      <!-- 名稱列 -->
      <div class="food-item-name">
        {{ item.food['名稱'] }}
        <button class="icon-btn name-edit-btn" @click="$emit('edit')">
          <Pencil :size="14" :stroke-width="1.5" />
        </button>
      </div>

      <!-- 詳細列：克數 + 營養素 -->
      <div class="food-item-detail">
        {{ qtyLabel }} · 碳 {{ n.carb }}g · 蛋 {{ n.protein }}g · 脂 {{ n.fat }}g
        <span v-if="n.fiber > 0"> · 纖 {{ n.fiber }}g</span>
      </div>

      <!-- 備註（有才顯示） -->
      <div v-if="item.note" class="food-item-note">{{ item.note }}</div>
    </div>

    <!-- 熱量 -->
    <span class="food-item-cal">{{ fmt(n.calories) }} kcal</span>

    <!-- 刪除 -->
    <button class="icon-btn food-item-remove" @click="$emit('remove')">
      <X :size="14" :stroke-width="2" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { X, Pencil } from 'lucide-vue-next'
import { compute, fmt } from '../utils/calc.js'

const props = defineProps({
  item: { type: Object, required: true },
})
defineEmits(['remove', 'edit'])

// ── 營養計算 ──────────────────────────────────────────
const n = computed(() => compute(props.item.food, props.item.quantity, props.item.mode))

const qtyLabel = computed(() =>
  props.item.mode === 'serving'
    ? `${props.item.quantity} 份`
    : `${props.item.quantity}g`
)
</script>

<style scoped>
.food-item-name {
  display: flex;
  align-items: center;
  gap: 4px;
}

.name-edit-btn {
  opacity: 0.25;
  color: var(--c-text-muted);
  padding: 0;
  min-width: unset;
  min-height: unset;
  transition: opacity var(--duration) var(--ease);
}

.name-edit-btn svg {
  width: 12px;
  height: 12px;
}

.food-item:hover .name-edit-btn {
  opacity: 0.6;
}

/* .food-item-note 已移至全域 style.css */
</style>
