<template>
  <!-- Header -->
  <header class="header">
    <button class="icon-btn" @click="$router.push('/')">
      <ChevronLeft :size="16" :stroke-width="1.5" />
    </button>
    <h1 class="header-title" style="position: absolute; left: 50%; transform: translateX(-50%); pointer-events: none;">食材資料庫</h1>
    <div style="display: flex; gap: var(--gap-sm); align-items: center;">
      <button class="icon-btn" :disabled="store.loading" title="重新抓資料" @click="loadFoods(true)">
        <RefreshCw :size="15" :stroke-width="1.5" :class="{ 'spin': store.loading }" />
      </button>
      <button
        class="btn"
        :class="compareMode ? 'btn-primary' : 'btn-outline'"
        style="font-size: 0.75rem; padding: 4px 10px; min-height: 28px;"
        @click="toggleCompareMode"
      >
        比較模式
      </button>
    </div>
  </header>

  <!-- 工具列 -->
  <div class="foods-toolbar">
    <div class="foods-toolbar-row">
      <select v-model="selectedCategory" class="input foods-category-select">
        <option value="">全部分類</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <div class="search-box" style="flex: 1; min-width: 0;">
        <Search class="search-icon" :size="14" :stroke-width="1.8" />
        <input
          v-model="searchInput"
          class="input search-input-with-icon"
          placeholder="搜尋食材…"
        />
        <button v-if="searchInput" class="icon-btn search-clear" @click="searchInput = ''">
          <X :size="12" :stroke-width="2" />
        </button>
      </div>
    </div>
  </div>

  <!-- 載入中 / 無資料 -->
  <div v-if="store.loading" class="foods-status-notice">載入食材資料中…</div>
  <div v-else-if="!store.foods.length" class="foods-status-notice">無法載入食材資料，請確認 API 設定或網路連線</div>

  <!-- 表格 -->
  <FoodTable
    v-else
    :style="compareMode ? 'padding-bottom: 80px' : ''"
    :foods="filteredFoods"
    :sort-field="sortField"
    :sort-dir="sortDir"
    :compare-mode="compareMode"
    :selected-ids="selectedIds"
    :basis-type="basisType"
    :basis-value="basisValue"
    :basis-display-text="basisDisplayText"
    :is-default="isDefault"
    @sort="onSort"
    @add="openAddFood"
    @toggle-select="toggleSelect"
    @edit-basis="basisModalVisible = true"
  />

  <!-- 比較底列 -->
  <FoodCompareBar
    v-if="compareMode"
    :count="selectedIds.size"
    @compare="openCompare"
  />

  <!-- AddFoodModal（重用） -->
  <AddFoodModal />

  <!-- 比較 Modal -->
  <FoodCompareModal
    v-if="compareVisible"
    :foods="selectedFoodObjects"
    :initial-basis-type="basisType"
    :initial-basis-val="basisValue"
    @close="compareVisible = false"
  />

  <!-- 基準設定 Modal -->
  <Teleport to="body">
    <div v-if="basisModalVisible" class="overlay" @click.self="basisModalVisible = false">
      <div class="modal" style="max-width: 300px;">
        <div class="modal-header">
          <h2>設定基準</h2>
          <button class="icon-btn" @click="basisModalVisible = false">
            <X :size="16" :stroke-width="1.5" />
          </button>
        </div>
        <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--gap-md);">
          <select v-model="draftType" class="input">
            <option value="gram">固定克數 (g)</option>
            <option value="calories">固定熱量 (kcal)</option>
            <option value="protein">固定蛋白質 (g)</option>
            <option value="carb">固定碳水 (g)</option>
            <option value="fat">固定脂肪 (g)</option>
          </select>
          <div style="display: flex; align-items: center; gap: var(--gap-sm);">
            <input
              v-model.number="draftValue"
              type="number"
              class="input"
              style="flex: 1;"
              min="1"
            />
            <span class="foods-basis-label">{{ draftType === 'calories' ? 'kcal' : 'g' }}</span>
          </div>
          <div style="display: flex; gap: var(--gap-sm); justify-content: flex-end;">
            <button class="btn btn-outline" @click="resetBasis">重設</button>
            <button class="btn btn-primary" @click="applyBasis">套用</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ChevronLeft, X, Search, Pencil, RefreshCw } from 'lucide-vue-next'
import { store } from '../store/index.js'
import { loadFoods } from '../utils/api.js'
import FoodTable       from '../components/foods/FoodTable.vue'
import FoodCompareBar  from '../components/foods/FoodCompareBar.vue'
import FoodCompareModal from '../components/modals/FoodCompareModal.vue'
import AddFoodModal    from '../components/modals/AddFoodModal.vue'

