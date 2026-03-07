<template>
  <Teleport to="body">
    <div v-if="modal.presets.visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h2>常用組合</h2>
          <button class="icon-btn" @click="close"><X :size="16" :stroke-width="1.5" /></button>
        </div>
        <div class="modal-body">
          <!-- 空狀態 -->
          <div v-if="!store.presets.length" class="presets-empty">
            尚無常用組合
          </div>

          <!-- 組合列表 -->
          <div v-else class="presets-list">
            <div v-for="(preset, i) in store.presets" :key="i" class="preset-card">
              <div class="preset-header">
                <span class="preset-name">
                  {{ preset.name }}
                  <span v-if="preset.divider > 1" style="font-weight:400;color:var(--c-text-muted)">
                    （÷{{ preset.divider }}）
                  </span>
                </span>
                <div class="preset-actions">
                  <!-- 份數輸入 -->
                  <input
                    v-model.number="qtyMap[i]"
                    type="number"
                    class="preset-qty-input"
                    min="0.5"
                    step="0.5"
                  />
                  <button class="btn btn-primary" style="padding:4px 10px;font-size:0.75rem" @click="openUse(preset, i)">使用</button>
                  <button class="icon-btn" @click="deletePreset(i)">
                    <Trash2 :size="14" :stroke-width="1.5" />
                  </button>
                </div>
              </div>
              <div class="preset-foods">
                {{ preset.items.map(it => it.food['名稱']).join('、') }}
              </div>
            </div>
          </div>

          <!-- 儲存目前群組 -->
          <div class="presets-actions">
            <button
              class="btn btn-primary btn-block"
              :disabled="!store.groups[store.activeGroup]?.length"
              @click="openSave"
            >
              將目前群組儲存為常用組合
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { X, Trash2 } from 'lucide-vue-next'
import { store, savePresets, showConfirm, openModal, openPresetUse } from '../../store/index.js'

const modal = store.modal

// 每個 preset 的使用份數，每次開啟時重設為 1
const qtyMap = reactive({})
watch(() => modal.presets.visible, (v) => {
  if (v) store.presets.forEach((_, i) => { qtyMap[i] = 1 })
}, { immediate: true })

async function deletePreset(i) {
  const ok = await showConfirm(`確定刪除「${store.presets[i].name}」？`)
  if (!ok) return
  store.presets.splice(i, 1)
  savePresets()
}

function openUse(preset, i) {
  modal.presets.visible = false
  openPresetUse(preset, qtyMap[i] ?? 1)
}

function openSave() {
  modal.presets.visible = false
  openModal('presetSave')
}

function close() { modal.presets.visible = false }
</script>
