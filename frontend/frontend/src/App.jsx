import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, normalizeChanges, BASE } from "./api";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const docName = (d) => d.filename || d.name || d.title || `Document ${d.id}`;
const docPages = (d) => d.pages ?? d.page_count ?? d.num_pages ?? null;
const docDate = (d) => {
  const v = d.created_at || d.uploaded_at || d.upload_date;
  return v ? new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
};
const LABEL = { insert: "Added", delete: "Removed", replace: "Modified" };

/* ---------- motion hooks ---------- */
function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduced()) return setV(target);
    let raf, t0;
    const step = (t) => {
      t0 ??= t;
      const p = Math.min((t - t0) / ms, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function useTicker(n, ms) {
  const [i, setI] = useState(reduced() ? -1 : 0);
  useEffect(() => {
    if (reduced()) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => clearInterval(t);
  }, [n, ms]);
  return i;
}

function useApiStatus() {
  const [ok, setOk] = useState(null);
  useEffect(() => {
    const ping = () => api.health().then(() => setOk(true), () => setOk(false));
    ping();
    const t = setInterval(ping, 15000);
    return () => clearInterval(t);
  }, []);
  return ok;
}

/* ---------- overview: a clause rewriting itself ---------- */
const SAMPLES = [
  ["Reporting entities must retain transaction records for ", ["five", "seven"], " years."],
  ["Material incidents must be disclosed within ", ["30 days", "72 hours"], " of discovery."],
  ["Firms with assets above ", ["$5 billion", "$2 billion"], " must file the annual attestation."],
];
const PIPE = [
  ["Upload", "PDF in"],
  ["Extract", "Text per page"],
  ["Store", "Searchable record"],
  ["Compare", "Clause by clause"],
  ["Review", "Redline out"],
];

function Clause() {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState(reduced() ? 2 : 0);
  useEffect(() => {
    if (reduced()) return;
    const t = setTimeout(() => {
      if (phase === 3) { setI((n) => (n + 1) % SAMPLES.length); setPhase(0); }
      else setPhase(phase + 1);
    }, [1600, 900, 2400, 500][phase]);
    return () => clearTimeout(t);
  }, [phase]);
  return (
    <figure className="demo">
      <p className={`clause phase-${phase}`}>
        {SAMPLES[i].map((s, k) =>
          typeof s === "string" ? (
            <span key={k}>{s}</span>
          ) : (
            <span key={k} className="swap">
              <del className={phase >= 1 ? "hit" : ""}>{s[0]}</del>
              <ins className={phase >= 2 ? "show" : ""}>{s[1]}</ins>
            </span>
          )
        )}
      </p>
      <figcaption className="muted">Illustrative clause. Real changes appear like this in your comparisons.</figcaption>
    </figure>
  );
}

function Overview({ docs, go }) {
  const hero = useRef(null);
  const step = useTicker(PIPE.length, 1300);
  const nDocs = useCountUp(docs.length);
  const nPages = useCountUp(docs.reduce((s, d) => s + (docPages(d) || 0), 0));
  const move = (e) => {
    const r = hero.current.getBoundingClientRect();
    hero.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
    hero.current.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div className="hero" ref={hero} onMouseMove={move}>
      <h1 className="display">See exactly what changed between two versions of a regulation.</h1>
      <p className="lede muted">
        Upload the PDFs. RegulaLens extracts every page and marks each insertion, deletion and rewrite.
      </p>
      <Clause />
      <div className="cta">
        <button className="btn solid" onClick={() => go("documents")}>Upload documents</button>
        <button className="btn" onClick={() => go("compare")}>Compare versions</button>
      </div>
      <div className="pipe-wrap">
        <div className="pipe">
          {PIPE.map(([name, note], k) => (
            <div key={name} className={k === step ? "on" : ""}>
              <b>{name}</b>
              <small>{note}</small>
            </div>
          ))}
        </div>
      </div>
      {docs.length > 0 && (
        <p className="muted mono tally">
          <b>{nDocs}</b> documents indexed, <b>{nPages}</b> pages
        </p>
      )}
    </div>
  );
}

/* ---------- documents ---------- */
function Upload({ onDone, onError }) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef(null);
  const send = async (files) => {
    const pdfs = [...files].filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) return onError("Only PDF files can be uploaded.");
    setBusy(true);
    try {
      for (const f of pdfs) await api.upload(f);
      onError("");
      await onDone();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className={`drop${over ? " over" : ""}${busy ? " busy" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files); }}
    >
      <p className="drop-title">{busy ? "Extracting text from each page…" : "Drop regulatory PDFs here"}</p>
      <p className="muted">Each page is extracted and stored so versions can be compared.</p>
      <button className="btn solid" disabled={busy} onClick={() => input.current.click()}>Choose PDF files</button>
      <input ref={input} type="file" accept="application/pdf" multiple hidden
        onChange={(e) => { send(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

function Documents({ docs, loading, refresh, setError, goCompare }) {
  return (
    <>
      <h1>Documents</h1>
      <Upload onDone={refresh} onError={setError} />
      <div className="rows">
        {loading && <p className="muted pad">Loading documents…</p>}
        {!loading && docs.length === 0 && (
          <p className="muted pad">Nothing uploaded yet. Add two versions of a regulation to start comparing.</p>
        )}
        {docs.map((d, i) => (
          <div className="row" key={d.id} style={{ "--i": Math.min(i, 12) }}>
            <span className="row-name">{docName(d)}</span>
            <span className="mono muted">{docPages(d) ? `${docPages(d)} pages` : ""}</span>
            <span className="muted">{docDate(d)}</span>
            <button className="btn ghost" onClick={() => goCompare(d.id)}>Compare</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- compare ---------- */
function Change({ c, idx, mode, active, onSelect }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [active]);
  return (
    <div ref={ref} onClick={() => onSelect(idx)} style={{ "--d": `${Math.min(idx, 5) * 40}ms` }}
      className={`change${seen ? " seen" : ""}${active ? " active" : ""}`}>
      <span className="gutter mono">
        {c.page != null ? `p.${c.page}` : "–"}
        <small>{LABEL[c.type]}</small>
      </span>
      {mode === "split" ? (
        <div className="split mono">
          <p className="old">{c.before || "No text"}</p>
          <p className="new">{c.after || "No text"}</p>
        </div>
      ) : (
        <p className="redline mono">
          {c.before && c.type !== "insert" && <del>{c.before}</del>}
          {c.before && c.after && c.type === "replace" && " "}
          {c.after && c.type !== "delete" && <ins>{c.after}</ins>}
        </p>
      )}
    </div>
  );
}

const FILTERS = [["all", "All changes"], ["insert", "Added"], ["delete", "Removed"], ["replace", "Modified"]];

function Compare({ docs, preset, setError }) {
  const [a, setA] = useState(preset ? String(preset) : "");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const [changes, setChanges] = useState(null);
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState("redline");
  const [q, setQ] = useState("");
  const [active, setActive] = useState(-1);
  const search = useRef(null);

  useEffect(() => { if (preset) setA(String(preset)); }, [preset]);

  const run = async () => {
    setBusy(true);
    setChanges(null);
    try {
      setChanges(normalizeChanges(await api.compare(a, b)));
      setFilter("all");
      setQ("");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const n = { all: 0, insert: 0, delete: 0, replace: 0 };
    (changes || []).forEach((c) => { n.all++; n[c.type]++; });
    return n;
  }, [changes]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (changes || []).filter(
      (c) => (filter === "all" || c.type === filter) && (!s || `${c.before} ${c.after}`.toLowerCase().includes(s))
    );
  }, [changes, filter, q]);

  useEffect(() => setActive(-1), [filter, q]);

  useEffect(() => {
    const h = (e) => {
      if (!changes) return;
      const t = e.target.tagName;
      if (t === "INPUT" || t === "SELECT") return e.key === "Escape" && e.target.blur();
      if (e.key === "j") setActive((n) => Math.min(n + 1, shown.length - 1));
      if (e.key === "k") setActive((n) => Math.max(n - 1, 0));
      if (e.key === "/") { e.preventDefault(); search.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [changes, shown.length]);

  const exportReport = () => {
    const text = shown
      .map((c) => `Page ${c.page ?? "-"} (${LABEL[c.type]})\n- ${c.before}\n+ ${c.after}\n`)
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    link.download = "regulalens-changes.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const pick = (v, set, label, other) => (
    <label className="field">
      <span>{label}</span>
      <select value={v} onChange={(e) => set(e.target.value)}>
        <option value="">Select a document</option>
        {docs.map((d) => (
          <option key={d.id} value={d.id} disabled={String(d.id) === String(other)}>{docName(d)}</option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <h1>Compare versions</h1>
      <div className="picker">
        {pick(a, setA, "Original", b)}
        {pick(b, setB, "Revised", a)}
        <button className="btn solid" disabled={!a || !b || busy} onClick={run}>
          {busy ? "Comparing…" : "Run comparison"}
        </button>
      </div>
      {busy && <div className="scan" aria-label="Comparing documents" />}
      {changes === null && !busy && (
        <p className="muted pad">Choose an original and a revised document. Changes appear here as a redline.</p>
      )}
      {changes && (
        <section className="result">
          <div className="bar" aria-hidden>
            {["insert", "delete", "replace"].map((t) => counts[t] > 0 && <i key={t} className={t} style={{ flexGrow: counts[t] }} />)}
          </div>
          <div className="tools">
            <div className="filters" role="tablist">
              {FILTERS.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={filter === k}
                  className={`chip${filter === k ? " on" : ""}`} onClick={() => setFilter(k)}>
                  {k !== "all" && <s className={`sw ${k}`} />}
                  <b>{counts[k]}</b> {label}
                </button>
              ))}
            </div>
            <input ref={search} className="search" placeholder="Search changes  ( / )" value={q}
              onChange={(e) => setQ(e.target.value)} aria-label="Search changes" />
            <div className="seg" role="group" aria-label="View mode">
              <button className={mode === "redline" ? "on" : ""} onClick={() => setMode("redline")}>Redline</button>
              <button className={mode === "split" ? "on" : ""} onClick={() => setMode("split")}>Side by side</button>
            </div>
            <button className="btn ghost" onClick={exportReport} disabled={!shown.length}>Download report</button>
          </div>
          <p className="muted mono hint">Press j and k to move between changes</p>
          {shown.length === 0 ? (
            <p className="muted pad">
              {counts.all === 0 ? "These documents are identical." : "No changes match this filter."}
            </p>
          ) : (
            shown.map((c, i) => (
              <Change key={`${filter}-${q}-${c.id}-${mode}`} c={c} idx={i} mode={mode} active={i === active} onSelect={setActive} />
            ))
          )}
        </section>
      )}
    </>
  );
}

/* ---------- shell ---------- */
export default function App() {
  const [view, setView] = useState("overview");
  const [preset, setPreset] = useState("");
  const [error, setError] = useState("");
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const online = useApiStatus();

  const refresh = useCallback(async () => {
    try { setDocs(await api.list()); setError(""); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const goCompare = (id) => { setPreset(id); setView("compare"); };
  const NAV = [["overview", "Overview"], ["documents", "Documents"], ["compare", "Compare"]];

  return (
    <div className="shell">
      <aside className="rail">
        <button className="brand" onClick={() => setView("overview")}>RegulaLens</button>
        <nav>
          {NAV.map(([k, label]) => (
            <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{label}</button>
          ))}
        </nav>
        <div className="status mono" title={BASE}>
          <i className={online === null ? "" : online ? "up" : "down"} />
          {online === null ? "Checking API" : online ? "API online" : "API offline"}
        </div>
      </aside>
      <main>
        {error && (
          <div className="error" role="alert">
            <span>{error}</span>
            <button className="btn ghost" onClick={() => setError("")}>Dismiss</button>
          </div>
        )}
        <div className="page" key={view}>
          {view === "overview" && <Overview docs={docs} go={setView} />}
          {view === "documents" && (
            <Documents docs={docs} loading={loading} refresh={refresh} setError={setError} goCompare={goCompare} />
          )}
          {view === "compare" && <Compare docs={docs} preset={preset} setError={setError} />}
        </div>
      </main>
    </div>
  );
}
