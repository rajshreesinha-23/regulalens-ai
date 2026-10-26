export const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Match these to your FastAPI routes (open http://localhost:8000/docs to check).
export const EP = {
  health: "/health",
  list: "/documents",
  upload: "/documents/upload",
  compare: "/compare",
};
const comparePayload = (a, b) => ({ document_a_id: a, document_b_id: b });

async function req(path, opts) {
  let res;
  try {
    res = await fetch(BASE + path, opts);
  } catch {
    throw new Error(
      `Can't reach the API at ${BASE}. Start the backend and check that CORS allows this origin.`
    );
  }
  if (!res.ok) {
    let msg = "";
    try {
      const b = await res.json();
      msg = typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail ?? b);
    } catch {}
    throw new Error(msg || `Request failed with status ${res.status}.`);
  }
  return res.json();
}

export const api = {
  health: () => req(EP.health),
  list: async () => {
    const d = await req(EP.list);
    return Array.isArray(d) ? d : d.documents || [];
  },
  upload: (file) => {
    const f = new FormData();
    f.append("file", file);
    return req(EP.upload, { method: "POST", body: f });
  },
  compare: (a, b) =>
    req(EP.compare, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comparePayload(a, b)),
    }),
};

// Turns whatever the compare endpoint returns into
// [{ id, type: "insert" | "delete" | "replace", page, before, after }]
export function normalizeChanges(res) {
  const raw = Array.isArray(res) ? res : res.changes || res.differences || res.diffs || [];
  return raw.map((c, i) => {
    const t = String(c.type || c.tag || c.operation || c.change_type || "").toLowerCase();
    const type =
      t.startsWith("ins") || t.startsWith("add")
        ? "insert"
        : t.startsWith("del") || t.startsWith("rem")
        ? "delete"
        : "replace";
    let before = c.old_text ?? c.before ?? c.text_a ?? c.original ?? "";
    let after = c.new_text ?? c.after ?? c.text_b ?? c.updated ?? "";
    if (type === "delete" && !before) before = c.text ?? "";
    if (type === "insert" && !after) after = c.text ?? "";
    return { id: i, type, page: c.page ?? c.page_number ?? c.page_b ?? c.page_a ?? null, before, after };
  });
}
