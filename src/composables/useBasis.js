import { computed } from 'vue'
import { compute } from '../utils/calc.js'

export const BASIS_KEY_MAP = {
  calories: '每 100g 熱量',
  protein:  '每 100g 蛋白質',
  carb:     '每 100g 碳水',
  fat:      '每 100g 脂肪',
}

const BASIS_LABELS = { gram: '克數', calories: '熱量', protein: '蛋白質', carb: '碳水', fat: '脂肪' }

/**
 * @param {Ref<string>} basisType  - 'gram' | 'calories' | 'protein' | 'carb' | 'fat'
 * @param {Ref<number>} basisValue - 基準數值
 */
export function useBasis(basisType, basisValue) {
  const isDefault = computed(() => basisType.value === 'gram' && basisValue.value === 100)

  const basisUnit = computed(() => basisType.value === 'calories' ? 'kcal' : 'g')

  const basisDisplayText = computed(() =>
    `每 ${basisValue.value}${basisUnit.value}（${BASIS_LABELS[basisType.value]}）`
  )

  function calcGrams(food) {
    if (basisType.value === 'gram') return basisValue.value
    const per100 = parseFloat(food[BASIS_KEY_MAP[basisType.value]]) || 0
    if (!per100) return 0
    return Math.round(basisValue.value / per100 * 100)
  }

  function calcNutrition(food) {
    return compute(food, calcGrams(food), 'gram')
  }

  return { isDefault, basisUnit, basisDisplayText, calcGrams, calcNutrition }
}
