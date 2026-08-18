# 《猎人：荒野的召唤》游戏动物资料

网站提供游戏《猎人：荒野的召唤》动物资料查询功能。

> 《猎人：荒野的召唤》是一款由 Avalanche Studios 开发的第一人称射击打猎游戏。为玩家提供一个美丽开放且充满生机的自然世界，打造身临其境的个人狩猎经历。从雄伟的野鹿再到令人敬畏的野牛，从无数的鸟类再到昆虫，整个真实的自然生态系统都将呈现在玩家眼前。游戏内设有 50 平方英里的自然区域，除了包含单人模式，游戏最多还支持 8 人联机合作。

- 所有数据均来源于网络收集，仅供参考
- 名称/毛色翻译可能有误
- 随着游戏更新，动物信息可能变更

![网页截图](https://fankent.github.io/cotw-helper/screenshot.jpeg)

---

## 项目结构（规范化后）

```
cotw-helper/
├── index.html                  # 前端页面（引用 ./animal-data.json）
├── animal-data.json            # 构建产物（保持与原线上路径兼容）
├── package.json                # npm 脚本入口
├── schema/
│   └── animal.schema.json      # 数据契约（JSON Schema）
├── types/
│   └── animal.ts               # TypeScript 类型定义
├── src/data/                   # 数据源（从此处修改）
│   ├── _legacy/
│   │   └── animal-data.legacy.json   # 旧数据备份（溯源用）
│   ├── maps.json               # 地图维度表
│   ├── fur-types.json          # 毛色维度表
│   ├── lures.json              # 诱饵维度表
│   ├── animals.json            # 动物主数据（规范化结构）
│   └── versions.json           # 数据版本与游戏版本
├── scripts/
│   ├── analyze.cjs             # 分析旧数据取值分布
│   ├── migrate.cjs             # 旧数据 → 新结构迁移（一次性）
│   ├── validate.mjs            # 数据契约校验
│   ├── build.mjs               # 合并生成 animal-data.json
│   └── verify-consistency.cjs  # 新旧数据逐字段对比
└── dist/
    └── animal-data.json        # 规范构建产物
```

## 常用命令

```bash
# 分析现有数据分布
npm run analyze

# 数据校验（校验字段类型、枚举、引用完整性、重复 id 等）
npm run validate

# 构建产物（生成 dist/ 与根目录 animal-data.json）
npm run build

# 一键检查：校验 + 构建
npm run check

# 验证新旧数据等价（迁移后跑一遍确认无丢失）
node scripts/verify-consistency.cjs
```

## 更新数据的正确姿势

1. **修改数据源**：只改 `src/data/` 下的文件，不要直接手写根目录 `animal-data.json`。
2. **运行校验**：`npm run validate`，确保字段、枚举、引用关系都合法。
3. **运行构建**：`npm run build`，产物会自动同步到 `dist/` 与根目录。
4. **提交并推送**：GitHub Actions 会在 push/PR 时自动跑 `npm run check`。

## 数据规范化说明

- **维度表拆分**：地图、毛色、诱饵各有一份维度表，动物主数据通过 `mapIds` / `furTypeIds` / `lureIds` 引用，避免同一份中文名在 125 条记录里反复出现。
- **drinkTime 数组化**：原数据把多时段塞在一个字符串里，并混用 `<br/>` / `<br>` / `-` 占位；新规范改为 `string[]`，展示层负责多行渲染。
- **数据版本化**：`src/data/versions.json` 维护 `current`（数据版本）、`gameVersion`（游戏版本）、`updatedAt`；构建后写入 `animal-data.json.meta`，页脚自动展示。
- **唯一标识**：动物使用英文名 slug 作为 `id`（如 `bengal-tiger`），维度表使用中文名作为稳定 `id`。
- **XSS 防护**：前端渲染所有动态文本统一经过 `escapeHtml` 转义。

## 阶段一目标达成

- ✅ 数据源拆分 + TS 类型 + JSON Schema 契约
- ✅ 校验脚本（字段、枚举、引用完整性、重复 id）
- ✅ 构建脚本 + GitHub Actions CI 自动校验
- ✅ 数据版本化 + 旧数据备份
- ✅ 前端适配新结构 + 真实渲染验证
