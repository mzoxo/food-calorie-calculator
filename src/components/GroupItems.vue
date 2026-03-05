<template>
  <section class="section">
    <!-- 空群組提示 -->
    <div v-if="!items.length" class="group-empty">尚未加入任何食材</div>

    <!-- 食材列表 -->
    <div class="group-items">
      <template v-for="block in processedItems" :key="block.key">

        <!-- 獨立食材 -->
        <FoodItem
          v-if="block.type === 'item'"
          :item="block.item"
          @remove="removeItem(block.index)"
          @edit="openEdit(store.activeGroup, block.index)"
        />

        <!-- 組合區塊 -->
        <div v-else class="preset-block">
          <!-- 組合標題列 -->
          <div class="preset-block-header" @click="block.collapsed = !block.collapsed">
            <span class="preset-block-toggle">
              <ChevronDown v-if="!block.collapsed" :size="13" :stroke-width="2" />
              <ChevronRight v-else :size="13" :stroke-width="2" />
            </span>
            <span class="preset-block-name">{{ block.presetName }}</span>
            <span class="preset-block-count">{{ block.items.length }} 項</span>
            <button class="preset-block-delete icon-btn" @click.stop="removePresetBlock(block)">
              <X :size="13" :stroke-width="2" />
            </button>
          </div>

          <!-- 組合內食材 -->
          <div v-if="!block.collapsed" class="preset-block-items">
            <FoodItem
              v-for="entry in block.items"
              :key="entry.index"
              :item="entry.item"
              class="preset-item"
              @remove="removeItem(entry.index)"
              @edit="openEdit(store.activeGroup, entry.index)"
            />
          </div>
        </div>

      </template>
    </div>

    <!-- 小計 -->
    <div v-if="items.length" class="subtotal">
      <div class="subtotal-nums">
        <span class="subtotal-item">熱量 <span class="subtotal-value">{{ fmt(sub.calories) }} kcal</span></span>
        <span class="subtotal-item">碳水 <span class="subtotal-value">{{ sub.carb }}g</span></span>
        <span class="subtotal-item">蛋白質 <span class="subtotal-value">{{ sub.protein }}g</span></span>
        <span class="subtotal-item">脂肪 <span class="subtotal-value">{{ sub.fat }}g</span></span>
        <span v-if="sub.fiber > 0" class="subtotal-item">膳食纖維 <span class="subtotal-value">{{ sub.fiber }}g</span></span>
      </div>
      <button class="icon-btn subtotal-clear" title="清空此群組食材" @click="clearGroup">
        <Trash2 :size="13" :stroke-width="1.5" />
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { ChevronDown, ChevronRight, X, Trash2 } from 'lucide-vue-next'
import FoodItem from './FoodItem.vue'
import { store, removeFoodFromGroup, saveState } from '../store/index.js'
import { subtotal, fmt } from '../utils/calc.js'

// ── 當前群組 items ────────────────────────────────────
const items = computed(() => store.groups[store.activeGroup] || [])
const sub   = computed(() => subtotal(items.value))

// ── 處理成區塊結構（獨立食材 or 組合區塊）────────────
// 用 Map 保留 presetId 第一次出現的順序
const collapseState = reactive({}) // { presetId: boolean }

const processedItems = computed(() => {
  const result = []
  const presetMap = new Map() // presetId → block index in result

  items.value.forEach((item, index) => {
    if (!item.presetId) {
      result.push({ type: 'item', key: `item-${index}`, item, index })
    } else {
      if (presetMap.has(item.presetId)) {
        // 加進已有的 preset block
        result[presetMap.get(item.presetId)].items.push({ item, index })
      } else {
        // 初始化 collapse state
        if (!(item.presetId in collapseState)) {
          collapseState[item.presetId] = false
        }
        const block = reactive({
          type:       'preset',
          key:        `preset-${item.presetId}`,
          presetName: item.presetName,
          presetId:   item.presetId,
          items:      [{ item, index }],
          get collapsed() { return collapseState[item.presetId] },
          set collapsed(v) { collapseState[item.presetId] = v },
        })
        presetMap.set(item.presetId, result.length)
        result.push(block)
      }
    }
  })

  return result
})

// ── 操作 ─────────────────────────────────────────────
function removeItem(index) {
  removeFoodFromGroup(store.activeGroup, index)
}

function clearGroup() {
  store.groups[store.activeGroup] = []
  saveState()
}

function openEdit(groupName, index) {
  const item = store.groups[groupName]?.[index]
  if (!item) return
  store.modal.addFood.food      = item.food
  store.modal.addFood.editMode  = true
  store.modal.addFood.groupName = groupName
  store.modal.addFood.index     = index
  store.modal.addFood.note      = item.note || ''
  store.modal.addFood.visible   = true
}

function removePresetBlock(block) {
  // 從後往前刪，避免 index 偏移
  const indices = block.items.map(e => e.index).sort((a, b) => b - a)
  indices.forEach(i => removeFoodFromGroup(store.activeGroup, i))
  delete collapseState[block.presetId]
}
</script>

<style scoped>
.subtotal {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.subtotal-nums {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-sm);
}

.subtotal-clear {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  opacity: 0.5;
  transition: all var(--duration) var(--ease);
}

.subtotal-clear:hover {
  opacity: 1;
}

.preset-block {
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius);
  margin-bottom: var(--gap-xs);
  overflow: hidden;
}

.preset-block-header {
  display: flex;
  align-items: center;
  gap: var(--gap-xs);
  padding: var(--gap-xs) var(--gap-sm);
  background: var(--c-surface);
  cursor: pointer;
  user-select: none;
}

.preset-block-toggle {
  color: var(--c-text-muted);
  display: flex;
  align-items: center;
}

.preset-block-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--c-primary);
  flex: 1;
}

.preset-block-count {
  font-size: 0.72rem;
  color: var(--c-text-muted);
}

.preset-block-delete {
  opacity: 0;
  transition: opacity var(--duration) var(--ease);
  min-width: 24px;
  min-height: 24px;
}

.preset-block:hover .preset-block-delete {
  opacity: 1;
}

.preset-block-items {
  padding: 0 var(--gap-sm);
}


.preset-item {
  padding-left: var(--gap-md);
}
</style>
