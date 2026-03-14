import { compute, subtotal, total, macroPct } from './calc.js'

export const MEAL_TIMES = { '早餐': '10:30', '午餐': '12:30', '晚餐': '19:30' }

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * 將群組 items 依 presetId 分組
 * @returns {{ presetMap: Map, standalone: Array }}
 */
function splitByPreset(items) {
  const presetMap = new Map()
  const standalone = []
  for (const item of items) {
    if (item.presetId) {
      if (!presetMap.has(item.presetId)) {
        presetMap.set(item.presetId, { presetName: item.presetName, items: [] })
      }
      presetMap.get(item.presetId).items.push(item)
    } else {
      standalone.push(item)
    }
  }
  return { presetMap, standalone }
}

/**
 * 產生要寫入 Google Sheets 的記錄列（logDiet 格式）
 * @param {Object} groups     - { groupName: [items] }
 * @param {Array}  groupOrder - 群組顯示順序
 * @returns {Array} 記錄列陣列（不含日期，由呼叫端填入）
 */
export function generateDietRows(groups, groupOrder) {
  const rows = []

  for (const groupName of groupOrder) {
    const items = groups[groupName]
    if (!items?.length) continue

    const time = MEAL_TIMES[groupName] || nowTime()
    const { presetMap, standalone } = splitByPreset(items)

    // 常用組合：合併為一筆，備註列出各食材
    for (const { presetName, items: presetItems } of presetMap.values()) {
      const n = subtotal(presetItems)
      const totalGrams = presetItems.reduce((sum, item) => {
        return sum + compute(item.food, item.quantity, item.mode).grams
      }, 0)
      const note = presetItems.map(item => {
        const qty = item.mode === 'serving' ? `${item.quantity}份` : `${item.quantity}g`
        return `${item.food['名稱']}${qty}`
      }).join('+')
      rows.push({
        餐別: groupName, 時間: time,
        食品名稱: presetName, 份量: Math.round(totalGrams * 10) / 10, 單位: 'g',
        熱量: Math.round(n.calories),
        蛋白質: n.protein, 脂肪: n.fat, 碳水: n.carb, 纖維: n.fiber,
        備註: note,
      })
    }

    // 獨立食材：各自一筆
    for (const item of standalone) {
      const n = compute(item.food, item.quantity, item.mode)
      rows.push({
        餐別: groupName, 時間: time,
        食品名稱: item.food['名稱'],
        份量: item.quantity,
        單位: item.mode === 'serving' ? '份' : 'g',
        熱量: Math.round(n.calories),
        蛋白質: n.protein, 脂肪: n.fat, 碳水: n.carb, 纖維: n.fiber,
        備註: item.note || '',
      })
    }
  }

  return rows
}

/**
 * 產生常用組合整組寫入時的備註字串
 * @param {Array}  items    - preset.items
 * @param {number} servings - 份數倍率
 * @returns {string} 例："雞蛋2份+吐司100g+牛奶200g"
 */
export function generatePresetNote(items, servings = 1) {
  return items.map(item => {
    const qty = item.mode === 'serving'
      ? `${item.quantity * servings}份`
      : `${item.quantity * servings}g`
    return `${item.food['名稱']}${qty}`
  }).join('+')
}

/**
 * 將常用組合轉換成要寫入 Sheet 的 row 陣列
 * @param {Object}  preset       - { name, items }
 * @param {Array}   selectedItems - 選中的 items（個別模式只傳部分）
 * @param {number}  servings     - 份數倍率
 * @param {string}  group        - 餐別
 * @param {string}  date         - yyyy/MM/dd
 * @param {boolean} asSingle     - true = 整組寫 1 筆；false = 個別各寫 1 筆
 * @returns {Array} rows（不含日期以外欄位已填好）
 */
export function presetToRows(preset, selectedItems, servings, group, date, asSingle) {
  const time = MEAL_TIMES[group] || nowTime()

  if (asSingle) {
    const scaledItems = selectedItems.map(item => ({
      ...item, quantity: item.quantity * servings,
    }))
    const n = subtotal(scaledItems)
    const totalGrams = scaledItems.reduce(
      (sum, item) => sum + compute(item.food, item.quantity, item.mode).grams, 0
    )
    return [{
      日期: date, 餐別: group, 時間: time,
      食品名稱: preset.name,
      份量: Math.round(totalGrams * 10) / 10, 單位: 'g',
      熱量: Math.round(n.calories),
      蛋白質: n.protein, 脂肪: n.fat, 碳水: n.carb, 纖維: n.fiber,
      備註: generatePresetNote(selectedItems, servings),
    }]
  }

  return selectedItems.map(item => {
    const qty = item.quantity * servings
    const n = compute(item.food, qty, item.mode)
    return {
      日期: date, 餐別: group, 時間: time,
      食品名稱: item.food['名稱'],
      份量: qty,
      單位: item.mode === 'serving' ? '份' : 'g',
      熱量: Math.round(n.calories),
      蛋白質: n.protein, 脂肪: n.fat, 碳水: n.carb, 纖維: n.fiber,
      備註: item.note || '',
    }
  })
}

/**
 * 產生複製用文字（含每個食材的完整營養素）
 * @param {Object} groups
 * @param {Array}  groupOrder
 * @returns {string}
 */
export function generateExport(groups, groupOrder) {
  const lines = []

  for (const name of groupOrder) {
    const items = groups[name]
    if (!items?.length) continue

    lines.push(`[${name}]`)

    for (const item of items) {
      const n = compute(item.food, item.quantity, item.mode)
      const qty = item.mode === 'serving' ? `${item.quantity}份` : `${item.quantity}g`
      let line = `- ${item.food['名稱']} ${qty} | ${Math.round(n.calories)} kcal | 碳水 ${n.carb}g | 蛋白質 ${n.protein}g | 脂肪 ${n.fat}g`
      if (n.fiber > 0) line += ` | 膳食纖維 ${n.fiber}g`
      lines.push(line)
    }

    const s = subtotal(items)
    let subLine = `小計：${Math.round(s.calories)} kcal | 碳水 ${s.carb}g | 蛋白質 ${s.protein}g | 脂肪 ${s.fat}g`
    if (s.fiber > 0) subLine += ` | 膳食纖維 ${s.fiber}g`
    lines.push(subLine)
    lines.push('')
  }

  const t = total(groups)
  const { carbPct, proteinPct, fatPct } = macroPct(t)

  lines.push(`總計：${Math.round(t.calories)} kcal`)
  lines.push(
    `碳水 ${t.carb}g (${carbPct}%) | 蛋白質 ${t.protein}g (${proteinPct}%) | 脂肪 ${t.fat}g (${fatPct}%)`
  )
  if (t.fiber > 0) lines.push(`膳食纖維 ${t.fiber}g`)

  return lines.join('\n')
}
