/**
 * cotw-helper 动物资料数据源类型定义
 * 与 schema/animal.schema.json 保持等价，二者任选其一作为数据契约
 */

export type FurCategory = 'common' | 'rare' | 'precious'

export type Difficulty = '3 - 非常简单' | '5 - 中等' | '9 - 传奇'

export interface NamedEntry {
  /** 稳定标识，被 animals 引用 */
  id: string
  /** 展示名称 */
  name: string
}

export interface Animal {
  /** 动物稳定标识，英文名 slug 化 */
  id: string
  /** 中文名 */
  name: string
  /** 英文名，可为空字符串 */
  englishName: string
  /** 游戏内动物等级 1-9 */
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  /** 难度枚举，值含等级前缀，展示时直接使用 */
  difficulty: Difficulty
  /** 饮水/活动时间段。空数组表示无数据；多元素表示多时段。严禁内嵌 HTML */
  drinkTime: string[]
  /** 钻石评分线 */
  diamondScore: number
  /** 毛色引用，按稀有度分类；值引用 FurType.id */
  furTypeIds: Record<FurCategory, string[]>
  /** 可狩猎地图引用，值引用 MapEntry.id */
  mapIds: string[]
  /** 诱饵引用，值引用 LureEntry.id */
  lureIds: string[]
}

export interface VersionInfo {
  /** 数据版本号（semver） */
  current: string
  /** 对应的游戏版本，未知时为 '未知（待录入）' */
  gameVersion: string
  /** 数据最后更新日期 */
  updatedAt: string
}

export interface DatasetMeta {
  version: string
  gameVersion: string
  updatedAt: string
  count: number
  builtAt: string
  generatedBy: string
}

export interface Dataset {
  meta: DatasetMeta
  maps: NamedEntry[]
  furTypes: NamedEntry[]
  lures: NamedEntry[]
  animals: Animal[]
}
