<template>
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('close')">
      <div class="modal add-diet-modal">

        <!-- Header -->
        <div class="modal-header">
          <button v-if="selectedFood" class="icon-btn" @click="selectedFood = null">
            <ChevronLeft :size="16" :stroke-width="1.5" />
          </button>
          <h2>{{ selectedFood ? selectedFood['名稱'] : '新增食物' }}</h2>
          <button class="icon-btn" @click="$emit('close')">
            <X :size="16" :stroke-width="1.5" />
          </button>
        </div>

        <!-- Tabs（食物選取狀態下隱藏） -->
        <div v-if="!selectedFood" class="modal-tabs">
          <button class="modal-tab" :class="{ active: activeTab === 'search' }" @click="activeTab = 'search'">搜尋食物</button>
          <button class="modal-tab" :class="{ active: activeTab === 'presets' }" @click="activeTab = 'presets'">常用組合</button>
        </div>

        <div class="modal-body">

          <!-- ── Tab 1：搜尋食物 ── -->
          <template v-if="activeTab === 'search' && !selectedFood">
            <div class="search-wrap">
              <input
                ref="searchEl"
                v-model="query"
                class="input"
                placeholder="搜尋食材名稱、品牌…"
                autocomplete="off"
                @input="onSearchInput"
              />
              <button v-if="query" class="icon-btn search-clear" @click="query = ''; searchResults = []">
                <X :size="14" :stroke-width="2" />
              </button>
            </div>
            <ul v-if="searchResults.length" class="search-results">
              <li
                v-for="food in searchResults"
                :key="food['名稱']"
                class="result-item"
                @click="pickFood(food)"
              >
                <div class="result-name">{{ food['名稱'] }}<span v-if="food['品牌']" class="result-brand"> · {{ food['品牌'] }}</span></div>
                <div class="result-meta">{{ food['分類'] }}<span v-if="food['每100g熱量']"> · {{ food['每100g熱量'] }} kcal/100g</span></div>
              </li>
            </ul>
            <div v-else-if="query && !searchResults.length" class="state-msg muted">找不到相符食材</div>
          </template>

          <!-- ── 食材設定（搜尋食物選中後） ── -->
          <template v-if="selectedFood">
            <div class="food-meta">
              <span v-if="selectedFood['品牌']">{{ selectedFood['品牌'] }} · </span>
              <span>{{ selectedFood['分類'] }}</span>
              <span v-if="selectedFood['每100g熱量']"> · {{ selectedFood['每100g熱量'] }} kcal/100g</span>
            </div>

            <div class="input-mode-toggle">
              <button class="toggle-btn" :class="{ active: mode === 'gram' }" @click="setMode('gram')">克數 (g)</button>
              <button class="toggle-btn" :class="{ active: mode === 'serving' }" :disabled="!selectedFood['每份量(g)']" @click="setMode('serving')">份數</button>
            </div>

            <div class="quantity-row">
              <button class="qty-btn" @click="adjustQty(-1)"><Minus :size="14" :stroke-width="2" /></button>
              <input v-model.number="quantity" type="number" class="input qty-input" min="0" :step="mode === 'gram' ? 10 : 0.5" />
              <span class="qty-unit">{{ mode === 'gram' ? 'g' : '份' }}</span>
              <button class="qty-btn" @click="adjustQty(1)"><Plus :size="14" :stroke-width="2" /></button>
            </div>

            <div v-if="foodNutrition" class="nutrition-preview">
              <div class="nutr-item"><span class="nutr-label">熱量</span><span class="nutr-val">{{ Math.round(foodNutrition.calories) }} kcal</span></div>
              <div class="nutr-item"><span class="nutr-label">碳水</span><span class="nutr-val">{{ foodNutrition.carb }}g</span></div>
              <div class="nutr-item"><span class="nutr-label">蛋白質</span><span class="nutr-val">{{ foodNutrition.protein }}g</span></div>
              <div class="nutr-item"><span class="nutr-label">脂肪</span><span class="nutr-val">{{ foodNutrition.fat }}g</span></div>
              <div class="nutr-item"><span class="nutr-label">膳食纖維</span><span class="nutr-val">{{ foodNutrition.fiber }}g</span></div>
            </div>

            <div class="field">
              <span class="field-label">備註</span>
              <input v-model="foodNote" type="text" class="input" placeholder="選填" />
            </div>
            <div class="field">
              <span class="field-label">餐別</span>
              <select v-model="selectedGroup" class="input">
                <option v-for="g in store.groupOrder" :key="g">{{ g }}</option>
              </select>
            </div>

            <button class="btn btn-primary btn-block" :disabled="submitting || quantity <= 0" @click="confirmFood">
              {{ submitting ? '加入中…' : '加入' }}
            </button>
          </template>

          <!-- ── Tab 2：常用組合 ── -->
          <template v-if="activeTab === 'presets' && !selectedFood">
            <div v-if="!store.presets.length" class="state-msg muted">還沒有常用組合</div>

            <template v-else>
              <div class="field" style="margin-bottom:8px">
                <span class="field-label">餐別</span>
                <select v-model="selectedGroup" class="input">
                  <option v-for="g in store.groupOrder" :key="g">{{ g }}</option>
                </select>
              </div>

              <div class="preset-list">
                <div v-for="(preset, pi) in store.presets" :key="pi" class="preset-card">

                  <!-- 組合標題列 -->
                  <div class="preset-row">
                    <label class="preset-check-wrap" @click.prevent="togglePreset(pi)">
                      <span class="custom-checkbox" :class="{ checked: presetStates[pi].checked }">
                        <svg v-if="presetStates[pi].checked" width="10" height="10" viewBox="0 0 10 10">
                          <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                    </label>
                    <span class="preset-name">{{ preset.name }}</span>
                    <template v-if="presetStates[pi].checked">
                      <span class="preset-servings-label">份數</span>
                      <input
                        v-model.number="presetStates[pi].servings"
                        type="number" min="0.5" step="0.5"
                        class="input preset-servings-input"
                        @click.stop
                      />
                    </template>
                    <button class="icon-btn expand-btn" @click="presetStates[pi].expanded = !presetStates[pi].expanded">
                      <ChevronDown v-if="!presetStates[pi].expanded" :size="14" :stroke-width="1.5" />
                      <ChevronUp   v-else                             :size="14" :stroke-width="1.5" />
                    </button>
                  </div>

                  <!-- 展開的個別食材 -->
                  <div v-if="presetStates[pi].expanded" class="preset-items">
                    <label
                      v-for="(item, ii) in preset.items"
                      :key="ii"
                      class="preset-item"
                      :class="{ disabled: presetStates[pi].checked }"
                      @click.prevent="!presetStates[pi].checked && toggleItem(pi, ii)"
                    >
                      <span class="custom-checkbox" :class="{ checked: presetStates[pi].itemChecks[ii], disabled: presetStates[pi].checked }">
                        <svg v-if="presetStates[pi].itemChecks[ii] && !presetStates[pi].checked" width="10" height="10" viewBox="0 0 10 10">
                          <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                      <span class="preset-item-name">{{ item.food['名稱'] }}</span>
                      <span class="preset-item-qty">{{ item.quantity }}{{ item.mode === 'serving' ? '份' : 'g' }}</span>
                    </label>
                  </div>

                </div>
              </div>

              <button
                class="btn btn-primary btn-block"
                style="margin-top:12px"
                :disabled="submitting || !hasPresetSelection"
                @click="confirmPresets"
              >
                {{ submitting ? '加入中…' : '加入' }}
              </button>
            </template>
          </template>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick } from 'vue'
