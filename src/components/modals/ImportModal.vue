<template>
  <Teleport to="body">
    <div v-if="modal.import.visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h2>匯入飲食記錄</h2>
          <button class="icon-btn" @click="close"><X :size="16" :stroke-width="1.5" /></button>
        </div>
        <div class="modal-body import-modal-body">
          <!-- 日期 + 查詢 -->
          <div class="import-date-row">
            <input v-model="date" type="date" class="input" style="flex:1" />
            <button class="btn btn-primary" :disabled="loading" @click="query">查詢</button>
          </div>

          <!-- 可捲動的結果區 -->
          <div class="import-scroll">
            <!-- 載入中 -->
            <div v-if="loading" class="notice">查詢中…</div>

            <!-- 結果 -->
            <div v-if="records.length" class="import-records">
              <div v-for="(group, meal) in groupedRecords" :key="meal" class="import-meal-group">
                <div class="import-meal-label">{{ meal }}</div>
                <div
                  v-for="(rec, i) in group"
                  :key="i"
                  class="import-record-item"
                >
                  <div class="import-record-info">
                    <div class="import-record-name">{{ rec['食品名稱'] }}</div>
                    <div class="import-record-detail">
                      {{ rec['份量'] }}{{ rec['單位'] }} · 碳{{ rec['碳水'] || 0 }} 蛋{{ rec['蛋白質'] || 0 }} 脂{{ rec['脂肪'] || 0 }}<span v-if="rec['纖維']"> 纖{{ rec['纖維'] }}</span>
                    </div>
                    <div v-if="rec['備註']" class="import-record-note">{{ rec['備註'] }}</div>
                  </div>
                  <span class="import-record-cal">{{ fmt(rec['熱量']) }} kcal</span>
                </div>
              </div>

              <div class="import-total">
                共 {{ records.length }} 筆 · 總計 {{ fmt(totalCal) }} kcal
              </div>
            </div>

            <!-- 空結果 -->
            <div v-else-if="queried && !loading" class="import-empty">查無記錄</div>
          </div>
        </div>

        <!-- 固定底部按鈕 -->
        <div v-if="records.length" class="import-footer">
          <label class="import-clear-option">
            <input v-model="clearBeforeImport" type="checkbox" />
            匯入前清空當前資料
          </label>
          <button class="btn btn-primary btn-block" @click="confirmImport">確認匯入</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { store, addFoodToGroup, showToast, saveState, ensureGroup } from '../../store/index.js'
import { fetchDiet } from '../../utils/api.js'
import { fmt } from '../../utils/calc.js'

const modal   = store.modal
const date             = ref('')
const records          = ref([])
const loading          = ref(false)
const queried          = ref(false)
const clearBeforeImport = ref(false)

// 預設今天
watch(() => modal.import.visible, (v) => {
  if (v) {
    date.value    = new Date().toISOString().slice(0, 10)
    records.value = []
    queried.value = false
  }
})

// 依餐別分組
const groupedRecords = computed(() => {
  return records.value.reduce((acc, rec) => {
    const meal = rec['餐別'] || '其他'
    if (!acc[meal]) acc[meal] = []
    acc[meal].push(rec)
    return acc
  }, {})
})

const totalCal = computed(() =>
  records.value.reduce((s, r) => s + (parseFloat(r['熱量']) || 0), 0).toFixed(0)
)

async function query() {
  if (!date.value) return
  loading.value = true
  queried.value = false
  records.value = []
  try {
    // 日期格式：yyyy/MM/dd
    const d = date.value.replaceAll('-', '/')
    const raw = await fetchDiet(d)
    // 標記是否能在食材庫找到匹配
    records.value = raw.map(rec => ({
      ...rec,
      matched: store.foods.some(f => f['名稱'] === rec['食品名稱']),
    }))
    queried.value = true
  } catch (e) {
    showToast(e.message || '查詢失敗，請確認 API 設定')
  } finally {
    loading.value = false
  }
}

function confirmImport() {
  if (clearBeforeImport.value) {
    store.groupOrder.forEach(g => { store.groups[g] = [] })
  }

  records.value.forEach(rec => {
    const meal = rec['餐別'] || '其他'
    // 確保群組存在
    if (!store.groupOrder.includes(meal)) {
      store.groupOrder.push(meal)
      store.groups[meal] = []
    }
    ensureGroup(meal)

    const matched = store.foods.find(f => f['名稱'] === rec['食品名稱'])
    const unit    = rec['單位'] || 'g'
    const qty     = parseFloat(rec['份量']) || 1
    const mode    = unit === '份' ? 'serving' : 'gram'

    const note = rec['備註'] || ''

    if (matched) {
      addFoodToGroup(matched, qty, mode, meal, { note })
    } else {
      // 找不到時用 API 回傳的營養數值建立虛擬食材
      const cal     = parseFloat(rec['熱量'])   || 0
      const carb    = parseFloat(rec['碳水'])   || 0
      const fat     = parseFloat(rec['脂肪'])   || 0
      const protein = parseFloat(rec['蛋白質']) || 0
      const fiber   = parseFloat(rec['纖維'])   || 0
      const per100  = qty > 0 ? (v => Math.round(v / qty * 100 * 10) / 10) : () => 0
      const pseudo = {
        '名稱':           rec['食品名稱'],
        '品牌':           '',
        '分類':           meal,
        '每份量(g)':      qty,
        '每份熱量':       cal,
        '每份碳水':       carb,
        '每份脂肪':       fat,
        '每份蛋白質':     protein,
        '每份膳食纖維':   fiber,
        '每 100g 熱量':   per100(cal),
        '每 100g 碳水':   per100(carb),
        '每 100g 脂肪':   per100(fat),
        '每 100g 蛋白質': per100(protein),
        '每 100g 膳食纖維': per100(fiber),
      }
      addFoodToGroup(pseudo, qty, mode, meal, { note })
    }
  })

  saveState()
  showToast(`已匯入 ${records.value.length} 筆記錄`)
  close()
}

function close() { modal.import.visible = false }
</script>

<style scoped>
:deep(.modal) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.import-modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.import-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.import-footer {
  padding: var(--gap-md) var(--gap-lg);
  border-top: 1px solid var(--c-border-light);
  background: var(--c-bg);
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.import-clear-option {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  font-size: 0.82rem;
  color: var(--c-text-secondary);
  cursor: pointer;
}
</style>
