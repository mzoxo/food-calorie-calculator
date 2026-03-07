<template>
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('close')">
      <div class="modal compare-modal">
        <div class="modal-header">
          <h2>食材比較</h2>
          <button class="icon-btn" @click="$emit('close')">
            <X :size="16" :stroke-width="1.5" />
          </button>
        </div>

        <div class="modal-body">
          <!-- 基準設定 -->
          <div class="compare-basis-row">
            <select v-model="basisType" class="input" style="flex: 1;">
              <option value="gram">固定克數 (g)</option>
              <option value="calories">固定熱量 (kcal)</option>
              <option value="protein">固定蛋白質 (g)</option>
              <option value="carb">固定碳水 (g)</option>
              <option value="fat">固定脂肪 (g)</option>
            </select>
            <input
              v-model.number="basisValue"
              type="number"
              class="input"
              style="width: 72px;"
              min="1"
            />
            <span style="font-size: 0.78rem; color: var(--c-text-muted); white-space: nowrap;">
              {{ basisType === 'calories' ? 'kcal' : 'g' }}
            </span>
          </div>

          <!-- 比較表格（橫向捲動） -->
          <div class="compare-table-wrap">
            <table class="compare-table">
              <thead>
                <tr>
                  <th class="compare-label-col"></th>
                  <th
                    v-for="food in foods"
                    :key="food['名稱']"
                    class="compare-food-col"
                  >
                    <div class="compare-food-name">{{ food['名稱'] }}</div>
                    <div v-if="food['品牌']" class="compare-food-brand">{{ food['品牌'] }}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="compare-row-label">克數</td>
                  <td v-for="food in foods" :key="food['名稱']" class="compare-cell">
                    {{ calcGrams(food) }}g
                  </td>
                </tr>
                <tr>
                  <td class="compare-row-label">熱量</td>
                  <td v-for="food in foods" :key="food['名稱']" class="compare-cell" :class="{ 'compare-cell-max': isMax(food, 'calories') }">
                    {{ fmt(calcNutrition(food).calories) }} kcal
                  </td>
                </tr>
                <tr>
                  <td class="compare-row-label">碳水</td>
                  <td v-for="food in foods" :key="food['名稱']" class="compare-cell" :class="{ 'compare-cell-max': isMax(food, 'carb') }">
                    {{ calcNutrition(food).carb }}g
                  </td>
                </tr>
                <tr>
                  <td class="compare-row-label">蛋白質</td>
                  <td v-for="food in foods" :key="food['名稱']" class="compare-cell" :class="{ 'compare-cell-max': isMax(food, 'protein') }">
                    {{ calcNutrition(food).protein }}g
                  </td>
                </tr>
                <tr>
                  <td class="compare-row-label">脂肪</td>
                  <td v-for="food in foods" :key="food['名稱']" class="compare-cell" :class="{ 'compare-cell-max': isMax(food, 'fat') }">
                    {{ calcNutrition(food).fat }}g
                  </td>
                </tr>
                <tr>
                  <td class="compare-row-label">膳食纖維</td>
                  <td v-for="food in foods" :key="food['名稱']" class="compare-cell" :class="{ 'compare-cell-max': isMax(food, 'fiber') }">
                    {{ calcNutrition(food).fiber }}g
                  </td>
                </tr>
                <tr>
                  <td class="compare-row-label"></td>
                  <td v-for="food in foods" :key="food['名稱']" class="compare-cell">
                    <button
                      class="btn btn-outline"
                      style="font-size: 0.72rem; padding: 3px 8px; min-height: 26px;"
                      @click="addFood(food)"
                    >
                      加入
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { store } from '../../store/index.js'
import { fmt } from '../../utils/calc.js'
import { useBasis } from '../../composables/useBasis.js'

const props = defineProps({
  foods:            Array,
  initialBasisType: { type: String, default: 'gram' },
  initialBasisVal:  { type: Number, default: 100 },
})
const emit = defineEmits(['close'])

const basisType  = ref(props.initialBasisType)
const basisValue = ref(props.initialBasisVal)

const { calcGrams, calcNutrition } = useBasis(basisType, basisValue)

function isMax(food, key) {
  const val = calcNutrition(food)[key]
  const max = Math.max(...props.foods.map(f => calcNutrition(f)[key]))
  return max > 0 && val === max
}

function addFood(food) {
  const grams = calcGrams(food)
  store.modal.addFood.initQuantity = grams
  store.modal.addFood.food         = food
  store.modal.addFood.visible      = true
  emit('close')
}
</script>
