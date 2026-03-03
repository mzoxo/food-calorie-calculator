// ── 基礎工具 ──────────────────────────────────────────
const num = v => parseFloat(v) || 0
const round = v => Math.round(v * 10) / 10

// ── 營養計算 ──────────────────────────────────────────

/**
 * 計算單一食材的營養素
 * @param {Object} food - 食材資料
 * @param {number} quantity - 數量
 * @param {'gram'|'serving'} mode - 克數或份數
 * @returns {{ calories, carb, fat, protein, fiber, grams }}
 */
export function compute(food, quantity, mode) {
  if (mode === 'serving') {
    const s = num(food['每份量(g)']) || 1
    return {
      calories: round(num(food['每份熱量'])   * quantity),
      carb:     round(num(food['每份碳水'])   * quantity),
      fat:      round(num(food['每份脂肪'])   * quantity),
      protein:  round(num(food['每份蛋白質']) * quantity),
      fiber:    round(num(food['每份膳食纖維']) * quantity),
      grams:    round(s * quantity),
    }
  }
  // gram mode
  const ratio = quantity / 100
  return {
    calories: round(num(food['每100g熱量'])   * ratio),
    carb:     round(num(food['每100g碳水'])   * ratio),
    fat:      round(num(food['每100g脂肪'])   * ratio),
    protein:  round(num(food['每100g蛋白質']) * ratio),
    fiber:    round(num(food['每100g膳食纖維']) * ratio),
    grams:    quantity,
  }
}

/**
 * 加總一個群組內所有食材的營養素
 * @param {Array} items - 群組內的食材清單
 */
export function subtotal(items) {
  return items.reduce((acc, item) => {
    const n = compute(item.food, item.quantity, item.mode)
    acc.calories += n.calories
    acc.carb     += n.carb
    acc.fat      += n.fat
    acc.protein  += n.protein
    acc.fiber    += n.fiber
    return acc
  }, { calories: 0, carb: 0, fat: 0, protein: 0, fiber: 0 })
}

/**
 * 加總所有群組的營養素
 * @param {Object} groups - { groupName: [items] }
 */
export function total(groups) {
  return Object.values(groups).reduce((acc, items) => {
    const s = subtotal(items)
    acc.calories += s.calories
    acc.carb     += s.carb
    acc.fat      += s.fat
    acc.protein  += s.protein
    acc.fiber    += s.fiber
    return acc
  }, { calories: 0, carb: 0, fat: 0, protein: 0, fiber: 0 })
}

/**
 * 計算三大營養素熱量佔比
 * @returns {{ carbPct, proteinPct, fatPct }}
 */
export function macroPct(t) {
  const macroKcal = t.carb * 4 + t.protein * 4 + t.fat * 9
  if (!macroKcal) return { carbPct: 0, proteinPct: 0, fatPct: 0 }
  return {
    carbPct:    Math.round(t.carb    * 4 / macroKcal * 100),
    proteinPct: Math.round(t.protein * 4 / macroKcal * 100),
    fatPct:     Math.round(t.fat     * 9 / macroKcal * 100),
  }
}

// ── BMR / TDEE ────────────────────────────────────────

/**
 * 活動係數選項
 */
export const ACTIVITY_LEVELS = [
  { value: 1.2,   label: '久坐',   desc: '幾乎不運動' },
  { value: 1.375, label: '輕度',   desc: '每週 1–3 天' },
  { value: 1.55,  label: '中度',   desc: '每週 3–5 天' },
  { value: 1.725, label: '高度',   desc: '每週 6–7 天' },
  { value: 1.9,   label: '極高',   desc: '每天高強度或體力勞動' },
]

/**
 * Mifflin-St Jeor 公式計算 BMR
 * @param {{ weight, height, age, gender }} profile
 * gender: 'male' | 'female'，預設 male
 */
export function calcBMR(profile) {
  const { weight, height, age, gender = 'male' } = profile
  if (!weight || !height || !age) return null
  const base = 10 * num(weight) + 6.25 * num(height) - 5 * num(age)
  return Math.round(gender === 'female' ? base - 161 : base + 5)
}

/**
 * 計算 TDEE
 */
export function calcTDEE(bmr, activityLevel) {
  if (!bmr) return null
  return Math.round(bmr * (activityLevel || 1.375))
}

/**
 * 減脂目標熱量（TDEE × 0.9）
 */
export function calcTarget(tdee) {
  if (!tdee) return null
  return Math.round(tdee * 0.9)
}
