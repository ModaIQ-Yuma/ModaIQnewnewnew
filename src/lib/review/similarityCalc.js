// lib/review/similarityCalc.js — 产品相似度计算
import { calcProductFactors } from "./attributionCalc.js";

function productTopOptions(factors) {
  const tops = new Set();
  for (const f of factors) {
    const top = f.opts.find((o) => o.value !== "__未标注__");
    if (top) tops.add(`${f.key}__${top.value}`);
  }
  return tops;
}

function jaccardSim(a, b) {
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}

export function calcProductSimilarity(entries, products, threshold) {
  const topMap = {};
  for (const p of products) {
    const { factors } = calcProductFactors(entries, p.id, threshold);
    if (factors.length > 0) topMap[p.id] = { name: p.internal_name, tops: productTopOptions(factors) };
  }
  const ids = Object.keys(topMap);
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const sim = jaccardSim(topMap[ids[i]].tops, topMap[ids[j]].tops);
      if (sim > 0.3) pairs.push({ aId: ids[i], a: topMap[ids[i]].name, bId: ids[j], b: topMap[ids[j]].name, sim });
    }
  }
  return pairs.sort((a, b) => b.sim - a.sim);
}
