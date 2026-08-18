// 一致性验证：对比旧版 animal-data.json 与构建产物，确保迁移无丢失/无篡改
// 用法：node scripts/verify-consistency.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// 对比基准：迁移时备份的旧版数据
const oldData = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', '_legacy', 'animal-data.legacy.json'), 'utf8'));
const newData = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'animal-data.json'), 'utf8'));

const parseDrink = (raw) => {
  if (!raw || typeof raw !== 'string') return [];
  return [...new Set(raw.split(/<br\s*\/?>/i).map((t) => t.trim()).filter((t) => t && t !== '-'))];
};
const eqSet = (a, b) => {
  const sa = new Set(a || []);
  const sb = new Set(b || []);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
};

if (oldData.length !== newData.animals.length) {
  console.error(`✗ 条数不一致: 旧 ${oldData.length} / 新 ${newData.animals.length}`);
  process.exit(1);
}

const problems = [];
oldData.forEach((old, i) => {
  const neu = newData.animals[i];
  const ctx = `[${i}] ${old.name}(${old.englishName})`;
  if (neu.name !== old.name) problems.push(`${ctx} name 不一致: ${neu.name}`);
  if (neu.englishName !== old.englishName) problems.push(`${ctx} englishName 不一致: ${neu.englishName}`);
  if (neu.level !== old.level) problems.push(`${ctx} level 不一致: ${neu.level}`);
  if (neu.difficulty !== old.difficulty) problems.push(`${ctx} difficulty 不一致: ${neu.difficulty}`);
  if (neu.diamondScore !== old.diamondScore) problems.push(`${ctx} diamondScore 不一致: ${neu.diamondScore}`);
  if (JSON.stringify(neu.drinkTime) !== JSON.stringify(parseDrink(old.drinkTime))) {
    problems.push(`${ctx} drinkTime 不一致: ${JSON.stringify(neu.drinkTime)} vs ${JSON.stringify(parseDrink(old.drinkTime))}`);
  }
  ['common', 'rare', 'precious'].forEach((cat) => {
    if (!eqSet(neu.furTypeIds[cat], old.furTypes[cat])) {
      problems.push(`${ctx} furTypes.${cat} 不一致: ${JSON.stringify(neu.furTypeIds[cat])} vs ${JSON.stringify(old.furTypes[cat])}`);
    }
  });
  if (!eqSet(neu.mapIds, old.maps)) problems.push(`${ctx} maps 不一致`);
  if (!eqSet(neu.lureIds, old.lures)) problems.push(`${ctx} lures 不一致`);
});

// 维度表一致性
const oldMaps = new Set(oldData.flatMap((a) => a.maps || []));
const newMaps = new Set(newData.maps.map((m) => m.id));
if (!eqSet(oldMaps, newMaps)) problems.push('地图集合不一致');
const oldLures = new Set(oldData.flatMap((a) => a.lures || []));
const newLures = new Set(newData.lures.map((l) => l.id));
if (!eqSet(oldLures, newLures)) problems.push('诱饵集合不一致');

if (problems.length) {
  console.error(`✗ 一致性验证失败，共 ${problems.length} 处差异:`);
  problems.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}

console.log(`✓ 一致性验证通过：${oldData.length} 条动物逐字段等价`);
console.log(`  地图 ${newData.maps.length} / 毛色 ${newData.furTypes.length} / 诱饵 ${newData.lures.length}`);
