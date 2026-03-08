<template>
  <Teleport to="body">
    <div v-if="modal.export.visible" class="overlay" @click.self="close">
      <div class="modal export-modal">
        <div class="modal-header">
          <h2>{{ configured ? '寫入飲食記錄' : '複製飲食記錄' }}</h2>
          <button class="icon-btn" @click="close"><X :size="16" :stroke-width="1.5" /></button>
        </div>

        <div class="modal-body">

          <!-- ── 已設定 API：寫入模式 ── -->
          <template v-if="configured">

            <!-- 預覽 -->
            <div class="preview-label">預覽（{{ rows.length }} 筆）</div>
            <div class="preview-table">
              <div v-for="(row, i) in rows" :key="i" class="preview-row">
                <span class="meal-badge">{{ row.餐別 }}</span>
                <span class="preview-name">{{ row.食品名稱 }}</span>
                <span class="preview-kcal">{{ row.熱量 }} kcal</span>
                <span v-if="row.備註" class="preview-note">{{ row.備註 }}</span>
              </div>
            </div>

            <!-- 用餐時間（可展收） -->
            <button class="time-toggle" @click="showTimes = !showTimes">
              <span>用餐時間</span>
              <ChevronDown :size="14" :style="{ transform: showTimes ? 'rotate(180deg)' : '', transition: 'transform .2s' }" />
            </button>
            <div v-if="showTimes" class="time-list">
              <div v-for="g in activeGroups" :key="g" class="time-row">
                <span class="time-label">{{ g }}</span>
                <input type="time" v-model="mealTimes[g]" class="time-input" />
              </div>
            </div>

            <!-- 日期選擇 -->
            <div class="preview-label" style="margin-top:14px">選擇日期</div>
            <div class="date-list">
              <label v-for="d in quickDates" :key="d.value" class="date-option" @click="toggleDate(d.value)">
                <span class="custom-checkbox" :class="{ checked: selectedDates.includes(d.value) }">
                  <svg v-if="selectedDates.includes(d.value)" width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <span>{{ d.label }}</span>
              </label>
              <label v-for="d in extraDates" :key="d" class="date-option" @click="toggleDate(d)">
                <span class="custom-checkbox" :class="{ checked: selectedDates.includes(d) }">
                  <svg v-if="selectedDates.includes(d)" width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <span>{{ d }}</span>
              </label>
            </div>
            <div class="date-add-row">
              <input type="date" v-model="extraDateInput" class="date-input" />
              <button class="btn btn-ghost btn-sm" @click="addExtraDate" :disabled="!extraDateInput">加入</button>
            </div>

            <button
              class="btn btn-primary btn-block"
              style="margin-top:14px"
              :disabled="!selectedDates.length || !rows.length || writing"
              @click="write"
            >
              {{ writing
                ? `寫入中...`
                : `寫入記錄（${selectedDates.length} 天 × ${rows.length} 筆）` }}
            </button>
          </template>

          <!-- ── 未設定 API：複製模式 ── -->
          <template v-else>
            <textarea :value="text" class="export-textarea" readonly />
            <button class="btn btn-primary btn-block" @click="copy">複製到剪貼簿</button>
          </template>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, reactive, watch } from 'vue'
import { X, ChevronDown } from 'lucide-vue-next'
import { store, isConfigured, showToast, showConfirm } from '../../store/index.js'
import { generateExport, generateDietRows, MEAL_TIMES } from '../../utils/export.js'
import { logDietRow } from '../../utils/api.js'

const modal = store.modal
const configured = computed(() => isConfigured())

// ── 共用資料 ──────────────────────────────────────────
const rows = computed(() =>
  modal.export.visible ? generateDietRows(store.groups, store.groupOrder) : []
)
const text = computed(() =>
  modal.export.visible ? generateExport(store.groups, store.groupOrder) : ''
)

