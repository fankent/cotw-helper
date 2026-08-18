/**
 * 构建脚本（零依赖）
 * 读取 src/data/ 数据源，合并生成构建产物：
 *   1. dist/animal-data.json  （规范产物，供部署）
 *   2. ./animal-data.json     （仓库根目录副本，保持线上路径不变）
 * 构建前自动执行契约校验，未通过则中止。
 * 用法：node scripts/build.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'src', 'data')
const DIST_DIR = path.join(ROOT, 'dist')

const read = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'))

// 先跑校验，不通过直接退出
execFileSync(process.execPath, [path.join(__dirname, 'validate.mjs')], { stdio: 'inherit' })

const maps = read('maps.json')
const furTypes = read('fur-types.json')
const lures = read('lures.json')
const animals = read('animals.json')
const versions = read('versions.json')

const dataset = {
  meta: {
    version: versions.current,
    gameVersion: versions.gameVersion,
    updatedAt: versions.updatedAt,
    count: animals.length,
    builtAt: new Date().toISOString(),
    generatedBy: 'cotw-helper/build.mjs',
  },
  maps,
  furTypes,
  lures,
  animals,
}

const output = JSON.stringify(dataset, null, 2) + '\n'

fs.mkdirSync(DIST_DIR, { recursive: true })
fs.writeFileSync(path.join(DIST_DIR, 'animal-data.json'), output, 'utf8')
fs.writeFileSync(path.join(ROOT, 'animal-data.json'), output, 'utf8')

console.log(`✓ 构建完成：${animals.length} 条动物 → dist/animal-data.json 与 ./animal-data.json`)
console.log(`  数据版本 v${versions.current} · 游戏版本 ${versions.gameVersion} · ${output.length.toLocaleString()} 字节`)
