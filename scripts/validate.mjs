/**
 * 数据源校验脚本（零依赖）
 * 校验 src/data/ 下的数据源是否满足 schema/animal.schema.json 的契约，
 * 并额外检查跨文件引用完整性、重复 id、枚举越界等。
 * 用法：node scripts/validate.mjs
 * 退出码：0 = 通过，1 = 有错误
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'src', 'data')

const DIFFICULTIES = ['3 - 非常简单', '5 - 中等', '9 - 传奇']
const FUR_CATEGORIES = ['common', 'rare', 'precious']
const TIME_RANGE_RE = /^\d{2}:\d{2} - \d{2}:\d{2}$/
const ANIMAL_ID_RE = /^[a-z0-9-]+$/

const errors = []
const warnings = []

const read = (file) => {
  const p = path.join(DATA_DIR, file)
  if (!fs.existsSync(p)) {
    errors.push(`缺少数据文件: ${file}`)
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    errors.push(`数据文件不是合法 JSON: ${file} (${e.message})`)
    return null
  }
}

const assert = (cond, msg) => {
  if (!cond) errors.push(msg)
}

const checkUniqueIds = (items, label) => {
  const seen = new Set()
  items.forEach((item, i) => {
    if (!item || typeof item.id !== 'string' || !item.id) {
      errors.push(`${label}[${i}] 缺少非空 id`)
      return
    }
    if (seen.has(item.id)) errors.push(`${label} 重复 id: ${item.id}`)
    seen.add(item.id)
  })
}

// ---------- 读取 ----------

const maps = read('maps.json')
const furTypes = read('fur-types.json')
const lures = read('lures.json')
const animals = read('animals.json')
const versions = read('versions.json')
if (!maps || !furTypes || !lures || !animals || !versions) {
  console.error(`✗ 校验失败：${errors.join('；')}`)
  process.exit(1)
}

// ---------- 维度表 ----------

for (const [label, list] of [['maps', maps], ['furTypes', furTypes], ['lures', lures]]) {
  assert(Array.isArray(list), `${label} 应为数组`)
  if (!Array.isArray(list)) continue
  checkUniqueIds(list, label)
  list.forEach((e, i) => {
    if (typeof e?.name !== 'string' || !e.name) errors.push(`${label}[${i}] 缺少 name`)
    if (e && Object.keys(e).some((k) => !['id', 'name'].includes(k))) {
      errors.push(`${label}[${i}] 含未声明字段: ${Object.keys(e).filter((k) => !['id', 'name'].includes(k)).join(',')}`)
    }
  })
}

// ---------- 动物 ----------

assert(Array.isArray(animals), 'animals 应为数组')
checkUniqueIds(animals, 'animals')

const mapIdSet = new Set((maps || []).map((m) => m.id))
const furIdSet = new Set((furTypes || []).map((f) => f.id))
const lureIdSet = new Set((lures || []).map((l) => l.id))

animals.forEach((a, i) => {
  const ctx = `animals[${i}]${a?.id ? ` (${a.id})` : ''}`
  if (!a) return errors.push(`${ctx} 为空对象`)
  if (typeof a !== 'object' || Array.isArray(a)) return errors.push(`${ctx} 应为对象`)

  assert(typeof a.name === 'string' && a.name, `${ctx} name 缺失`)
  assert(typeof a.englishName === 'string', `${ctx} englishName 应为字符串`)
  assert(Number.isInteger(a.level) && a.level >= 1 && a.level <= 9, `${ctx} level 应为 1-9 整数`)
  assert(DIFFICULTIES.includes(a.difficulty), `${ctx} difficulty 越界: ${JSON.stringify(a.difficulty)}`)
  assert(typeof a.diamondScore === 'number' && a.diamondScore >= 0, `${ctx} diamondScore 应为非负数`)
  assert(typeof a.id === 'string' && ANIMAL_ID_RE.test(a.id), `${ctx} id 不合法: ${JSON.stringify(a.id)}`)

  // drinkTime
  assert(Array.isArray(a.drinkTime), `${ctx} drinkTime 应为数组`)
  if (Array.isArray(a.drinkTime)) {
    assert(new Set(a.drinkTime).size === a.drinkTime.length, `${ctx} drinkTime 有重复时段`)
    a.drinkTime.forEach((t) => {
      if (typeof t !== 'string' || !TIME_RANGE_RE.test(t)) {
        errors.push(`${ctx} drinkTime 格式非法: ${JSON.stringify(t)}（应为 HH:MM - HH:MM）`)
      }
      if (typeof t === 'string' && /<br/i.test(t)) {
        errors.push(`${ctx} drinkTime 严禁内嵌 HTML 标签: ${t}`)
      }
    })
  }

  // furTypeIds
  const fur = a.furTypeIds
  assert(fur && typeof fur === 'object' && !Array.isArray(fur), `${ctx} furTypeIds 应为对象`)
  if (fur) {
    FUR_CATEGORIES.forEach((cat) => {
      assert(Array.isArray(fur[cat]), `${ctx} furTypeIds.${cat} 应为数组`)
      if (Array.isArray(fur[cat])) {
        assert(new Set(fur[cat]).size === fur[cat].length, `${ctx} furTypeIds.${cat} 有重复`)
        fur[cat].forEach((id) => {
          if (typeof id !== 'string' || !furIdSet.has(id)) {
            errors.push(`${ctx} furTypeIds.${cat} 引用不存在的毛色 id: ${JSON.stringify(id)}`)
          }
        })
      }
    })
    const extraKeys = Object.keys(fur).filter((k) => !FUR_CATEGORIES.includes(k))
    if (extraKeys.length) errors.push(`${ctx} furTypeIds 含未声明分类: ${extraKeys.join(',')}`)
  }

  // mapIds / lureIds
  assert(Array.isArray(a.mapIds), `${ctx} mapIds 应为数组`)
  if (Array.isArray(a.mapIds)) {
    assert(new Set(a.mapIds).size === a.mapIds.length, `${ctx} mapIds 有重复`)
    a.mapIds.forEach((id) => {
      if (typeof id !== 'string' || !mapIdSet.has(id)) {
        errors.push(`${ctx} mapIds 引用不存在的地图 id: ${JSON.stringify(id)}`)
      }
    })
  }
  assert(Array.isArray(a.lureIds), `${ctx} lureIds 应为数组`)
  if (Array.isArray(a.lureIds)) {
    assert(new Set(a.lureIds).size === a.lureIds.length, `${ctx} lureIds 有重复`)
    a.lureIds.forEach((id) => {
      if (typeof id !== 'string' || !lureIdSet.has(id)) {
        errors.push(`${ctx} lureIds 引用不存在的诱饵 id: ${JSON.stringify(id)}`)
      }
    })
  }

  // 未声明字段
  const allowed = ['id', 'name', 'englishName', 'level', 'difficulty', 'drinkTime', 'diamondScore', 'furTypeIds', 'mapIds', 'lureIds']
  const extra = Object.keys(a).filter((k) => !allowed.includes(k))
  if (extra.length) errors.push(`${ctx} 含未声明字段: ${extra.join(',')}`)
})

// ---------- 版本信息 ----------

if (versions && typeof versions === 'object') {
  assert(typeof versions.current === 'string' && versions.current, 'versions.current 缺失')
  assert(typeof versions.gameVersion === 'string', 'versions.gameVersion 应为字符串')
  assert(typeof versions.updatedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(versions.updatedAt), 'versions.updatedAt 应为 YYYY-MM-DD')
}

// ---------- 冗余数据提醒（不阻断） ----------

const unusedFur = furTypes.filter((f) => !animals.some((a) =>
  (a.furTypeIds?.common || []).includes(f.id) ||
  (a.furTypeIds?.rare || []).includes(f.id) ||
  (a.furTypeIds?.precious || []).includes(f.id)
))
if (unusedFur.length) warnings.push(`未被引用的毛色: ${unusedFur.map((f) => f.name).join('、')}`)

const unusedMaps = maps.filter((m) => !animals.some((a) => a.mapIds?.includes(m.id)))
if (unusedMaps.length) warnings.push(`无动物的地图: ${unusedMaps.map((m) => m.name).join('、')}`)

const unusedLures = lures.filter((l) => !animals.some((a) => a.lureIds?.includes(l.id)))
if (unusedLures.length) warnings.push(`未被引用的诱饵: ${unusedLures.map((l) => l.name).join('、')}`)

// ---------- 结果 ----------

if (warnings.length) {
  console.log(`⚠ ${warnings.length} 条提醒:`)
  warnings.forEach((w) => console.log(`  - ${w}`))
}

if (errors.length) {
  console.error(`✗ 校验失败，共 ${errors.length} 个错误:`)
  errors.forEach((e) => console.error(`  - ${e}`))
  process.exit(1)
}

console.log(`✓ 校验通过：${animals.length} 条动物 / ${maps.length} 张地图 / ${furTypes.length} 种毛色 / ${lures.length} 种诱饵`)
console.log(`  数据版本 v${versions.current} · 游戏版本 ${versions.gameVersion} · 更新于 ${versions.updatedAt}`)
