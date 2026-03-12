<template>
  <!-- 載入蓋板 -->
  <div v-if="store.loading" class="loading-overlay">
    <div class="loading-spinner" />
    <span class="loading-text">載入食材資料中…</span>
  </div>

  <!-- Header -->
  <AppHeader :back="route.path === '/calc'" :title="route.path === '/calc' ? '計算機' : '卡路里計算器'" @menu="onMenuToggle" />

  <!-- 右上角選單 -->
  <AppMenu
    :visible="menuVisible"
    :anchor="menuAnchor"
    @close="menuVisible = false"
    @open-profile="openModal('profile')"
    @refresh="onRefresh"
    @clear-all="onClearAll"
  />

  <!-- 主內容 -->
  <main class="main container">
    <!-- 搜尋 + 最近使用 -->
    <SearchBox @select="openAddFood" />
    <RecentFoods @select="openAddFood" />

    <!-- 群組 Tab -->
    <GroupTabs />

    <!-- 群組食材 -->
    <GroupItems />

    <!-- 總計 + BMR/TDEE -->
    <NutritionTotal />
  </main>

  <!-- Footer -->
  <footer class="footer container">
    <button class="btn btn-outline" @click="openModal('presets')">常用組合</button>
    <button v-if="isConfigured()" class="btn btn-outline" @click="openModal('import')">匯入</button>
    <button class="btn btn-outline" @click="openModal('export')">寫入記錄</button>
    <button class="btn btn-outline" @click="onClearCurrent">清除計算</button>
  </footer>

  <!-- ── Modals ── -->
  <AddFoodModal />
  <PresetsModal />
  <PresetSaveModal />
  <PresetUseModal />
  <ImportModal />
  <ExportModal />
  <ProfileModal />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader      from '../components/AppHeader.vue'
import AppMenu        from '../components/AppMenu.vue'
import SearchBox      from '../components/SearchBox.vue'
import RecentFoods    from '../components/RecentFoods.vue'
import GroupTabs      from '../components/GroupTabs.vue'
import GroupItems     from '../components/GroupItems.vue'
import NutritionTotal from '../components/NutritionTotal.vue'
import AddFoodModal    from '../components/modals/AddFoodModal.vue'
import PresetsModal    from '../components/modals/PresetsModal.vue'
import PresetSaveModal from '../components/modals/PresetSaveModal.vue'
import PresetUseModal  from '../components/modals/PresetUseModal.vue'
import ImportModal     from '../components/modals/ImportModal.vue'
import ExportModal     from '../components/modals/ExportModal.vue'
import ProfileModal    from '../components/modals/ProfileModal.vue'

import { store, loadState, loadRecent, loadPresets, loadUserProfile, clearAll, saveState, showConfirm, openModal, openAddFood } from '../store/index.js'
import { loadFoods } from '../utils/api.js'
import { isConfigured } from '../store/index.js'

const route       = useRoute()
const menuVisible = ref(false)
const menuAnchor  = ref(null)

function onMenuToggle(rect) {
  menuAnchor.value  = rect
  menuVisible.value = !menuVisible.value
}

// ── 初始化 ────────────────────────────────────────────
onMounted(async () => {
  loadState()
  loadRecent()
  loadPresets()
  loadUserProfile()
  await loadFoods()
})

// ── 重新整理 ──────────────────────────────────────────
async function onRefresh() {
  menuVisible.value = false
  await loadFoods(true)
}

// ── 清除 ──────────────────────────────────────────────

async function onClearCurrent() {
  const ok = await showConfirm('清除所有群組的食材？')
  if (!ok) return
  store.groupOrder.forEach(g => { store.groups[g] = [] })
  saveState()
}

async function onClearAll() {
  menuVisible.value = false
  const ok = await showConfirm('清除所有資料（含常用組合、最近使用、快取）？')
  if (!ok) return
  clearAll()
}
</script>
