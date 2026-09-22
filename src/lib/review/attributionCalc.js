// lib/review/attributionCalc.js — 归因分析纯函数（照旧版逻辑，数据源已适配新版）
import { CREATOR_FIELDS } from "../../constants/creatorOptions.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";

// 参与归因的标签字段（排除 text 类型）
export const ATTR_FIELDS = CREATOR_FIELDS
  .filter((f) => f.type === "single" || f.type === "multi")
  .map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options }));

const FIELD_TYPE_MAP = Object.fromEntries(ATTR_FIELDS.map((f) => [f.key, f.type]));

function getFieldValues(creator, key, type) {
  const v = creator[key];
  if (!v) return [];
  if (type === "multi") {
    return Array.isArray(v)
      ? v
      : String(v).split(/[,，、]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [String(v)];
}

/**
 * 把 collaborations + video_records + creators 组装成归因计算需要的格式
 * 返回 [{ creatorId, handle, product_id, productName, attrs, videos }]
 */
export function buildAttrEntries(collabs, videos, creators, products) {
  const creatorMap  = Object.fromEntries(creators.map((c) => [c.id, c]));
  const productMap  = Object.fromEntries(products.map((p) => [p.id, p]));
  const videosByCollab = {};
  for (const v of videos) {
    if (!v.collaboration_id) continue;
    if (!videosByCollab[v.collaboration_id]) videosByCollab[v.collaboration_id] = [];
    videosByCollab[v.collaboration_id].push(v);
  }

  return collabs.map((col) => {
    const creator = creatorMap[col.creator_id];
    const product = productMap[col.product_id];
    if (!creator || !product) return null;
    return {
      creatorId:   creator.id,
      handle:      creator.handle,
      product_id:  col.product_id,
      productName: product.internal_name,
      attrs:       creator,
      videos:      (videosByCollab[col.id] || []).map((v) => ({ orders: v.orders || 0, vv: v.vv || 0, clicks: v.clicks || 0 })),
    };
  }).filter(Boolean);
}

// ─── 爆单因子分析 ─────────────────────────────────────────────────────────────

export function calcProductFactors(entries, productId, threshold = BURST_ORDER_THRESHOLD) {
  const scoped     = entries.filter((e) => e.product_id === productId);
  const totalVideos = scoped.reduce((s, e) => s + e.videos.length, 0);
  const useAvgMode  = totalVideos <= 30;

  const fieldStats = {};
  ATTR_FIELDS.forEach((f) => { fieldStats[f.key] = {}; });

  for (const { attrs, videos } of scoped) {
    for (const { key, type } of ATTR_FIELDS) {
      let vals = getFieldValues(attrs, key, type);
      if (!vals.length) vals = ["__未标注__"];
      for (const val of vals) {
        if (!fieldStats[key][val]) fieldStats[key][val] = { total: 0, hits: 0, orders: 0 };
        for (const v of videos) {
          const o = Number(v.orders) || 0;
          fieldStats[key][val].total++;
          if (!useAvgMode && o >= threshold) fieldStats[key][val].hits++;
          fieldStats[key][val].orders += o;
        }
      }
    }
  }

  const factors = ATTR_FIELDS.map((f) => {
    const opts = Object.entries(fieldStats[f.key])
      .filter(([, s]) => s.total >= 2)
      .map(([value, s]) => ({
        value,
        label: value === "__未标注__" ? "未标注" : (f.options.find((o) => o.value === value)?.label || value),
        total: s.total,
        rate:  useAvgMode ? null : s.total > 0 ? s.hits / s.total : 0,
        avg:   s.total > 0 ? s.orders / s.total : 0,
      }))
      .sort((a, b) => useAvgMode ? b.avg - a.avg : b.rate - a.rate);

    const valid = opts.filter((o) => o.value !== "__未标注__");
    let discrimination = 0;
    if (valid.length >= 2) {
      const vals = valid.map((o) => useAvgMode ? o.avg : o.rate);
      discrimination = Math.max(...vals) - Math.min(...vals);
    }
    return { key: f.key, label: f.label, opts, discrimination, useAvgMode, totalVideos };
  }).filter((f) => f.opts.length > 0).sort((a, b) => b.discrimination - a.discrimination);

  return { factors, totalVideos, useAvgMode, threshold };
}

// ─── 达人推荐 ─────────────────────────────────────────────────────────────────

export function scoreCreators(entries, productId, factors) {
  const shippedIds = new Set(entries.filter((e) => e.product_id === productId).map((e) => e.creatorId));
  const seen = new Set();
  const candidates = [];
  for (const e of entries) {
    if (shippedIds.has(e.creatorId)) continue;
    if (seen.has(e.creatorId)) continue;
    seen.add(e.creatorId);
    candidates.push(e);
  }

  const maxDisc = Math.max(...factors.map((f) => f.discrimination), 0.001);

  return candidates.map((e) => {
    let score = 0; const hits = [];
    for (const f of factors) {
      const vals     = getFieldValues(e.attrs, f.key, FIELD_TYPE_MAP[f.key] || "single");
      if (!vals.length) continue;
      const bestOpt  = f.opts.filter((o) => vals.includes(o.value)).sort((a, b) => (b.rate ?? b.avg) - (a.rate ?? a.avg))[0];
      if (!bestOpt) continue;
      const metricVal = bestOpt.rate ?? bestOpt.avg;
      const weight    = f.discrimination / maxDisc;
      score += metricVal * weight;
      hits.push({ label: f.label, value: bestOpt.label, metric: metricVal, weight });
    }
    return { handle: e.handle, creatorId: e.creatorId, score, hits };
  }).filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
}

// calcProductSimilarity 已拆到 lib/review/similarityCalc.js
export { calcProductSimilarity } from "./similarityCalc.js";
