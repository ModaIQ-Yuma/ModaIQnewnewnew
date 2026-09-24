// ─── 复盘区间状态：选月份自动填默认区间，也可手动改成任意日期或「全部」──────
import { useCallback, useState } from "react";
import { monthRanges } from "../lib/review/reviewCalc.js";

const same = (a, b) => (a?.from || "") === (b?.from || "") && (a?.to || "") === (b?.to || "");

export function useReviewRange(initialYm) {
  const [ym, setYmRaw] = useState(initialYm);
  const [ship, setShip]   = useState(() => monthRanges(initialYm).ship);
  const [video, setVideo] = useState(() => monthRanges(initialYm).video);

  const setYm = useCallback((v) => {
    setYmRaw(v);
    const r = monthRanges(v);
    setShip(r.ship); setVideo(r.video);
  }, []);

  const def = monthRanges(ym);
  /** 当前区间是否就是该月的默认口径（用于决定能否拿去存快照、FSorder 用哪个窗口） */
  const isMonthDefault = same(ship, def.ship) && same(video, def.video);
  return { ym, setYm, ship, setShip, video, setVideo, isMonthDefault };
}
