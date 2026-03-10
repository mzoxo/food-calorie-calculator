<template>
  <!-- Header -->
  <AppHeader @menu="onMenuToggle" />

  <!-- 右上角選單 -->
  <AppMenu
    :visible="menuVisible"
    :anchor="menuAnchor"
    @close="menuVisible = false"
    @open-profile="openModal('profile')"
    @refresh="onRefresh"
    @clear-all="() => {}"
  />

  <!-- 主內容 -->
  <main class="main">

    <!-- 日期導覽列 -->
    <div class="date-bar">
      <button class="icon-btn" @click="shiftDate(-1)">
        <ChevronLeft :size="16" :stroke-width="1.5" />
      </button>
      <input type="date" v-model="dateInput" class="date-input" @change="load" />
      <button class="icon-btn" @click="shiftDate(1)">
        <ChevronRight :size="16" :stroke-width="1.5" />
      </button>
    </div>

    <!-- BMR/TDEE 進度條（借用 NutritionTotal 的 bmr-panel 邏輯，獨立顯示） -->
    <BmrPanel :calories="dayTotal.calories" />

    <!-- 餐別 Tabs -->
    <GroupTabs
      v-model="activeGroup"
      :counts="tabCounts"
      :readonly="true"
    />

    <!-- 當餐小計 header -->
    <div v-if="mealTotal.calories > 0" class="meal-summary">
      <span class="meal-summary-name">{{ activeGroup }}</span>
      <span class="meal-summary-kcal">{{ fmt(mealTotal.calories) }} kcal</span>
      <span class="meal-summary-macro">碳 {{ mealTotal.carb }}g</span>
      <span class="meal-summary-macro">蛋 {{ mealTotal.protein }}g</span>
      <span class="meal-summary-macro">脂 {{ mealTotal.fat }}g</span>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="state-msg">載入中…</div>

    <!-- 空餐別 -->
    <div v-else-if="!mealRecords.length" class="state-msg muted">這餐還沒有記錄</div>

    <!-- 記錄列表（格式同 FoodItem） -->
    <div v-else class="group-items">
      <div v-for="rec in mealRecords" :key="rec.列號">

        <!-- 一般顯示 -->
        <div v-if="editingRow !== rec.列號" class="food-item">
          <div class="food-item-info">
            <div class="food-item-name">
              {{ rec.食品名稱 }}
              <button class="icon-btn name-edit-btn" @click="startEdit(rec)">
                <Pencil :size="14" :stroke-width="1.5" />
              </button>
            </div>
            <div class="food-item-detail">
              {{ rec.份量 }}{{ rec.單位 }}
              · 碳 {{ round1(rec.碳水) }}g
              · 蛋 {{ round1(rec.蛋白質) }}g
              · 脂 {{ round1(rec.脂肪) }}g
              <template v-if="parseFloat(rec.纖維) > 0"> · 纖 {{ round1(rec.纖維) }}g</template>
            </div>
            <div v-if="rec.備註" class="food-item-note">{{ rec.備註 }}</div>
          </div>
          <span class="food-item-cal">{{ fmt(parseFloat(rec.熱量)) }} kcal</span>
          <button class="icon-btn food-item-remove" @click="deleteRecord(rec)">
            <X :size="14" :stroke-width="2" />
          </button>
        </div>

        <!-- 編輯表單 -->
        <div v-else class="record-form">
          <div class="form-row">
            <label class="form-label">食品名稱</label>
            <input v-model="editData.食品名稱" class="input form-input" />
          </div>
          <div class="form-row">
            <label class="form-label">份量</label>
            <div class="qty-row">
              <input v-model.number="editData.份量" type="number" min="0" step="0.5"
                class="input qty-input" @input="recalc" />
              <select v-model="editData.單位" class="input unit-select" @change="recalc">
                <option>g</option>
                <option>ml</option>
                <option>份</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">餐別</label>
            <select v-model="editData.餐別" class="input form-input">
              <option v-for="g in store.groupOrder" :key="g">{{ g }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">時間</label>
            <input v-model="editData.時間" type="time" class="input form-input" />
          </div>
          <div class="form-row">
            <label class="form-label">備註</label>
            <input v-model="editData.備註" class="input form-input" />
          </div>

          <!-- 營養素 -->
          <div class="nutr-grid">
            <div class="nutr-item">
              <span class="nutr-label">熱量</span>
              <input v-model.number="editData.熱量" type="number" class="input nutr-input"
                :class="{ readonly: !!matchedFood }" :readonly="!!matchedFood" />
            </div>
            <div class="nutr-item">
              <span class="nutr-label">碳水</span>
              <input v-model.number="editData.碳水" type="number" class="input nutr-input"
                :class="{ readonly: !!matchedFood }" :readonly="!!matchedFood" />
            </div>
            <div class="nutr-item">
              <span class="nutr-label">蛋白質</span>
              <input v-model.number="editData.蛋白質" type="number" class="input nutr-input"
                :class="{ readonly: !!matchedFood }" :readonly="!!matchedFood" />
            </div>
            <div class="nutr-item">
              <span class="nutr-label">脂肪</span>
              <input v-model.number="editData.脂肪" type="number" class="input nutr-input"
                :class="{ readonly: !!matchedFood }" :readonly="!!matchedFood" />
            </div>
          </div>
          <div v-if="matchedFood" class="form-hint">已比對食材庫，修改份量自動重算</div>
          <div v-else class="form-hint warn">未比對到食材庫，請手動填入營養素</div>

          <div class="form-actions">
            <button class="btn btn-ghost" @click="cancelEdit">取消</button>
            <button class="btn btn-primary" @click="saveEdit" :disabled="saving">
              {{ saving ? '儲存中…' : '儲存' }}
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- 總計圓圈（BMR 已由上方 BmrPanel 顯示，此處隱藏） -->
    <NutritionTotal :records="records" :hide-bmr="true" />

  </main>

  <!-- 浮動新增按鈕 -->
  <button class="fab" @click="openAddModal">
    <Plus :size="22" :stroke-width="2" />
  </button>

  <!-- 彈窗 -->
  <ProfileModal />
  <AddDietFoodModal
    v-if="showAddModal"
    :date="apiDate"
    :default-group="activeGroup"
    @close="showAddModal = false"
    @added="onRecordAdded"
  />
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ChevronLeft, ChevronRight, Pencil, X, Plus } from 'lucide-vue-next'
import AppHeader      from '../components/AppHeader.vue'
import AppMenu        from '../components/AppMenu.vue'
import GroupTabs      from '../components/GroupTabs.vue'
import NutritionTotal from '../components/NutritionTotal.vue'
import BmrPanel       from '../components/BmrPanel.vue'
import ProfileModal   from '../components/modals/ProfileModal.vue'
import AddDietFoodModal from '../components/modals/AddDietFoodModal.vue'

