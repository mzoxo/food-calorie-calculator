<template>
  <div class="diet-view">

    <!-- Header -->
    <header class="header">
      <button class="icon-btn" @click="$router.push('/')">
        <ChevronLeft :size="16" :stroke-width="1.5" />
      </button>
      <h1 class="header-title" style="position:absolute;left:50%;transform:translateX(-50%);pointer-events:none">飲食記錄</h1>
      <div style="width:32px" />
    </header>

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

    <!-- 主內容 -->
    <div class="diet-content">

      <div v-if="loading" class="state-msg">載入中…</div>

      <div v-else-if="!records.length" class="state-msg muted">這天沒有飲食記錄</div>

      <template v-else>
        <!-- 當日總計 -->
        <div class="day-total">
          <span class="total-kcal">{{ Math.round(dayTotal.calories) }} kcal</span>
          <span class="total-macro">碳水 {{ dayTotal.carb }}g</span>
          <span class="total-macro">蛋白質 {{ dayTotal.protein }}g</span>
          <span class="total-macro">脂肪 {{ dayTotal.fat }}g</span>
        </div>

        <!-- 記錄列表 -->
        <div class="record-list">
          <div v-for="rec in records" :key="rec.列號" class="record-card">

            <!-- 一般顯示 -->
            <div v-if="editingRow !== rec.列號" class="record-row">
              <span class="meal-badge">{{ rec.餐別 }}</span>
              <div class="record-body">
                <div class="record-name">{{ rec.食品名稱 }}</div>
                <div class="record-sub">
                  {{ rec.份量 }}{{ rec.單位 }}
                  <template v-if="rec.時間"> · {{ rec.時間 }}</template>
                  · {{ Math.round(rec.熱量) }} kcal
                  <template v-if="rec.備註"> · {{ rec.備註 }}</template>
                </div>
              </div>
              <div class="record-actions">
                <button class="icon-btn" @click="startEdit(rec)">
                  <Pencil :size="14" :stroke-width="1.5" />
                </button>
                <button class="icon-btn danger-btn" @click="deleteRecord(rec)">
                  <Trash2 :size="14" :stroke-width="1.5" />
                </button>
              </div>
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
              <div v-if="matchedFood" class="form-hint">
                已比對食材庫，修改份量自動重算
              </div>
              <div v-else class="form-hint warn">
                未比對到食材庫，請手動填入營養素
              </div>

              <div class="form-actions">
                <button class="btn btn-ghost" @click="cancelEdit">取消</button>
                <button class="btn btn-primary" @click="saveEdit" :disabled="saving">
                  {{ saving ? '儲存中…' : '儲存' }}
                </button>
              </div>
            </div>

          </div>
        </div>
      </template>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-vue-next'
import { store, showToast, showConfirm } from '../store/index.js'
import { fetchDiet, updateDietRow, deleteDietRow, loadFoods } from '../utils/api.js'
import { compute } from '../utils/calc.js'

// ── 日期 ──────────────────────────────────────────────
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toApiDate(s) { return s.replace(/-/g, '/') }

const dateInput = ref(todayStr())

function shiftDate(days) {
  const d = new Date(dateInput.value)
  d.setDate(d.getDate() + days)
  dateInput.value = d.toISOString().slice(0, 10)
  load()
}

// ── 記錄 ──────────────────────────────────────────────
const records = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  cancelEdit()
  try {
    records.value = await fetchDiet(toApiDate(dateInput.value))
  } catch (e) {
    showToast('載入失敗')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const dayTotal = computed(() => {
  const r = v => Math.round(parseFloat(v) * 10) / 10 || 0
  return records.value.reduce((acc, rec) => {
    acc.calories += r(rec.熱量)
    acc.carb     += r(rec.碳水)
    acc.protein  += r(rec.蛋白質)
    acc.fat      += r(rec.脂肪)
    return acc
  }, { calories: 0, carb: 0, protein: 0, fat: 0 })
})

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
    熱量:     parseFloat(rec.熱量) || 0,
    碳水:     parseFloat(rec.碳水) || 0,
    蛋白質:   parseFloat(rec.蛋白質) || 0,
    脂肪:     parseFloat(rec.脂肪) || 0,
    纖維:     parseFloat(rec.纖維) || 0,
  })
  matchedFood.value = store.foods.find(f => f['名稱'] === rec.食品名稱) || null
}

function recalc() {
  if (!matchedFood.value) return
  const mode = editData.單位 === '份' ? 'serving' : 'gram'
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

// ── 初始化 ────────────────────────────────────────────
if (!store.foods.length) loadFoods()
load()
</script>

<style scoped>
/* 日期列 */
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

.state-msg {
  text-align: center;
  padding: 48px 0;
  font-size: 14px;
}
.state-msg.muted { color: var(--c-text-muted, #aaa); }

/* 總計 */
.day-total {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: baseline;
  padding: 10px 12px;
  background: var(--c-surface);
  border-radius: var(--radius);
  margin-bottom: 10px;
  font-size: 13px;
}
.total-kcal { font-weight: 600; font-size: 15px; color: var(--c-primary); }
.total-macro { color: var(--c-text-sub, #666); }

/* 記錄卡片 */
.record-list { display: flex; flex-direction: column; gap: 8px; }
.record-card {
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
}

/* 一般顯示列 */
.record-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 10px 12px;
}
.meal-badge {
  font-size: 11px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 4px;
  padding: 2px 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.record-body { flex: 1; min-width: 0; }
.record-name { font-size: 14px; font-weight: 500; }
.record-sub  { font-size: 12px; color: var(--c-text-sub, #888); margin-top: 1px; }
.record-actions { display: flex; gap: 4px; flex-shrink: 0; }
.danger-btn { color: var(--c-danger, #e53e3e); }

/* 編輯表單 */
.record-form {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--c-surface);
}
.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
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

/* 營養素 */
.nutr-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.nutr-item { display: flex; flex-direction: column; gap: 3px; }
.nutr-label { font-size: 11px; color: var(--c-text-sub, #888); }
.nutr-input { text-align: right; }
.nutr-input.readonly { background: var(--c-surface); color: var(--c-text-sub, #888); }

.form-hint {
  font-size: 11px;
  color: var(--c-text-sub, #888);
}
.form-hint.warn { color: var(--c-danger, #e53e3e); }

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}
</style>
