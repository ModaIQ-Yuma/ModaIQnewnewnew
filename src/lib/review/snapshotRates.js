// ─── 快照字段与比率（纯函数）：存什么、看板怎么从存下的数还原比率 ──────────
// 口径与单品复盘（rangeCalc.calcRangeMetrics）一致，快照保存时已按「截止次月 5 日」算好分子分母。
// 分子或分母缺失（旧快照没存该列 / 分母为 0）→ null，界面显示「—」，不拿别的数顶替。
/** 单品复盘指标（calcRangeMetrics 结果 + 整店订单）→ grade_snapshots 的数值列；保存快照只走这里 */
export function snapshotFields(m) {
  return {
    ship_count: m.shipCount || 0, cooperate_count: m.shipCount || 0, fulfill_count: m.fulfillCount || 0,
    sale_creator_count: m.withSalesCount || 0, ship_orders: m.shipOrders || 0,
    video_count: m.videoCount || 0, video_with_sales: m.videoWithSales || 0, burst_count: m.burstCount || 0,
    orders: m.videoOrders || 0, vv: m.totalVV || 0, clicks: m.totalClicks || 0, gmv: 0,
    total_orders: m.totalOrders ?? null, organic_orders: m.organicOrders ?? null,
  };
}

const ratio = (a, b) => (a == null || !b ? null : a / b);

/** @param s grade_snapshots 一行 */
export function snapshotRates(s) {
  return {
    saleRate:         ratio(s.sale_creator_count, s.fulfill_count),  // 达人出单率 = 出单达人 ÷ 履约
    videoSaleRate:    ratio(s.video_with_sales, s.video_count),      // 视频出单率 = 出单视频 ÷ 新视频
    ctr:              ratio(s.clicks, s.vv),
    cvr:              ratio(s.orders, s.clicks),
    sampleSalesRatio: ratio(s.ship_orders, s.ship_count),            // 样销比 = 寄样累计出单 ÷ 寄样数
    videoOrderShare:  ratio(s.total_orders == null ? null : s.orders, s.total_orders),  // 新视频出单占整店
    organicShare:     ratio(s.organic_orders, s.total_orders),       // 自然单占整店
  };
}
