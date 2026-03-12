<template>
  <div class="foods-table-wrap container">
    <div class="foods-count-row">
      <span class="foods-count">共 {{ foods.length }} 項</span>
      <div style="display: flex; align-items: center;">
        <span class="foods-basis-display" :class="{ 'foods-basis-active': !isDefault }">
          {{ basisDisplayText }}
        </span>
        <button class="icon-btn" style="width: 20px; height: 20px; min-width: unset; min-height: unset;" title="設定基準" @click="$emit('edit-basis')">
          <Pencil :size="12" :stroke-width="1.8" />
        </button>
      </div>
    </div>
    <div class="foods-table-scroll">
      <table class="foods-table">
        <thead>
          <tr>
            <th v-if="compareMode" class="col-check"></th>
            <th class="col-name">名稱</th>
            <th v-if="basisType !== 'gram'" class="col-num">克數</th>
            <th
              v-for="col in SORT_COLS"
              :key="col.field"
              class="col-num sortable"
              @click="$emit('sort', col.field)"
            >
              {{ col.label }}
              <span class="sort-icon">
                <template v-if="sortField === col.field">
                  {{ sortDir === 'asc' ? '↑' : '↓' }}
                </template>
                <template v-else>↕</template>
              </span>
            </th>
            <th class="col-cat">分類</th>
            <th class="col-action"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(food, idx) in foods"
            :key="food['名稱'] != null ? food['名稱'] + '|' + (food['品牌'] || '') : idx"
            :class="{ 'row-selected': selectedIds.has(food['名稱']), 'row-compare': compareMode }"
            @click="compareMode ? $emit('toggle-select', food) : null"
          >
            <td v-if="compareMode" class="col-check" @click.stop>
              <span
                class="custom-checkbox"
                :class="{
                  checked:  selectedIds.has(food['名稱']),
                  disabled: !selectedIds.has(food['名稱']) && selectedIds.size >= 5,
                }"
                @click="$emit('toggle-select', food)"
              >
                <svg v-if="selectedIds.has(food['名稱'])" width="10" height="10" viewBox="0 0 10 10">
                  <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </td>
            <td class="col-name">
              <div class="food-table-name">{{ food['名稱'] }}</div>
              <div v-if="food['品牌']" class="food-table-brand">{{ food['品牌'] }}</div>
            </td>
            <td v-if="basisType !== 'gram'" class="col-num">{{ calcGrams(food) }}g</td>
            <template v-if="isDefault">
              <td class="col-num">{{ food['每 100g 熱量'] ?? '—' }}</td>
              <td class="col-num">{{ food['每 100g 碳水'] ?? '—' }}</td>
              <td class="col-num">{{ food['每 100g 蛋白質'] ?? '—' }}</td>
              <td class="col-num">{{ food['每 100g 脂肪'] ?? '—' }}</td>
            </template>
            <template v-else>
              <td class="col-num">{{ calcNutrition(food).calories }}</td>
              <td class="col-num">{{ calcNutrition(food).carb }}</td>
              <td class="col-num">{{ calcNutrition(food).protein }}</td>
              <td class="col-num">{{ calcNutrition(food).fat }}</td>
            </template>
            <td class="col-cat">
              <component
                v-if="CATEGORY_ICONS[food['分類']]"
                :is="CATEGORY_ICONS[food['分類']]"
                :size="14"
                :stroke-width="1.5"
                :title="food['分類']"
                class="cat-icon"
              />
              <span v-else-if="food['分類']">{{ food['分類'] }}</span>
            </td>
            <td class="col-action">
              <button
                v-if="!compareMode"
                class="icon-btn foods-add-btn"
                @click.stop="$emit('add', food)"
              >
                <Plus :size="14" :stroke-width="2" />
              </button>
            </td>
          </tr>
          <tr v-if="!foods.length">
            <td :colspan="totalCols" class="foods-empty">找不到符合的食材</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, toRef } from 'vue'
import {
  Plus, Pencil,
  Wheat, Milk, Apple, Droplets, Fish, Drumstick, Salad, Egg,
  FlaskConical, Bean, Cookie, Utensils, GlassWater, Soup, UtensilsCrossed,
} from 'lucide-vue-next'
import { useBasis } from '../../composables/useBasis.js'

const CATEGORY_ICONS = {
  '五穀根莖類': Wheat,
  '奶類':       Milk,
  '水果':       Apple,
  '油脂':       Droplets,
  '海鮮類':     Fish,
  '肉類':       Drumstick,
  '蔬菜':       Salad,
  '蛋類':       Egg,
  '調味料':     FlaskConical,
  '豆類':       Bean,
  '零食':       Cookie,
  '食物':       Utensils,
  '飲料':       GlassWater,
  '餐點':       Soup,
  '麵類':       UtensilsCrossed,
}

const props = defineProps({
  foods:       Array,
  sortField:   String,
  sortDir:     String,
  compareMode: Boolean,
  selectedIds: Set,
  basisType:        { type: String, default: 'gram' },
  basisValue:       { type: Number, default: 100 },
  basisDisplayText: { type: String, default: '每 100g（克數）' },
  isDefault:        { type: Boolean, default: true },
})

defineEmits(['sort', 'add', 'toggle-select', 'edit-basis'])

const SORT_COLS = [
  { field: 'calories', label: '熱量' },
  { field: 'carb',     label: '碳水' },
  { field: 'protein',  label: '蛋白質' },
  { field: 'fat',      label: '脂肪' },
]

const { calcGrams, calcNutrition } = useBasis(toRef(props, 'basisType'), toRef(props, 'basisValue'))

const totalCols = computed(() => {
  let n = 7 // name, cat, cal, carb, protein, fat, action
  if (props.compareMode) n++
  if (props.basisType !== 'gram') n++
  return n
})
</script>
