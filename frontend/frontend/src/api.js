export const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function req(path, opts) {
  let res;
  try { res = await fetch(BASE + path, opts); }
  catch { throw new Error(`Can't reach the API at ${BASE}. Start the backend first.`); }
  if (!res.ok) {
    let msg = "";
    try { const b = await res.json(); msg = typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail ?? b); } catch {}
    const e = new Error(msg || `Request failed (${res.status}).`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}
const post = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Tries each route in order; moves on only when a route doesn't exist (404/405).
async function first(tries) {
  let last;
  for (const t of tries) {
    try { return await t(); } catch (e) { last = e; if (![404, 405].includes(e.status)) throw e; }
  }
  throw last;
}

export const api = {
  health: () => req("/health"),
  list: async () => { const d = await req("/documents"); return Array.isArray(d) ? d : d.documents || []; },
  upload: (file) => {
    const form = () => { const f = new FormData(); f.append("file", file); return { method: "POST", body: f }; };
    return first([() => req("/documents/extract", form()), () => req("/documents/upload", form())]);
  },
  compare: (a, b) => first([
    () => req("/documents/compare", post({ old_document_id: a, new_document_id: b })),
    () => req("/compare", post({ document_a_id: a, document_b_id: b })),
  ]),
  ask: (question, ids) => req("/ask", post({ question, document_ids: ids })),
};

// -> [{ id, type: "insert" | "delete" | "replace", page, before, after }]
export function normalizeChanges(res) {
  const c = res?.comparison;
  const raw = Array.isArray(res) ? res : res?.changes || res?.differences || res?.diffs ||
    (Array.isArray(c) ? c : c?.changes || c?.differences || c?.diffs) || [];
  return raw.map((x, i) => {
    const t = String(x.type || x.tag || x.operation || x.change_type || "").toLowerCase();
    const type = /^(ins|add)/.test(t) ? "insert" : /^(del|rem)/.test(t) ? "delete" : "replace";
    let before = x.old_text ?? x.before ?? x.text_a ?? x.original ?? "";
    let after = x.new_text ?? x.after ?? x.text_b ?? x.updated ?? "";
    if (type === "delete" && !before) before = x.text ?? "";
    if (type === "insert" && !after) after = x.text ?? "";
    return { id: i, type, page: x.page ?? x.page_number ?? x.page_b ?? x.page_a ?? null, before, after };
  });
}
