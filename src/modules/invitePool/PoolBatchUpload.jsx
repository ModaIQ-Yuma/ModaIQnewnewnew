// modules/invitePool/PoolBatchUpload.jsx — 邀约库批量上传：选录入人 + 勾产品 + 粘贴/上传名单 → 预览 → 写入
import { useState } from "react";
import { T, glassStyle } from "../../constants/tokens.js";
import { readSheetRows } from "../../lib/crm/readSheet.js";
import { planPoolBatch, splitPasted, listFromSheet, MAX_BATCH } from "../../lib/invitePool/poolBatch.js";
import { adderValueOf } from "../../lib/invitePool/adder.js";
import { addPoolRows } from "../../lib/supabase/unconnectedWrite.js";
import PoolBatchPreview from "./PoolBatchPreview.jsx";
import { s } from "./invitePoolStyles.js";

export default function PoolBatchUpload({ ctx, nameIndex, staffName, onClose }) {
  const { storeId, userId, products = [], core } = ctx;
  const pickAdder = ctx.can("pool.pickAdder");                         // 管理员可替别人上传；成员固定为自己
  const roster = (ctx.staff || []).filter((x) => x.is_active !== false);
  const [adderStaffId, setAdderStaffId] = useState(ctx.myStaffId || "");
  const [productIds, setProductIds] = useState([]);
  const [pasted, setPasted] = useState("");
  const [fileInputs, setFileInputs] = useState(null);                  // { name, list }
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const inputs = [...splitPasted(pasted), ...(fileInputs?.list || [])];
  const reset = () => { setPlan(null); setError(""); };

  async function onFile(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    try { setFileInputs({ name: file.name, list: listFromSheet(readSheetRows(await file.arrayBuffer(), file.name)) }); reset(); }
    catch (err) { setError(`文件读取失败：${err.message}`); }
  }

  function onCheck() {
    if (pickAdder && !adderStaffId) return setError("请选择录入人");
    if (!productIds.length) return setError("请至少勾选一个产品");
    if (!inputs.length) return setError("请粘贴名单或上传文件");
    const p = planPoolBatch({ inputs, productIds, products, core, nameIndex, staffName });
    if (p.tooMany) return setError(`一次最多上传 ${MAX_BATCH} 个达人，这次有 ${p.creatorCount} 个，请分批`);
    setError(""); setPlan(p);
  }

  async function onConfirm() {
    const adder = pickAdder ? roster.find((x) => x.id === adderStaffId) : null;
    setBusy(true);
    try {
      const written = await addPoolRows(storeId, plan.rows, adder ? adderValueOf(adder) : userId);
      setResult({ written, raced: plan.rows.length - written });
      await core.refresh(["invites"]);
    } catch (err) { setError(`写入失败：${err.message}`); }
    finally { setBusy(false); }
  }

  const toggle = (id) => { setProductIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]); reset(); };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div style={{ ...glassStyle(16), ...s.modal }}>
        <div style={s.modalHead}>
          <span>批量上传邀约达人</span>
          <button style={s.btnGhost} onClick={onClose} disabled={busy}>关闭</button>
        </div>

        {result ? (
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.8 }}>
            已写入 <b>{result.written}</b> 条。
            {result.raced > 0 && <div style={s.note}>另有 {result.raced} 条在你上传的同时已被别人录入，已自动跳过。</div>}
            <div style={s.footer}><button style={s.btn} onClick={onClose}>完成</button></div>
          </div>
        ) : plan ? (
          <PoolBatchPreview plan={plan} busy={busy} error={error} onBack={() => setPlan(null)} onConfirm={onConfirm} />
        ) : (<>
          <div style={s.label}>录入人</div>
          {pickAdder ? (
            <select style={s.sel} value={adderStaffId} onChange={(e) => setAdderStaffId(e.target.value)}>
              <option value="">请选择</option>
              {roster.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          ) : <div style={{ fontSize: 13, color: T.text }}>{staffName(ctx.myStaffId) === "未指定" ? "我" : staffName(ctx.myStaffId)}</div>}

          <div style={s.label}>产品（每个达人 × 每个勾选的产品，各录一条）</div>
          <div style={s.checks}>
            {products.map((p) => (
              <label key={p.id} style={s.checkLabel}>
                <input type="checkbox" checked={productIds.includes(p.id)} onChange={() => toggle(p.id)} />
                <span style={{ color: T.text, fontSize: 13 }}>{p.internal_name}</span>
              </label>
            ))}
          </div>

          <div style={s.label}>达人名单：粘贴（换行、逗号、空格分隔都行），或上传表格（取第一列）</div>
          <textarea style={s.textarea} value={pasted} placeholder={"amy.style\n@bella_fit\nhttps://www.tiktok.com/@cara.wears"}
            onChange={(e) => { setPasted(e.target.value); reset(); }} />
          <div style={{ ...s.row, marginTop: 8 }}>
            <label style={{ ...s.btnGhost, display: "inline-block" }}>
              上传 Excel / CSV
              <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{ display: "none" }} />
            </label>
            {fileInputs && <span style={s.note}>{fileInputs.name}：{fileInputs.list.length} 行
              <button style={{ ...s.btnDanger, marginLeft: 8 }} onClick={() => { setFileInputs(null); reset(); }}>移除</button></span>}
          </div>
          <div style={s.note}>自动去掉 @ 和空格、统一小写；主页链接会自动提取 username。共 {inputs.length} 个输入。</div>

          {error && <div style={s.err}>{error}</div>}
          <div style={s.footer}><button style={s.btn} onClick={onCheck}>检查名单</button></div>
        </>)}
      </div>
    </div>
  );
}
