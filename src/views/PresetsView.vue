<template>
  <div class="presets-view container">

    <!-- Header -->
    <header class="header">
      <button class="icon-btn" @click="$router.back()">
        <ChevronLeft :size="16" :stroke-width="1.5" />
      </button>
      <h1 class="header-title" style="position:absolute;left:50%;transform:translateX(-50%);pointer-events:none;">常用組合</h1>
      <div />
    </header>

    <!-- 空狀態 -->
    <div v-if="!store.presets.length" class="empty-state">
      <p class="empty-text">還沒有常用組合</p>
      <p class="empty-sub">在計算機頁面選好食材後，可儲存為常用組合</p>
    </div>

    <!-- 列表 -->
    <div v-else class="preset-list">
      <div v-for="(preset, i) in store.presets" :key="i" class="preset-card">

        <!-- 卡片標題列 -->
        <div class="preset-row">
          <div class="preset-info">
            <span class="preset-name">
              {{ preset.name }}
              <span v-if="preset.divider > 1" class="preset-divider">（÷{{ preset.divider }}）</span>
            </span>
            <span class="preset-summary">
              {{ preset.items.length }} 種食材 · {{ presetTotalKcal(preset) }} kcal
            </span>
          </div>
          <div class="preset-row-actions">
            <button class="icon-btn" @click="deletePreset(i)" title="刪除">
              <Trash2 :size="14" :stroke-width="1.5" />
            </button>
            <button class="icon-btn expand-btn" @click="toggleExpand(i)">
              <ChevronDown v-if="!expanded[i]" :size="14" :stroke-width="1.5" />
              <ChevronUp   v-else              :size="14" :stroke-width="1.5" />
            </button>
          </div>
        </div>

        <!-- 展開的食材清單 -->
        <div v-if="expanded[i]" class="preset-items">
          <div v-for="(item, ii) in preset.items" :key="ii" class="preset-item">
            <span class="item-name">{{ item.food['名稱'] }}</span>
            <span class="item-qty">{{ item.quantity }}{{ item.mode === 'serving' ? '份' : 'g' }}</span>
            <span class="item-kcal">{{ itemKcal(item) }} kcal</span>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { ChevronLeft, ChevronDown, ChevronUp, Trash2 } from 'lucide-vue-next'
import { store, savePresets, showConfirm } from '../store/index.js'
import { compute, subtotal } from '../utils/calc.js'

const expanded = reactive({})

function toggleExpand(i) {
  expanded[i] = !expanded[i]
}

function itemKcal(item) {
  if (!item.food) return 0
  return Math.round(compute(item.food, item.quantity, item.mode).calories)
}

function presetTotalKcal(preset) {
  return Math.round(subtotal(preset.items).calories)
}

async function deletePreset(i) {
  const ok = await showConfirm(`確定刪除「${store.presets[i].name}」？`)
  if (!ok) return
  store.presets.splice(i, 1)
  savePresets()
}
</script>

<style scoped>
.presets-view {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--c-bg);
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap-md);
}

.preset-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--c-bg);
}

.preset-row {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: 12px var(--gap-md);
}

.preset-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.preset-name {
  font-size: 14px;
  font-weight: 600;
}

.preset-divider {
  font-weight: 400;
  color: var(--c-text-muted);
}

.preset-summary {
  font-size: 12px;
  color: var(--c-text-muted);
}

.preset-row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.preset-items {
  border-top: 1px solid var(--c-border-light);
  background: var(--c-surface);
  padding: 6px var(--gap-md);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: 5px 0;
  font-size: 13px;
}

.item-name { flex: 1; }
.item-qty  { color: var(--c-text-muted); flex-shrink: 0; }
.item-kcal { color: var(--c-text-muted); flex-shrink: 0; min-width: 56px; text-align: right; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 24px;
}

.empty-text { font-size: 15px; font-weight: 500; color: var(--c-text); margin: 0; }
.empty-sub  { font-size: 13px; color: var(--c-text-muted); margin: 0; text-align: center; }
</style>
