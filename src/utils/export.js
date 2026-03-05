import { compute, subtotal, total, macroPct } from './calc.js'

/**
 * 產生匯出文字
 * @param {Object} groups  - { groupName: [items] }
 * @param {Array}  groupOrder - 群組顯示順序
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
      const qty = item.mode === 'serving'
        ? `${item.quantity}份`
        : `${item.quantity}g`
      lines.push(`- ${item.food['名稱']} ${qty} - ${Math.round(n.calories)} kcal`)
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
  if (t.fiber > 0) {
    lines.push(`膳食纖維 ${t.fiber}g`)
  }

  return lines.join('\n')
}