import { X, ChevronLeft, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-vue-next'
import { store } from '../../store/index.js'
import { compute } from '../../utils/calc.js'
import { presetToRows } from '../../utils/export.js'
import { logDietRow } from '../../utils/api.js'
import { showToast } from '../../store/index.js'

const props = defineProps({
  date:         { type: String, required: true },  // yyyy/MM/dd
  defaultGroup: { type: String, default: '早餐' },
})
const emit = defineEmits(['close', 'added'])

// ── Tabs ──────────────────────────────────────────────
const activeTab = ref('search')

// ── 共用狀態 ──────────────────────────────────────────
const selectedGroup = ref(props.defaultGroup)
const submitting    = ref(false)
const searchEl      = ref(null)

watch(activeTab, () => {
  if (activeTab.value === 'search') nextTick(() => searchEl.value?.focus())
})

// ── 搜尋食物 ──────────────────────────────────────────
const query         = ref('')
const searchResults = ref([])
const selectedFood  = ref(null)
const mode          = ref('gram')
const quantity      = ref(100)
const foodNote      = ref('')
let   searchTimer   = null

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (!query.value.trim()) { searchResults.value = []; return }
    const q = query.value.toLowerCase()
    searchResults.value = store.foods
      .filter(f =>
        f['名稱']?.toLowerCase().includes(q) ||
        f['別名']?.toLowerCase().includes(q) ||
        f['品牌']?.toLowerCase().includes(q)
      )
      .slice(0, 15)
  }, 200)
}

function pickFood(food) {
  selectedFood.value = food
  mode.value         = 'gram'
  quantity.value     = 100
  foodNote.value     = ''
}

const foodNutrition = computed(() =>
  selectedFood.value && quantity.value > 0
    ? compute(selectedFood.value, quantity.value, mode.value)
    : null
)

function setMode(m) {
  mode.value     = m
  quantity.value = m === 'gram' ? 100 : 1
}

function adjustQty(dir) {
  const step = mode.value === 'gram' ? 10 : 0.5
  quantity.value = Math.max(0, +(quantity.value + dir * step).toFixed(1))
}

async function confirmFood() {
  if (!selectedFood.value || quantity.value <= 0 || submitting.value) return
  submitting.value = true
  try {
    const n = compute(selectedFood.value, quantity.value, mode.value)
    await logDietRow({
      日期: props.date,
      餐別: selectedGroup.value,
      時間: '',
      食品名稱: selectedFood.value['名稱'],
      份量: quantity.value,
      單位: mode.value === 'serving' ? '份' : 'g',
      熱量: Math.round(n.calories),
      蛋白質: n.protein,
      脂肪: n.fat,
      碳水: n.carb,
      纖維: n.fiber,
      備註: foodNote.value.trim(),
    })
    showToast('已加入')
    emit('added')
    // 回到搜尋狀態，方便繼續加入
    selectedFood.value = null
    query.value        = ''
    searchResults.value = []
  } catch (e) {
    showToast('加入失敗')
    console.error(e)
  } finally {
    submitting.value = false
  }
}

