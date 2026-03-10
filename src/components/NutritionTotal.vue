<template>
  <section class="section" style="margin-top:var(--gap-md);padding-top:var(--gap-lg);border-top:1px solid var(--c-border-light)">
    <div class="section-header">
      <h2 class="section-title">總計</h2>
    </div>

    <!-- BMR / TDEE 進度條 -->
    <div class="bmr-panel">
      <!-- 有個人資料：顯示 BMR / TDEE / 目標 -->
      <template v-if="bmr">
        <div class="bmr-inline-row">
          <span class="bmr-inline-item">
            <span class="bmr-label">BMR</span>
            <span class="bmr-value">{{ fmt(bmr) }}</span>
          </span>
          <span class="bmr-inline-right">
            <span class="bmr-inline-item">
              <span class="bmr-label">目標</span>
              <span class="bmr-value">{{ fmt(target) }}</span>
            </span>
            <span class="bmr-inline-item">
              <span class="bmr-label">TDEE</span>
              <span class="bmr-value">{{ fmt(tdee) }}</span>
            </span>
          </span>
        </div>
      </template>

      <!-- 進度條 -->
      <div class="bmr-track" style="margin-top:4px">
        <div class="bmr-bar" :class="intakeBarClass" :style="{ width: intakePct }" />
        <div v-if="bmr" class="bmr-target-line" :style="{ left: targetPct }" title="目標" />
      </div>

      <div class="bmr-intake-row">
        <span class="bmr-intake-label">今日攝取</span>
        <span class="bmr-intake-value" :class="intakeBarClass">
          {{ fmt(t.calories) }} kcal
        </span>
        <span v-if="bmr" class="bmr-diff">{{ intakeDiffLabel }}</span>
        <button v-else class="bmr-setup-hint" @click="openModal('profile')">
          設定個人資料以顯示目標 →
        </button>
      </div>
    </div>

    <!-- 圓餅圖區 -->
    <div class="total-donuts-wrapper">
      <!-- 三大營養素 -->
      <div class="total-content">
        <div class="donut-container">
          <div class="donut-chart" :style="{ background: macroConic }" />
          <div class="donut-text">
            <span class="donut-cal">{{ fmt(t.calories) }}</span>
            <span class="donut-unit">kcal</span>
          </div>
        </div>
        <div class="macro-details">
          <div class="macro-item">
            <span class="macro-dot" style="background:var(--c-carb)" />
            <span class="macro-label">碳水</span>
            <span class="macro-value">{{ t.carb }}g</span>
            <span class="macro-percent">{{ pct.carbPct }}%</span>
          </div>
          <div class="macro-item">
            <span class="macro-dot" style="background:var(--c-protein)" />
            <span class="macro-label">蛋白質</span>
            <span class="macro-value">{{ t.protein }}g</span>
            <span class="macro-percent">{{ pct.proteinPct }}%</span>
          </div>
          <div class="macro-item">
            <span class="macro-dot" style="background:var(--c-fat)" />
            <span class="macro-label">脂肪</span>
            <span class="macro-value">{{ t.fat }}g</span>
            <span class="macro-percent">{{ pct.fatPct }}%</span>
          </div>
          <div v-if="t.fiber > 0" class="macro-item">
            <span class="macro-dot" style="background:var(--c-fiber)" />
            <span class="macro-label">膳食纖維</span>
            <span class="macro-value">{{ t.fiber }}g</span>
            <span class="macro-percent" />
          </div>
        </div>
      </div>

      <!-- 餐次分佈 -->
      <div class="total-content">
        <div class="donut-container">
          <div class="donut-chart" :style="{ background: mealConic }" />
          <div class="donut-text">
            <span class="donut-cal" style="font-size:0.75rem;font-weight:600">餐次</span>
          </div>
        </div>
        <div class="macro-details">
          <div v-for="meal in mealBreakdown" :key="meal.name" class="macro-item">
            <span class="macro-dot" :style="{ background: meal.color }" />
            <span class="macro-label">{{ meal.name }}</span>
            <span class="macro-value">{{ fmt(meal.calories) }}</span>
            <span class="macro-percent">{{ meal.pct }}%</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { store, openModal } from '../store/index.js'
import { total, macroPct, subtotal, calcBMR, calcTDEE, calcTarget, fmt } from '../utils/calc.js'

const MEAL_COLORS = ['#7C9EDE','#F4C454','#F08CA5','#8ECA99','#BCA0E6','#F4A674','#78C4CD','#D990B0']

const props = defineProps({
  // 傳入時使用雲端記錄計算（DietView），不傳時讀 store.groups（CalcView）
  records: { type: Array, default: null },
})

// ── 總計 ─────────────────────────────────────────────
const t = computed(() => {
  if (props.records) {
    return props.records.reduce((acc, rec) => {
      acc.calories += parseFloat(rec.熱量)  || 0
      acc.carb     += parseFloat(rec.碳水)  || 0
      acc.protein  += parseFloat(rec.蛋白質) || 0
      acc.fat      += parseFloat(rec.脂肪)  || 0
      acc.fiber    += parseFloat(rec.纖維)  || 0
      return acc
    }, { calories: 0, carb: 0, protein: 0, fat: 0, fiber: 0 })
  }
  return total(store.groups)
})
const pct = computed(() => macroPct(t.value))

// ── BMR / TDEE ────────────────────────────────────────
const bmr    = computed(() => store.userProfile ? calcBMR(store.userProfile)    : null)
const tdee   = computed(() => bmr.value          ? calcTDEE(bmr.value, store.userProfile.activityLevel) : null)
const target = computed(() => tdee.value         ? calcTarget(tdee.value)       : null)