import { store, openModal, loadState, showToast, showConfirm } from '../store/index.js'
import { fetchDiet, updateDietRow, deleteDietRow, loadFoods } from '../utils/api.js'
import { compute, fmt } from '../utils/calc.js'

// ── 選單 ──────────────────────────────────────────────
const menuVisible = ref(false)
const menuAnchor  = ref(null)
function onMenuToggle(rect) {
  menuAnchor.value  = rect
  menuVisible.value = !menuVisible.value
}
async function onRefresh() {
  menuVisible.value = false
  await loadFoods(true)
}

// ── 日期 ──────────────────────────────────────────────
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dateInput = ref(todayStr())
const apiDate   = computed(() => dateInput.value.replace(/-/g, '/'))

function shiftDate(days) {
  const d = new Date(dateInput.value)
  d.setDate(d.getDate() + days)
  dateInput.value = d.toISOString().slice(0, 10)
  load()
}

// ── 餐別 Tab ──────────────────────────────────────────
const activeGroup = ref(store.groupOrder[0] || '早餐')

const tabCounts = computed(() => {
  const map = {}
  store.groupOrder.forEach(g => {
    map[g] = records.value.filter(r => r.餐別 === g).length
  })
  return map
})

// ── 記錄 ──────────────────────────────────────────────
const records = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  cancelEdit()
  try {
    records.value = await fetchDiet(apiDate.value)
  } catch (e) {
    showToast('載入失敗')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const mealRecords = computed(() =>
  records.value.filter(r => r.餐別 === activeGroup.value)
)

const mealTotal = computed(() => {
  const s = mealRecords.value.reduce((acc, rec) => {
    acc.calories += parseFloat(rec.熱量)  || 0
    acc.carb     += parseFloat(rec.碳水)  || 0
    acc.protein  += parseFloat(rec.蛋白質) || 0
    acc.fat      += parseFloat(rec.脂肪)  || 0
    return acc
  }, { calories: 0, carb: 0, protein: 0, fat: 0 })
  return {
    calories: Math.round(s.calories),
    carb:     Math.round(s.carb    * 10) / 10,
    protein:  Math.round(s.protein * 10) / 10,
    fat:      Math.round(s.fat     * 10) / 10,
  }
})

const dayTotal = computed(() => ({
  calories: Math.round(records.value.reduce((s, rec) => s + (parseFloat(rec.熱量) || 0), 0))
}))

function round1(v) { return Math.round((parseFloat(v) || 0) * 10) / 10 }

// ── 編輯 ──────────────────────────────────────────────
const editingRow  = ref(null)
const matchedFood = ref(null)
const saving      = ref(false)
const editData    = reactive({
  食品名稱: '', 份量: 0, 單位: 'g', 餐別: '',
  時間: '', 備註: '', 熱量: 0, 碳水: 0, 蛋白質: 0, 脂肪: 0, 纖維: 0,
})

function startEdit(rec) {
  editingRow.value = rec.列號
  Object.assign(editData, {
    食品名稱: rec.食品名稱,
    份量:     parseFloat(rec.份量) || 0,
    單位:     rec.單位 || 'g',
    餐別:     rec.餐別,
    時間:     rec.時間 || '',
    備註:     rec.備註 || '',
    熱量:     parseFloat(rec.熱量)  || 0,
    碳水:     parseFloat(rec.碳水)  || 0,
    蛋白質:   parseFloat(rec.蛋白質) || 0,
    脂肪:     parseFloat(rec.脂肪)  || 0,
    纖維:     parseFloat(rec.纖維)  || 0,
  })
  matchedFood.value = store.foods.find(f => f['名稱'] === rec.食品名稱)
    ?? store.foods.find(f => f['品牌'] && `${f['品牌']} ${f['名稱']}` === rec.食品名稱)
    ?? store.foods.find(f => f['品牌'] && rec.食品名稱.includes(f['名稱']) && rec.食品名稱.includes(f['品牌']))
    ?? null
}

function recalc() {
  if (!matchedFood.value) return
  const mode = editData.單位 === '份' ? 'serving' : 'gram'  // ml 視為 gram（密度≈1）
  const n = compute(matchedFood.value, editData.份量 || 0, mode)
  editData.熱量   = Math.round(n.calories)
  editData.碳水   = n.carb
  editData.蛋白質 = n.protein
  editData.脂肪   = n.fat
  editData.纖維   = n.fiber
}

function cancelEdit() {
  editingRow.value  = null
  matchedFood.value = null
}

async function saveEdit() {
  saving.value = true
  try {
    await updateDietRow(editingRow.value, { ...editData })
    const idx = records.value.findIndex(r => r.列號 === editingRow.value)
    if (idx >= 0) Object.assign(records.value[idx], editData)
    cancelEdit()
    showToast('已儲存')
  } catch (e) {
    showToast('儲存失敗')
    console.error(e)
  } finally {
    saving.value = false
  }
}

async function deleteRecord(rec) {
  const ok = await showConfirm(`確定刪除「${rec.食品名稱}」？`)
  if (!ok) return
  try {
    await deleteDietRow(rec.列號)
    records.value = records.value.filter(r => r.列號 !== rec.列號)
    showToast('已刪除')
  } catch (e) {
    showToast('刪除失敗')
    console.error(e)
  }
}

// ── 新增 Modal ────────────────────────────────────────
const showAddModal = ref(false)
function openAddModal() { showAddModal.value = true }

function onRecordAdded() {
  load()
}

// ── 初始化 ────────────────────────────────────────────
if (!store.groupOrder.length) loadState()
if (!store.foods.length) loadFoods()
load()
</script>

<style scoped>
/* 日期列 */
.date-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 0;
}
.date-input {
  flex: 1;
  text-align: center;
  border: none;
  background: none;
  font-size: 15px;
  font-weight: 500;
  color: var(--c-text);
  cursor: pointer;
}

