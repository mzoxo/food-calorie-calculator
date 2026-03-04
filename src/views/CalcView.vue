<template>
  <!-- Header -->
  <AppHeader @refresh="onRefresh" @menu="menuVisible = !menuVisible" />

  <!-- 右上角選單 -->
  <AppMenu
    :visible="menuVisible"
    @close="menuVisible = false"
    @open-profile="store.modal.profile.visible = true"
    @refresh="onRefresh"
    @clear-current="onClearCurrent"
    @clear-all="onClearAll"
  />

  <!-- 主內容 -->
  <main class="main">
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
  <footer class="footer">
    <button class="btn btn-outline" @click="store.modal.presets.visible = true">常用組合</button>
    <button v-if="isConfigured" class="btn btn-outline" @click="store.modal.import.visible = true">匯入</button>
    <button class="btn btn-outline" @click="store.modal.export.visible = true">匯出</button>
    <button class="btn btn-outline" @click="onClearCurrent">清除計算</button>
  </footer>

  <!-- ── Modals ── -->
  <AddFoodModal />
  <!-- <PresetsModal /> -->
  <!-- <PresetSaveModal /> -->
  <!-- <PresetUseModal /> -->
  <!-- <ImportModal /> -->
  <!-- <ExportModal /> -->
  <!-- <ProfileModal /> -->
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppHeader      from '../components/AppHeader.vue'
import AppMenu        from '../components/AppMenu.vue'
import SearchBox      from '../components/SearchBox.vue'
import RecentFoods    from '../components/RecentFoods.vue'
import GroupTabs      from '../components/GroupTabs.vue'
import GroupItems     from '../components/GroupItems.vue'
import NutritionTotal from '../components/NutritionTotal.vue'
import AddFoodModal   from '../components/modals/AddFoodModal.vue'

import { store, loadState, loadRecent, loadPresets, loadUserProfile, clearAll, saveState, showConfirm, initDefaultGroups } from '../store/index.js'
import { loadFoods } from '../utils/api.js'
import { isConfigured } from '../store/index.js'

const menuVisible = ref(false)

// ── 初始化 ────────────────────────────────────────────
onMounted(async () => {
  loadState()
  loadRecent()
  loadPresets()
  loadUserProfile()
  await loadFoods()
})

// ── 食材加入（暫時直接加，待 AddFoodModal 完成後改為開 modal）
function openAddFood(food) {
  store.modal.addFood.food    = food
  store.modal.addFood.visible = true
}

// ── 重新整理 ──────────────────────────────────────────
async function onRefresh() {
  menuVisible.value = false
  await loadFoods(true)
}

// ── 清除 ──────────────────────────────────────────────
async function onClearCurrent() {
  menuVisible.value = false
  const ok = await showConfirm('清除目前所有群組的食材？')
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
