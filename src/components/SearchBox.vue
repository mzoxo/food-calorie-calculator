<template>
  <div class="section">
    <!-- 搜尋框 -->
    <div class="search-box">
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        class="input"
        placeholder="搜尋食材名稱、別名、品牌…"
        autocomplete="off"
        @input="onInput"
        @focus="onFocus"
        @keydown.esc="clear"
      />
      <button v-if="query" class="icon-btn search-clear" @click="clear">
        <X :size="14" :stroke-width="2" />
      </button>
    </div>

    <!-- 下拉結果 -->
    <ul v-if="results.length" class="dropdown">
      <li
        v-for="food in results"
        :key="food['名稱']"
        class="dropdown-item"
        @click="select(food)"
      >
        <div class="dropdown-item-name">{{ food['名稱'] }}<span v-if="food['品牌']" class="dropdown-brand"> · {{ food['品牌'] }}</span></div>
        <div class="dropdown-item-meta">
          {{ food['分類'] }}
          <span v-if="food['每100g熱量']"> · {{ food['每100g熱量'] }} kcal/100g</span>
          <span v-if="food['每份量(g)']"> · 每份 {{ food['每份量(g)'] }}g</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { store } from '../store/index.js'

const emit = defineEmits(['select'])

const query   = ref('')
const results = ref([])
let   timer   = null

function search(term) {
  if (!term.trim()) { results.value = []; return }
  const q = term.toLowerCase()
  results.value = store.foods
    .filter(f =>
      f['名稱']?.toLowerCase().includes(q) ||
      f['別名']?.toLowerCase().includes(q) ||
      f['品牌']?.toLowerCase().includes(q) ||
      f['分類']?.toLowerCase().includes(q)
    )
    .slice(0, 15)
}

function onInput() {
  clearTimeout(timer)
  timer = setTimeout(() => search(query.value), 200)
}

function onFocus() {
  if (query.value) search(query.value)
}

function select(food) {
  emit('select', food)
  clear()
}

function clear() {
  query.value   = ''
  results.value = []
}
</script>

<style scoped>
.dropdown-brand {
  color: var(--c-text-muted);
  font-weight: 400;
}
</style>
