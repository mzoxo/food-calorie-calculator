<template>
  <Teleport to="body">
    <div v-if="modal.profile.visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h2>個人資料</h2>
          <button class="icon-btn" @click="close"><X :size="16" :stroke-width="1.5" /></button>
        </div>
        <div class="modal-body profile-modal-body">
          <!-- 基本資料 -->
          <div class="profile-row">
            <label class="field">
              <span class="field-label">年齡</span>
              <input v-model.number="form.age" type="number" class="input" min="1" max="120" placeholder="歲" />
            </label>
            <label class="field">
              <span class="field-label">性別</span>
              <select v-model="form.gender" class="input">
                <option :value="null" disabled>請選擇</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </label>
          </div>

          <div class="profile-row">
            <label class="field">
              <span class="field-label">身高</span>
              <input v-model.number="form.height" type="number" class="input" min="100" max="250" placeholder="cm" />
            </label>
            <label class="field">
              <span class="field-label">體重</span>
              <input v-model.number="form.weight" type="number" class="input" min="20" max="300" placeholder="kg" />
            </label>
          </div>

          <!-- 運動習慣 -->
          <div class="field">
            <span class="field-label">運動習慣</span>
            <div class="activity-options">
              <button
                v-for="level in ACTIVITY_LEVELS"
                :key="level.value"
                class="activity-btn"
                :class="{ active: form.activityLevel === level.value }"
                @click="form.activityLevel = level.value"
              >
                <span class="activity-label">{{ level.label }}</span>
                <span class="activity-desc">{{ level.desc }}</span>
              </button>
            </div>
          </div>

          <!-- BMR / TDEE 預覽 -->
          <div v-if="bmrPreview" class="nutrition-preview">
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">BMR</span>
              <span class="nutrition-preview-value">{{ fmt(bmrPreview) }} kcal</span>
            </div>
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">TDEE</span>
              <span class="nutrition-preview-value">{{ fmt(tdeePreview) }} kcal</span>
            </div>
            <div class="nutrition-preview-item">
              <span class="nutrition-preview-label">減脂目標</span>
              <span class="nutrition-preview-value">{{ fmt(targetPreview) }} kcal</span>
            </div>
          </div>

          <button class="btn btn-primary btn-block" @click="save">儲存</button>

          <!-- 清除個人資料 -->
          <button v-if="store.userProfile" class="btn btn-danger-outline btn-block" @click="clear">
            清除個人資料
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { store, saveUserProfile, showToast } from '../../store/index.js'
import { ACTIVITY_LEVELS, calcBMR, calcTDEE, calcTarget, fmt } from '../../utils/calc.js'

const modal = store.modal

const form = ref({ age: null, height: null, weight: null, gender: null, activityLevel: null })

// 開啟時載入現有資料
watch(() => modal.profile.visible, (v) => {
  if (v) {
    form.value = store.userProfile
      ? { ...store.userProfile }
      : { age: null, height: null, weight: null, gender: null, activityLevel: null }
  }
})

// 即時預覽
const bmrPreview    = computed(() => calcBMR(form.value))
const tdeePreview   = computed(() => bmrPreview.value ? calcTDEE(bmrPreview.value, form.value.activityLevel) : null)
const targetPreview = computed(() => tdeePreview.value ? calcTarget(tdeePreview.value) : null)

function save() {
  store.userProfile = { ...form.value }
  saveUserProfile()
  showToast('個人資料已儲存')
  close()
}

function clear() {
  store.userProfile = null
  saveUserProfile()
  showToast('已清除個人資料')
  close()
}

function close() { modal.profile.visible = false }
</script>

<style scoped>
:deep(.modal) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.profile-modal-body {
  overflow-y: auto;
  flex: 1;
}

.profile-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap-md);
}

.activity-options {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
}

.activity-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gap-sm) var(--gap-md);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-bg);
  cursor: pointer;
  font-family: var(--font);
  transition: all var(--duration) var(--ease);
  text-align: left;
}

.activity-btn:hover { background: var(--c-surface-hover); }

.activity-btn.active {
  border-color: var(--c-primary);
  background: var(--c-primary-subtle);
}

.activity-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--c-text);
}

.activity-desc {
  font-size: 0.75rem;
  color: var(--c-text-muted);
}
</style>