// ── 寫入模式 ─────────────────────────────────────────
function fmtDate(d) {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function nowTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function quickDateEntry(daysOffset) {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  const value = fmtDate(d)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const prefix = daysOffset === 0 ? '今天' : daysOffset === 1 ? '明天' : '昨天'
  return { value, label: `${prefix} ${value.slice(5)} (${weekdays[d.getDay()]})` }
}

const quickDates = [quickDateEntry(1), quickDateEntry(0), quickDateEntry(-1)]
const selectedDates = ref([fmtDate(new Date())])
const extraDateInput = ref('')
const extraDates = ref([])
const writing = ref(false)
const showTimes = ref(false)

// 用餐時間（每個餐別一個，可編輯）
const mealTimes = reactive({})
const activeGroups = computed(() => [...new Set(rows.value.map(r => r.餐別))])

// 每次開啟 modal 時重設狀態
watch(() => modal.export.visible, v => {
  if (!v) return
  selectedDates.value = [fmtDate(new Date())]
  extraDateInput.value = ''
  extraDates.value = []
  writing.value = false
  // 初始化用餐時間
  const nowStr = nowTimeStr()
  for (const g of store.groupOrder) {
    if (store.groups[g]?.length) {
      mealTimes[g] = MEAL_TIMES[g] || nowStr
    }
  }
})

function toggleDate(val) {
  const idx = selectedDates.value.indexOf(val)
  if (idx >= 0) selectedDates.value.splice(idx, 1)
  else selectedDates.value.push(val)
}

function addExtraDate() {
  if (!extraDateInput.value) return
  const converted = extraDateInput.value.replace(/-/g, '/')
  const all = [...quickDates.map(d => d.value), ...extraDates.value]
  if (!all.includes(converted)) {
    extraDates.value.push(converted)
    if (!selectedDates.value.includes(converted)) selectedDates.value.push(converted)
  }
  extraDateInput.value = ''
}

async function write() {
  if (!selectedDates.value.length || !rows.value.length || writing.value) return

  const total = selectedDates.value.length * rows.value.length
  const ok = await showConfirm(
    `確定寫入 ${selectedDates.value.length} 天 × ${rows.value.length} 筆，共 ${total} 筆記錄？`
  )
  if (!ok) return

  writing.value = true

  // 並行送出所有請求
  const results = await Promise.all(
    selectedDates.value.flatMap(date =>
      rows.value.map(row =>
        logDietRow({ ...row, 日期: date, 時間: mealTimes[row.餐別] || row.時間 })
          .then(() => true)
          .catch(e => { console.error(e); return false })
      )
    )
  )

  writing.value = false
  const success = results.filter(Boolean).length
  const fail = results.length - success

  if (fail === 0) {
    showToast(`已寫入 ${success} 筆記錄`)
    close()
  } else {
    showToast(`寫入完成：${success} 筆成功，${fail} 筆失敗`)
  }
}

// ── 複製模式 ─────────────────────────────────────────
async function copy() {
  try {
    await navigator.clipboard.writeText(text.value)
    showToast('已複製到剪貼簿')
  } catch {
    const el = document.createElement('textarea')
    el.value = text.value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    showToast('已複製到剪貼簿')
  }
}

function close() { modal.export.visible = false }
</script>

<style scoped>
.export-modal { max-height: 90dvh; display: flex; flex-direction: column; }
.modal-body   { overflow-y: auto; }

/* 預覽區 */
.preview-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text-sub, #666);
  margin-bottom: 6px;
  letter-spacing: .04em;
}
.preview-table {
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow-y: auto;
  max-height: 240px;
}
.preview-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  padding: 7px 10px;
  font-size: 13px;
  border-bottom: 1px solid var(--c-border);
}
.preview-row:last-child { border-bottom: none; }
.meal-badge {
  font-size: 11px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 4px;
  padding: 1px 5px;
  white-space: nowrap;
}
.preview-name { font-weight: 500; }
.preview-kcal { color: var(--c-primary); font-size: 12px; margin-left: auto; }
.preview-note {
  width: 100%;
  font-size: 11px;
  color: var(--c-text-sub, #888);
  padding-left: 2px;
  word-break: break-all;
}

/* 用餐時間 */
.time-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 12px 0 6px;
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text-sub, #666);
  letter-spacing: .04em;
  cursor: pointer;
}
.time-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 4px;
}
.time-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.time-label {
  font-size: 13px;
  width: 36px;
  flex-shrink: 0;
}
.time-input {
  padding: 4px 8px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  font-size: 13px;
  background: #fff;
}

/* 日期選擇 */
.date-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.date-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
}
.date-add-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.date-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  font-size: 13px;
  background: #fff;
}
.btn-sm { padding: 6px 12px; font-size: 13px; }

/* 複製模式 textarea */
.export-textarea {
  width: 100%;
  height: 260px;
  resize: vertical;
  font-size: 12px;
  font-family: monospace;
  padding: 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  margin-bottom: 10px;
  box-sizing: border-box;
}
</style>
