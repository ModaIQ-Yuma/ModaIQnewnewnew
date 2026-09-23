// ─── 前端分页：数据已在内存，只切片显示；筛选/排序条件变了自动回到第 1 页 ───
import { useEffect, useMemo, useState } from "react";

/**
 * @param rows     已筛选、已排序的完整列表
 * @param resetKey 任意可比较的值（如筛选条件拼成的字符串），变化时回到第 1 页
 */
export function usePaged(rows, pageSize = 50, resetKey = "") {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [resetKey]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => rows.slice((safePage - 1) * pageSize, safePage * pageSize), [rows, safePage, pageSize]);
  return { page: safePage, setPage, totalPages, pageRows };
}
