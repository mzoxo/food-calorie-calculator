<template>
  <Teleport to="body">
    <div v-if="modal.import.visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h2>匯入飲食記錄</h2>
          <button class="icon-btn" @click="close"><X :size="16" :stroke-width="1.5" /></button>
        </div>
        <div class="modal-body">
          <!-- 日期 + 查詢 -->
          <div class="import-date-row">
            <input v-model="date" type="date" class="input" style="flex:1" />
            <button class="btn btn-primary" :disabled="loading" @click="query">查詢</button>
          </div>

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
                    {{ rec['份量'] }}{{ rec['單位'] }}
                    <span v-if="rec['matched']" style="color:var(--c-primary)"> ✓</span>
                  </div>
                </div>
                <span class="import-record-cal">{{ rec['熱量'] }} kcal</span>
              </div>
            </div>

            <div class="import-total">
              共 {{ records.length }} 筆 · 總計 {{ totalCal }} kcal
            </div>
          </div>

          <!-- 空結果 -->
          <div v-else-if="queried && !loading" class="import-empty">查無記錄</div>

          <button
            v-if="records.length"
            class="btn btn-primary btn-block"
            @click="confirmImport"
          >確認匯入</button>
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

const modal   = store.modal
const date    = ref('')
const records = ref([])
const loading = ref(false)
const queried = ref(false)

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
    showToast('查詢失敗，請確認 API 設定')
  } finally {
    loading.value = false
  }
}

function confirmImport() {
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

    if (matched) {
      addFoodToGroup(matched, qty, mode, meal)
    } else {
      // 找不到時用 API 回傳的營養數值建立虛擬食材
      const pseudo = {
        '名稱':      rec['食品名稱'],
        '品牌':      '',
        '分類':      meal,
        '每份量(g)': qty,
        '每份熱量':  rec['熱量']   || 0,
        '每份碳水':  rec['碳水']   || 0,
        '每份蛋白質':rec['蛋白質'] || 0,
        '每份脂肪':  rec['脂肪']   || 0,
        '每份膳食纖維': rec['纖維'] || 0,
        '每100g熱量': 0,
      }
      addFoodToGroup(pseudo, 1, 'serving', meal)
    }
  })

  saveState()
  showToast(`已匯入 ${records.value.length} 筆記錄`)
  close()
}

function close() { modal.import.visible = false }
</script>
