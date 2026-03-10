<template>
  <div class="bmr-panel">
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

    <div class="bmr-track" style="margin-top:4px">
      <div class="bmr-bar" :class="intakeBarClass" :style="{ width: intakePct }" />
      <div v-if="bmr" class="bmr-target-line" :style="{ left: targetPct }" title="目標" />
    </div>

    <div class="bmr-intake-row">
      <span class="bmr-intake-label">今日攝取</span>
      <span class="bmr-intake-value" :class="intakeBarClass">{{ fmt(props.calories) }} kcal</span>
      <span v-if="bmr" class="bmr-diff">{{ intakeDiffLabel }}</span>
      <button v-else class="bmr-setup-hint" @click="openModal('profile')">
        設定個人資料以顯示目標 →
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store, openModal } from '../store/index.js'
import { calcBMR, calcTDEE, calcTarget, fmt } from '../utils/calc.js'

const props = defineProps({
  calories: { type: Number, default: 0 },
})

const bmr    = computed(() => store.userProfile ? calcBMR(store.userProfile) : null)
const tdee   = computed(() => bmr.value ? calcTDEE(bmr.value, store.userProfile.activityLevel) : null)
const target = computed(() => tdee.value ? calcTarget(tdee.value) : null)

const intakePct = computed(() => {
  if (!tdee.value) return props.calories ? '60%' : '0%'
  return `${Math.min(100, props.calories / tdee.value * 100).toFixed(1)}%`
})

const targetPct = computed(() => {
  if (!tdee.value || !target.value) return '0%'
  return `${(target.value / tdee.value * 100).toFixed(1)}%`
})

const intakeBarClass = computed(() => {
  if (!props.calories || !tdee.value) return ''
  if (props.calories > tdee.value)    return 'over-tdee'
  if (props.calories > target.value)  return 'over-target'
  return 'under-target'
})

const intakeDiffLabel = computed(() => {
  if (!target.value) return ''
  const diff = Math.round(props.calories - target.value)
  return diff > 0 ? `超出目標 ${fmt(diff)} kcal` : `距目標還差 ${fmt(Math.abs(diff))} kcal`
})
</script>

<style scoped>
.bmr-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm) var(--gap-md);
  background: var(--c-surface);
  border-radius: var(--radius);
  margin-bottom: var(--gap-sm);
}
.bmr-inline-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}
.bmr-inline-right { display: flex; gap: var(--gap-md); }
.bmr-inline-item  { display: flex; gap: 4px; align-items: baseline; }
.bmr-label        { color: var(--c-text-muted); }
.bmr-value        { font-weight: 600; color: var(--c-text-secondary); }

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
.bmr-bar.over-tdee    { background: var(--c-danger); }
.bmr-bar.over-target  { background: #F4A674; }
.bmr-bar.under-target { background: var(--c-primary); }

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
.bmr-intake-value { font-weight: 700; color: var(--c-primary); }
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
.bmr-setup-hint:hover { opacity: 1; }
</style>
