// 迁移脚本：把旧版单文件 animal-data.json（扁平数组）转换为规范化数据源
// 产物：src/data/maps.json、fur-types.json、lures.json、animals.json、versions.json
// 零依赖，node scripts/migrate.cjs 即可运行
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OLD_FILE = path.join(ROOT, 'animal-data.json');
const DATA_DIR = path.join(ROOT, 'src', 'data');

if (!fs.existsSync(OLD_FILE)) {
  console.error('未找到旧数据文件 animal-data.json，请确认在仓库根目录运行');
  process.exit(1);
}

const oldData = JSON.parse(fs.readFileSync(OLD_FILE, 'utf8'));
if (!Array.isArray(oldData)) {
  console.error('animal-data.json 顶层不是数组，格式异常');
  process.exit(1);
}

// ---------- 工具函数 ----------

// 把英文名转成稳定 slug id（小写、非字母数字转连字符）
const slugify = (s) => {
  return (s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// 归一化 drinkTime：拆掉 <br/> 与 <br>，过滤 "-" 占位与空串，并去重
const parseDrinkTime = (raw) => {
  if (!raw || typeof raw !== 'string') return [];
  return [...new Set(
    raw
      .split(/<br\s*\/?>/i)
      .map((t) => t.trim())
      .filter((t) => t && t !== '-')
  )];
};

// 数组去重（规范化的一部分：清理源数据中的重复项）
const dedupe = (list) => [...new Set(list || [])];

// ---------- 维度表构建（去重，保持首次出现顺序，便于人类阅读） ----------

const mapNames = [];
const mapNameSet = new Set();
const furNames = [];
const furNameSet = new Set();
const lureNames = [];
const lureNameSet = new Set();

oldData.forEach((a) => {
  (a.maps || []).forEach((m) => {
    if (!mapNameSet.has(m)) {
      mapNameSet.add(m);
      mapNames.push(m);
    }
  });
  Object.values(a.furTypes || {}).forEach((list) => {
    (list || []).forEach((f) => {
      if (!furNameSet.has(f)) {
        furNameSet.add(f);
        furNames.push(f);
      }
    });
  });
  (a.lures || []).forEach((l) => {
    if (!lureNameSet.has(l)) {
      lureNameSet.add(l);
      lureNames.push(l);
    }
  });
});

const maps = mapNames.map((name) => ({ id: name, name }));
const furTypes = furNames.map((name) => ({ id: name, name }));
const lures = lureNames.map((name) => ({ id: name, name }));

// ---------- 动物转换 ----------

const usedIds = new Set();
const animals = oldData.map((a) => {
  // 动物 id：优先英文名 slug；冲突或缺失时退回中文名/序号
  let base = slugify(a.englishName) || slugify(a.name) || 'animal';
  let id = base;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${base}-${n++}`;
  }
  usedIds.add(id);

  const furTypeIds = { common: [], rare: [], precious: [] };
  Object.entries(a.furTypes || {}).forEach(([cat, list]) => {
    if (furTypeIds[cat] && Array.isArray(list)) {
      furTypeIds[cat] = dedupe(list);
    }
  });

  return {
    id,
    name: a.name,
    englishName: a.englishName || '',
    level: a.level,
    difficulty: a.difficulty,
    drinkTime: parseDrinkTime(a.drinkTime),
    diamondScore: a.diamondScore,
    furTypeIds,
    mapIds: dedupe(a.maps),
    lureIds: dedupe(a.lures),
  };
});

// ---------- 版本信息 ----------

const versions = {
  current: '1.0.0',
  gameVersion: '未知（待录入）',
  updatedAt: new Date().toISOString().slice(0, 10),
};

// ---------- 备份旧数据（溯源与一致性验证依据） ----------

const LEGACY_DIR = path.join(DATA_DIR, '_legacy');
fs.mkdirSync(LEGACY_DIR, { recursive: true });
fs.copyFileSync(OLD_FILE, path.join(LEGACY_DIR, 'animal-data.legacy.json'));
console.log(`已备份旧数据 → src/data/_legacy/animal-data.legacy.json`);

// ---------- 写文件 ----------

fs.mkdirSync(DATA_DIR, { recursive: true });
const write = (file, obj) => {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(obj, null, 2) + '\n', 'utf8');
};

write('maps.json', maps);
write('fur-types.json', furTypes);
write('lures.json', lures);
write('animals.json', animals);
write('versions.json', versions);

// ---------- 迁移报告 ----------

const drinkEmpty = animals.filter((a) => a.drinkTime.length === 0).length;
const drinkMulti = animals.filter((a) => a.drinkTime.length > 1).length;
const furPrecious = animals.filter((a) => a.furTypeIds.precious.length > 0).length;
const lureOwned = animals.filter((a) => a.lureIds.length > 0).length;

console.log('=== 迁移完成 ===');
console.log(`动物: ${oldData.length} 条 → ${animals.length} 条（id 唯一性检查通过）`);
console.log(`地图: ${maps.length} 张`);
console.log(`毛色: ${furTypes.length} 种`);
console.log(`诱饵: ${lures.length} 种`);
console.log(`drinkTime 空(原 "-")：${drinkEmpty} 条，多时段：${drinkMulti} 条`);
console.log(`含珍稀毛色：${furPrecious} 条，有诱饵：${lureOwned} 条`);
console.log('输出: src/data/{maps,fur-types,lures,animals,versions}.json');