// ── 常用組合 ──────────────────────────────────────────
const presetStates = reactive(
  store.presets.map(p => ({
    checked:    false,
    expanded:   false,
    servings:   1,
    itemChecks: p.items.map(() => false),
  }))
)

// 當 store.presets 長度變化時補齊 presetStates（動態新增組合的情況）
watch(() => store.presets.length, (len) => {
  while (presetStates.length < len) {
    presetStates.push({
      checked: false, expanded: false, servings: 1,
      itemChecks: store.presets[presetStates.length].items.map(() => false),
    })
  }
})

function togglePreset(pi) {
  presetStates[pi].checked = !presetStates[pi].checked
  if (presetStates[pi].checked) {
    // 整組打勾，個別清除
    presetStates[pi].itemChecks = presetStates[pi].itemChecks.map(() => false)
  }
}

function toggleItem(pi, ii) {
  presetStates[pi].itemChecks[ii] = !presetStates[pi].itemChecks[ii]
}

const hasPresetSelection = computed(() =>
  presetStates.some((s, pi) =>
    s.checked || s.itemChecks.some(Boolean)
  )
)

async function confirmPresets() {
  if (!hasPresetSelection.value || submitting.value) return
  submitting.value = true

  const rows = []
  store.presets.forEach((preset, pi) => {
    const s = presetStates[pi]
    if (s.checked) {
      rows.push(...presetToRows(preset, preset.items, s.servings, selectedGroup.value, props.date, true))
    } else {
      const selected = preset.items.filter((_, ii) => s.itemChecks[ii])
      if (selected.length) {
        rows.push(...presetToRows(preset, selected, 1, selectedGroup.value, props.date, false))
      }
    }
  })

  try {
    await Promise.all(rows.map(row => logDietRow(row)))
    showToast(`已加入 ${rows.length} 筆`)
    emit('added')
    emit('close')
  } catch (e) {
    showToast('加入失敗')
    console.error(e)
  } finally {
    submitting.value = false
  }
}

// 開啟時 focus 搜尋框
nextTick(() => searchEl.value?.focus())
</script>

<style scoped>
.add-diet-modal {
  max-height: 85dvh;
  display: flex;
  flex-direction: column;
}

/* Tabs */
.modal-tabs {
  display: flex;
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}
.modal-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: none;
  font-size: 13px;
  font-family: var(--font);
  color: var(--c-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--duration) var(--ease), border-color var(--duration) var(--ease);
}
.modal-tab.active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
  font-weight: 600;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 搜尋 */
.search-wrap { position: relative; }
.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}
.search-results {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
}
.result-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--c-border-light);
  transition: background var(--duration) var(--ease);
}
.result-item:last-child { border-bottom: none; }
.result-item:hover { background: var(--c-surface); }
.result-name { font-size: 14px; font-weight: 500; }
.result-brand { color: var(--c-text-muted); font-weight: 400; }
.result-meta  { font-size: 12px; color: var(--c-text-sub, #888); margin-top: 2px; }

/* 食材設定 */
.food-meta { font-size: 12px; color: var(--c-text-sub, #888); }
.nutrition-preview {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  background: var(--c-surface);
  border-radius: var(--radius);
  padding: 8px;
}
.nutr-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.nutr-label { font-size: 10px; color: var(--c-text-muted); }
.nutr-val   { font-size: 12px; font-weight: 600; }

/* 常用組合 */
.preset-list { display: flex; flex-direction: column; gap: 8px; }
.preset-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
}
.preset-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--c-bg);
}
.preset-check-wrap { cursor: pointer; flex-shrink: 0; }
.preset-name { flex: 1; font-size: 14px; font-weight: 500; }
.preset-servings-label { font-size: 12px; color: var(--c-text-muted); flex-shrink: 0; }
.preset-servings-input { width: 56px; text-align: center; }
.expand-btn { flex-shrink: 0; }

.preset-items {
  border-top: 1px solid var(--c-border-light);
  background: var(--c-surface);
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.preset-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  cursor: pointer;
  font-size: 13px;
}
.preset-item.disabled { cursor: default; opacity: 0.45; }
.preset-item-name { flex: 1; }
.preset-item-qty  { font-size: 12px; color: var(--c-text-muted); flex-shrink: 0; }

.custom-checkbox.disabled { opacity: 0.4; }

/* 狀態訊息 */
.state-msg { text-align: center; padding: 24px 0; font-size: 14px; }
.state-msg.muted { color: var(--c-text-muted); }

/* 共用 */
.field { display: flex; align-items: center; gap: 8px; }
.field-label { font-size: 12px; color: var(--c-text-sub, #666); width: 36px; flex-shrink: 0; }
</style>