// ── 基準設定 ───────────────────────────────────────────
const basisType  = ref('gram')
const basisValue = ref(100)
const isDefault  = computed(() => basisType.value === 'gram' && basisValue.value === 100)

const BASIS_LABELS = { gram: '克數', calories: '熱量', protein: '蛋白質', carb: '碳水', fat: '脂肪' }
const basisUnit = computed(() => basisType.value === 'calories' ? 'kcal' : 'g')
const basisDisplayText = computed(() =>
  `每 ${basisValue.value}${basisUnit.value}（${BASIS_LABELS[basisType.value]}）`
)

const basisModalVisible = ref(false)
const draftType  = ref('gram')
const draftValue = ref(100)

watch(basisModalVisible, (v) => {
  if (v) { draftType.value = basisType.value; draftValue.value = basisValue.value }
})

function applyBasis() {
  basisType.value  = draftType.value
  basisValue.value = draftValue.value || 100
  basisModalVisible.value = false
}
function resetBasis() {
  draftType.value  = 'gram'
  draftValue.value = 100
}

// ── 初始化：確保資料已載入（API 優先，失敗才 fallback）────
onMounted(() => {
  if (!store.foods.length) loadFoods()
})

// ── 搜尋 ──────────────────────────────────────────────
const searchInput    = ref('')
const searchTerm     = ref('')
const selectedCategory = ref('')

let debounceTimer = null
watch(searchInput, (v) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { searchTerm.value = v.trim() }, 300)
})

// ── 分類清單 ──────────────────────────────────────────
const categories = computed(() => {
  const set = new Set(store.foods.map(f => f['分類']).filter(Boolean))
  return [...set].sort()
})

// ── 排序 ──────────────────────────────────────────────
const sortField = ref('')
const sortDir   = ref('')

const SORT_KEY_MAP = {
  calories: '每 100g 熱量',
  carb:     '每 100g 碳水',
  protein:  '每 100g 蛋白質',
  fat:      '每 100g 脂肪',
}

function onSort(field) {
  if (sortField.value !== field) {
    sortField.value = field
    sortDir.value   = 'asc'
  } else if (sortDir.value === 'asc') {
    sortDir.value = 'desc'
  } else {
    sortField.value = ''
    sortDir.value   = ''
  }
}

// ── 過濾 + 排序 ────────────────────────────────────────
const filteredFoods = computed(() => {
  let list = store.foods

  if (searchTerm.value) {
    const q = searchTerm.value.toLowerCase()
    list = list.filter(f =>
      (f['名稱'] || '').toLowerCase().includes(q) ||
      (f['品牌'] || '').toLowerCase().includes(q) ||
      (f['別名'] || '').toLowerCase().includes(q)
    )
  }

  if (selectedCategory.value) {
    list = list.filter(f => f['分類'] === selectedCategory.value)
  }

  if (sortField.value && sortDir.value) {
    const key = SORT_KEY_MAP[sortField.value]
    list = [...list].sort((a, b) => {
      const av = parseFloat(a[key]) || 0
      const bv = parseFloat(b[key]) || 0
      return sortDir.value === 'asc' ? av - bv : bv - av
    })
  } else {
    // 預設：更新日期新的在前
    list = [...list].sort((a, b) => {
      const ad = a['更新日期'] || ''
      const bd = b['更新日期'] || ''
      return bd.localeCompare(ad)
    })
  }

  return list
})

// ── 加入計算頁 ─────────────────────────────────────────
function openAddFood(food) {
  store.modal.addFood.food    = food
  store.modal.addFood.visible = true
}

// ── 比較模式 ───────────────────────────────────────────
const compareMode    = ref(false)
const selectedIds    = ref(new Set())
const compareVisible = ref(false)

function toggleCompareMode() {
  compareMode.value = !compareMode.value
  if (!compareMode.value) selectedIds.value = new Set()
}

function toggleSelect(food) {
  const name = food['名稱']
  const cur  = new Set(selectedIds.value)
  if (cur.has(name)) {
    cur.delete(name)
  } else if (cur.size < 5) {
    cur.add(name)
  }
  selectedIds.value = cur
}

const selectedFoodObjects = computed(() =>
  [...selectedIds.value]
    .map(name => store.foods.find(f => f['名稱'] === name))
    .filter(Boolean)
)

function openCompare() {
  if (selectedIds.value.size < 2) return
  compareVisible.value = true
}
</script>