/* 當餐小計 */
.meal-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  padding: 6px 0 4px;
  font-size: 13px;
}
.meal-summary-name { font-weight: 600; color: var(--c-text); }
.meal-summary-kcal { font-weight: 600; color: var(--c-primary); }
.meal-summary-macro { color: var(--c-text-sub, #666); }

/* 記錄列（FoodItem 格式） */
.group-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.name-edit-btn {
  opacity: 0.25;
  color: var(--c-text-muted);
  padding: 0;
  min-width: unset;
  min-height: unset;
  transition: opacity var(--duration) var(--ease);
}
.name-edit-btn svg { width: 12px; height: 12px; }
.food-item:hover .name-edit-btn { opacity: 0.6; }

/* 編輯表單 */
.record-form {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--c-surface);
  border-radius: var(--radius);
  margin: 4px 0;
}
.form-row { display: flex; align-items: center; gap: 8px; }
.form-label {
  font-size: 12px;
  color: var(--c-text-sub, #666);
  width: 48px;
  flex-shrink: 0;
}
.form-input { flex: 1; }
.qty-row { display: flex; gap: 6px; flex: 1; }
.qty-input { flex: 1; }
.unit-select { width: 58px; }
.nutr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.nutr-item { display: flex; flex-direction: column; gap: 3px; }
.nutr-label { font-size: 11px; color: var(--c-text-sub, #888); }
.nutr-input { text-align: right; }
.nutr-input.readonly { background: var(--c-surface); color: var(--c-text-sub, #888); }
.form-hint { font-size: 11px; color: var(--c-text-sub, #888); }
.form-hint.warn { color: var(--c-danger, #e53e3e); }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }

/* 狀態訊息 */
.state-msg { text-align: center; padding: 32px 0; font-size: 14px; }
.state-msg.muted { color: var(--c-text-muted, #aaa); }

/* 浮動按鈕 */
.fab {
  position: fixed;
  bottom: 24px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: background var(--duration) var(--ease), transform var(--duration) var(--ease);
  z-index: 10;
}
.fab:hover { background: var(--c-primary-dark, #3d5c4a); transform: scale(1.05); }
</style>