// 填充條：有 TDEE 時相對 TDEE，沒有時固定顯示 60% 寬（純示意）
const intakePct = computed(() => {
  if (!tdee.value) return t.value.calories ? '60%' : '0%'
  return `${Math.min(100, t.value.calories / tdee.value * 100).toFixed(1)}%`
})

// 目標線位置：target / TDEE
const targetPct = computed(() => {
  if (!tdee.value || !target.value) return '0%'
  return `${(target.value / tdee.value * 100).toFixed(1)}%`
})

const intakeBarClass = computed(() => {
  if (!t.value.calories || !tdee.value) return ''
  if (t.value.calories > tdee.value)    return 'over-tdee'
  if (t.value.calories > target.value)  return 'over-target'
  return 'under-target'
})

const intakeDiffLabel = computed(() => {
  if (!target.value) return ''
  const diff = Math.round(t.value.calories - target.value)
  return diff > 0 ? `超出目標 ${fmt(diff)} kcal` : `距目標還差 ${fmt(Math.abs(diff))} kcal`
})

// ── 三大營養素圓餅圖 ──────────────────────────────────
const macroConic = computed(() => {
  const { carbPct, proteinPct, fatPct } = pct.value
  if (!carbPct && !proteinPct && !fatPct)
    return 'var(--c-surface)'
  const d1 = carbPct * 3.6
  const d2 = d1 + proteinPct * 3.6
  return `conic-gradient(var(--c-carb) 0deg ${d1}deg, var(--c-protein) ${d1}deg ${d2}deg, var(--c-fat) ${d2}deg 360deg)`
})

// ── 餐次圓餅圖 ────────────────────────────────────────
const mealBreakdown = computed(() => {
  const totalCal = t.value.calories || 1
  if (props.records) {
    return store.groupOrder
      .map((name, i) => {
        const cal = props.records
          .filter(r => r.餐別 === name)
          .reduce((s, r) => s + (parseFloat(r.熱量) || 0), 0)
        if (!cal) return null
        return { name, calories: cal, pct: Math.round(cal / totalCal * 100), color: MEAL_COLORS[i % MEAL_COLORS.length] }
      })
      .filter(Boolean)
  }
  return store.groupOrder
    .map((name, i) => {
      const items = store.groups[name] || []
      if (!items.length) return null
      const cal = subtotal(items).calories
      return {
        name,
        calories: cal,
        pct: Math.round(cal / totalCal * 100),
        color: MEAL_COLORS[i % MEAL_COLORS.length],
      }
    })
    .filter(Boolean)
})

const mealConic = computed(() => {
  if (!mealBreakdown.value.length) return 'var(--c-surface)'
  let angle = 0
  const stops = mealBreakdown.value.map(m => {
    const deg = m.pct * 3.6
    const stop = `${m.color} ${angle}deg ${angle + deg}deg`
    angle += deg
    return stop
  })
  return `conic-gradient(${stops.join(', ')})`
})
</script>

<style scoped>
/* BMR Panel */
.bmr-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm) var(--gap-md);
  background: var(--c-surface);
  border-radius: var(--radius);
  margin-bottom: var(--gap-sm);
}

.bmr-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.bmr-inline-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.bmr-inline-right {
  display: flex;
  gap: var(--gap-md);
}

.bmr-inline-item {
  display: flex;
  gap: 4px;
  align-items: baseline;
}

.bmr-label { color: var(--c-text-muted); }
.bmr-value { font-weight: 600; color: var(--c-text-secondary); }

.bmr-track {
  position: relative;
  height: 6px;
  background: var(--c-border);
  border-radius: 99px;
  overflow: visible;
}

.bmr-bar {
  height: 100%;
  border-radius: 99px;
  background: var(--c-primary);
  transition: width 0.4s var(--ease);
}

.bmr-bar.over-tdee   { background: var(--c-danger); }
.bmr-bar.over-target { background: #F4A674; }
.bmr-bar.under-target { background: var(--c-primary); }

.bmr-marker {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 12px;
  background: var(--c-text-muted);
  border-radius: 1px;
  transform: translateX(-50%);
}


.bmr-target-line {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 12px;
  background: var(--c-primary);
  border-radius: 1px;
  transform: translateX(-50%);
  opacity: 0.5;
}

.bmr-intake-row {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  font-size: 0.75rem;
  margin-top: 2px;
}

.bmr-intake-label { color: var(--c-text-muted); }

.bmr-intake-value {
  font-weight: 700;
  color: var(--c-primary);
}
.bmr-intake-value.over-tdee   { color: var(--c-danger); }
.bmr-intake-value.over-target { color: #F4A674; }

.bmr-diff {
  color: var(--c-text-muted);
  font-size: 0.72rem;
  margin-left: auto;
}

.bmr-setup-hint {
  margin-left: auto;
  background: none;
  border: none;
  padding: 0;
  font-size: 0.72rem;
  color: var(--c-primary);
  cursor: pointer;
  font-family: var(--font);
  opacity: 0.8;
  transition: opacity var(--duration) var(--ease);
}

.bmr-setup-hint:hover {
  opacity: 1;
}

/* Donut 內圈 */
.donut-chart {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  position: relative;
}

.donut-chart::before {
  content: '';
  position: absolute;
  inset: 12px;
  background: var(--c-bg);
  border-radius: 50%;
}

.donut-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
</style>
