import { useCallback, useEffect, useRef, useState } from "react";
import { api, normalizeChanges } from "./api.js";

const REPO = "https://github.com/rajshreesinha-23/regulalens-ai";
const STEPS = [
  ["Upload a regulation", "Drop in a PDF. It is checked, opened and read page by page."],
  ["Every page stays in place", "Text is stored with its page number, so nothing you find is unsourced."],
  ["See exactly what changed", "Compare two versions. Removed wording is struck out, new wording is highlighted."],
  ["Ask, get the page", "Ask in plain language. Answers cite the document and page they came from."],
];
const LIVE = ["PDF ingestion", "Page-aware extraction", "Document storage", "Document comparison", "Web dashboard", "Cited answers"];
const PLANNED = ["Regulatory impact mapping", "Monitoring and alerts"];
const NAV = [["overview", "Overview"], ["documents", "Documents"], ["ask", "Ask"], ["compare", "Compare"]];

const useHash = () => {
  const [h, setH] = useState(location.hash);
  useEffect(() => { const f = () => setH(location.hash); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return h;
};

export default function App() {
  const hash = useHash();
  return hash.startsWith("#app") ? <Workspace view={hash.split("/")[1] || "overview"} /> : <Landing />;
}

/* ---------------- Landing ---------------- */
function Landing() {
  const stage = useRef(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const f = () => {
      const r = stage.current?.getBoundingClientRect();
      if (r) setP(Math.min(Math.max(-r.top / (r.height - innerHeight), 0), 0.999));
    };
    addEventListener("scroll", f, { passive: true }); f();
    return () => removeEventListener("scroll", f);
  }, []);
  const step = Math.floor(p * STEPS.length);
  return (
    <>
      <header className="nav">
        <a href="#" className="logo">RegulaLens</a>
        <a className="btn solid sm" href="#app/overview">Open workspace</a>
      </header>
      <section className="hero">
        <h1>Know what changed in the rulebook.</h1>
        <p className="clause">Regulated entities must file the incident report within <s>30 days</s> <ins>15 days</ins> of detection.</p>
        <p className="lede">RegulaLens reads regulatory PDFs, redlines the differences between versions, and answers questions with the exact page it found them on.</p>
        <div className="cta"><a className="btn solid" href="#app/documents">Upload a PDF</a><a className="btn" href="#how">See how it works</a></div>
      </section>
      <section id="how" className="stage" ref={stage}>
        <div className="pin">
          <div className="rail"><i style={{ height: `${p * 100}%` }} /></div>
          {STEPS.map(([t, d], i) => (
            <article key={t} className={`slide ${i === step ? "on" : i < step ? "past" : ""}`} aria-hidden={i !== step}>
              <span className="idx">{i + 1} of {STEPS.length}</span><h2>{t}</h2><p>{d}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="road">
        <h2>What works today</h2>
        <div className="chips">{LIVE.map((x) => <span key={x} className="chip on">{x}</span>)}</div>
        <h2>What is planned</h2>
        <div className="chips">{PLANNED.map((x) => <span key={x} className="chip">{x}</span>)}</div>
      </section>
      <footer><span>Built with FastAPI, React, PyMuPDF, SQLite and Docker.</span><a href={REPO} target="_blank" rel="noreferrer">Source on GitHub</a></footer>
    </>
  );
}

/* ---------------- Workspace ---------------- */
function Workspace({ view }) {
  const [docs, setDocs] = useState(null);
  const [online, setOnline] = useState(null);
  const [toast, setToast] = useState("");
  const [open, setOpen] = useState(false);

  const load = useCallback(() => api.list().then(setDocs).catch((e) => { setDocs([]); setToast(e.message); }), []);
  useEffect(() => { load(); api.health().then(() => setOnline(true)).catch(() => setOnline(false)); }, [load]);
  useEffect(() => { setOpen(false); }, [view]);

  const props = { docs, load, fail: setToast };
  return (
    <div className="shell">
      <aside className={`side ${open ? "open" : ""}`}>
        <a href="#" className="logo">RegulaLens</a>
        <nav>{NAV.map(([k, l]) => <a key={k} href={`#app/${k}`} className={view === k ? "act" : ""}>{l}</a>)}</nav>
        <div className="grow" />
        <div className="status"><i className={online ? "ok" : ""} />{online === null ? "Checking API" : online ? "API connected" : "API unreachable"}</div>
        <a className="muted" href={REPO} target="_blank" rel="noreferrer">Source on GitHub</a>
      </aside>
      <main className="main">
        <div className="top"><button className="icon" onClick={() => setOpen(!open)} aria-label="Menu">Menu</button><span>Workspace / <b>{NAV.find(([k]) => k === view)?.[1] || "Overview"}</b></span></div>
        {toast && <div className="toast" role="alert">{toast}<button onClick={() => setToast("")}>Dismiss</button></div>}
        <div className="page">
          {view === "documents" ? <Documents {...props} /> : view === "ask" ? <Ask {...props} /> : view === "compare" ? <Compare {...props} /> : <Overview {...props} online={online} />}
        </div>
      </main>
    </div>
  );
}

const Skeleton = () => <div className="list">{[0, 1, 2].map((i) => <div key={i} className="sk" />)}</div>;
const Empty = ({ text }) => <div className="empty"><p>{text}</p><a className="btn solid sm" href="#app/documents">Upload a PDF</a></div>;
const pages = (d) => d.page_count ?? d.pages ?? d.total_pages ?? null;

function Overview({ docs, online }) {
  const total = docs?.reduce((n, d) => n + (Number(pages(d)) || 0), 0);
  return (
    <>
      <h1>Overview.</h1>
      <p className="lede">Your regulatory documents, in one place.</p>
      <div className="stats">
        <div><strong>{docs ? docs.length : "-"}</strong><span>Documents stored</span></div>
        <div><strong>{docs ? total || "-" : "-"}</strong><span>Pages extracted</span></div>
        <div><strong>{online === null ? "-" : online ? "Online" : "Offline"}</strong><span>Backend</span></div>
      </div>
      <h2>Recent documents</h2>
      {!docs ? <Skeleton /> : docs.length === 0 ? <Empty text="No documents yet. Upload a regulation to get started." /> :
        <div className="list">{docs.slice(-5).reverse().map((d) => <div className="item" key={d.id}><b>{d.filename}</b><span>{pages(d) ? `${pages(d)} pages` : `ID ${d.id}`}</span></div>)}</div>}
      <h2>Roadmap</h2>
      <div className="chips">{LIVE.map((x) => <span key={x} className="chip on">{x}</span>)}{PLANNED.map((x) => <span key={x} className="chip">{x} (planned)</span>)}</div>
    </>
  );
}

function Documents({ docs, load, fail }) {
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState(false);
  const send = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") return fail("Only PDF files can be uploaded.");
    setBusy(true);
    try { await api.upload(file); await load(); } catch (e) { fail(e.message); }
    setBusy(false);
  };
  const shown = docs?.filter((d) => d.filename.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1>Documents.</h1>
      <label className={`drop ${drag ? "drag" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files[0]); }}>
        <input type="file" accept="application/pdf" hidden onChange={(e) => send(e.target.files[0])} />
        <b>{busy ? "Reading the PDF..." : "Drop a PDF here, or choose a file"}</b>
        <span>{busy ? "Extracting text page by page" : "Text is extracted page by page and stored"}</span>
        {busy && <div className="bar"><i /></div>}
      </label>
      <input className="field" placeholder="Search documents" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search documents" />
      {!docs ? <Skeleton /> : shown.length === 0 ? <Empty text={q ? "No document matches that search." : "No documents yet."} /> :
        <div className="list">{shown.map((d) => <div className="item" key={d.id}><b>{d.filename}</b><span>{pages(d) ? `${pages(d)} pages` : `ID ${d.id}`}</span></div>)}</div>}
    </>
  );
}

function Ask({ docs, fail }) {
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState("all");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setRes(null);
    try { setRes(await api.ask(question, scope === "all" ? null : [Number(scope)])); } catch (e) { fail(e.message); }
    setBusy(false);
  };
  return (
    <>
      <h1>Ask.</h1>
      <p className="lede">Answers cite the document and page they came from.</p>
      <div className="row">
        <input className="field" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && question.trim() && go()} placeholder="What is the deadline for reporting an incident?" aria-label="Your question" />
        <select className="field" value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Search in"><option value="all">All documents</option>{docs?.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}</select>
        <button className="btn solid" disabled={busy || !question.trim()} onClick={go}>{busy ? "Searching..." : "Ask"}</button>
      </div>
      {docs?.length === 0 && <Empty text="Upload a PDF first, then ask it a question." />}
      {busy && <div className="sk tall" />}
      {res && <div className="answer"><p>{res.answer}</p>{res.citations?.map((c) => <blockquote key={c.number}><b>[{c.number}] {c.filename}, page {c.page_number}</b><span>{c.text.slice(0, 280)}{c.text.length > 280 ? "..." : ""}</span></blockquote>)}</div>}
    </>
  );
}

function Compare({ docs, fail }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setRes(null);
    try { setRes(await api.compare(Number(a), Number(b))); } catch (e) { fail(e.message); }
    setBusy(false);
  };
  const changes = res ? normalizeChanges(res) : [];
  const n = (t) => changes.filter((c) => c.type === t).length;
  const opts = docs?.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>);
  return (
    <>
      <h1>Compare.</h1>
      <p className="lede">See what was added, removed or replaced between two versions.</p>
      <div className="row">
        <select className="field" value={a} onChange={(e) => setA(e.target.value)} aria-label="Older version"><option value="">Older version</option>{opts}</select>
        <select className="field" value={b} onChange={(e) => setB(e.target.value)} aria-label="Newer version"><option value="">Newer version</option>{opts}</select>
        <button className="btn solid" disabled={busy || !a || !b || a === b} onClick={go}>{busy ? "Comparing..." : "Compare"}</button>
      </div>
      {docs?.length < 2 && <Empty text="Upload at least two versions of a document to compare them." />}
      {busy && <div className="sk tall" />}
      {res && (changes.length ? <>
        <div className="stats"><div><strong>{n("insert")}</strong><span>Added</span></div><div><strong>{n("delete")}</strong><span>Removed</span></div><div><strong>{n("replace")}</strong><span>Replaced</span></div></div>
        <div className="list">{changes.map((c) => (
          <div className="change" key={c.id}>
            <small>{c.type === "insert" ? "Added" : c.type === "delete" ? "Removed" : "Replaced"}{c.page ? `, page ${c.page}` : ""}</small>
            <p>{c.before && <s>{c.before}</s>} {c.after && <ins>{c.after}</ins>}</p>
          </div>))}</div></> : <><p className="lede">No changes found, or the response had an unexpected shape:</p><pre className="raw">{JSON.stringify(res, null, 2)}</pre></>)}
    </>
  );
}
