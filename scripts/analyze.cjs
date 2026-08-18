// 分析 cotw-helper 现有 animal-data.json 的取值分布
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '..', 'animal-data.json'), 'utf8');
const data = JSON.parse(raw);

console.log('=== 基础统计 ===');
console.log('动物总数:', data.length);

// 检查每条记录的字段完整性
const allKeys = new Set();
data.forEach(a => Object.keys(a).forEach(k => allKeys.add(k)));
console.log('所有字段:', [...allKeys].join(', '));

const missing = data.filter(a => !a.id === undefined).length;
console.log('缺 id 的记录数（旧数据无 id 字段，正常）:', data.filter(a => a.id === undefined).length);
console.log('缺 name:', data.filter(a => !a.name).length);
console.log('缺 englishName:', data.filter(a => !a.englishName).length);
console.log('缺 level:', data.filter(a => a.level === undefined).length);
console.log('缺 difficulty:', data.filter(a => !a.difficulty).length);
console.log('缺 drinkTime:', data.filter(a => a.drinkTime === undefined).length);
console.log('缺 diamondScore:', data.filter(a => a.diamondScore === undefined).length);
console.log('缺 furTypes:', data.filter(a => !a.furTypes).length);
console.log('缺 maps:', data.filter(a => !a.maps).length);
console.log('缺 lures:', data.filter(a => !a.lures).length);

console.log('\n=== 难度值分布 ===');
const diffs = {};
data.forEach(a => diffs[a.difficulty] = (diffs[a.difficulty] || 0) + 1);
Object.entries(diffs).forEach(([k, v]) => console.log(`${k}: ${v}`));

console.log('\n=== level 分布 ===');
const lvls = {};
data.forEach(a => lvls[a.level] = (lvls[a.level] || 0) + 1);
Object.entries(lvls).sort((a, b) => a[0] - b[0]).forEach(([k, v]) => console.log(`${k}: ${v}`));

console.log('\n=== 唯一地图名 ===');
const maps = [...new Set(data.flatMap(a => a.maps || []))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
console.log('地图数量:', maps.length);
maps.forEach(m => {
  const count = data.filter(a => (a.maps || []).includes(m)).length;
  console.log(`- ${m} (${count} 种动物)`);
});

console.log('\n=== 唯一毛色名（含分类） ===');
const furs = {};
data.forEach(a => {
  if (!a.furTypes) return;
  Object.entries(a.furTypes).forEach(([cat, list]) => {
    (list || []).forEach(f => {
      if (!furs[f]) furs[f] = { common: 0, rare: 0, precious: 0 };
      furs[f][cat]++;
    });
  });
});
const furNames = Object.keys(furs).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
console.log('唯一毛色名数量:', furNames.length);
furNames.forEach(f => {
  const c = furs[f];
  console.log(`- ${f} (common:${c.common}, rare:${c.rare}, precious:${c.precious})`);
});

console.log('\n=== 唯一诱饵名 ===');
const lures = [...new Set(data.flatMap(a => a.lures || []))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
console.log('诱饵数量:', lures.length);
lures.forEach(l => {
  const count = data.filter(a => (a.lures || []).includes(l)).length;
  console.log(`- ${l} (${count} 种动物)`);
});

console.log('\n=== drinkTime 取值模式 ===');
const drinkPatterns = new Set();
let brCount = 0;
data.forEach(a => {
  if (a.drinkTime && a.drinkTime.includes('<br/>')) brCount++;
  drinkPatterns.add(a.drinkTime);
});
console.log('含 <br/> 的记录数:', brCount);
console.log('唯一 drinkTime 值数量:', drinkPatterns.size);
const sorted = [...drinkPatterns].sort((a, b) => (a||'').localeCompare(b||'', 'zh-Hans-CN'));
sorted.slice(0, 60).forEach(d => console.log(`- [${d}]`));
if (sorted.length > 60) console.log(`... 还有 ${sorted.length - 60} 个`);
