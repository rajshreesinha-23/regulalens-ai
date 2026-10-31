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
const PIPE = [["Regulatory PDFs", 1], ["Ingestion", 1], ["Text extraction", 1], ["Storage", 1], ["Comparison", 1], ["Change review", 1], ["Impact analysis", 0]];
const CAPS = [
  ["PDF ingestion", "Upload regulatory documents and have them validated and read.", "Implemented"],
  ["Page-aware extraction", "Text is read with PyMuPDF and keeps its page number.", "Implemented"],
  ["Document storage", "Metadata and extracted content are stored in SQLite.", "Implemented"],
  ["Document comparison", "Inserted, deleted and replaced text, shown as a redline.", "Implemented"],
  ["Web dashboard", "A React and Vite workspace for every document workflow.", "Implemented"],
  ["Docker deployment", "Frontend and backend start together with Docker Compose.", "Configured"],
];
const STACK = [["Frontend", "React, Vite"], ["Backend", "Python, FastAPI"], ["Processing", "PyMuPDF, difflib"], ["Storage", "SQLite"], ["Infrastructure", "Docker, Nginx"]];
const MQ = ["Page-aware extraction", "Redline comparison", "Cited answers", "FastAPI", "React", "Docker", "SQLite", "PyMuPDF"];
const glow = (e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`); };

function Landing() {
  const stage = useRef(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const f = () => {
      const r = stage.current?.getBoundingClientRect();
      if (r) setP(Math.min(Math.max(-r.top / (r.height - innerHeight), 0), 0.999));
    };
    addEventListener("scroll", f, { passive: true }); f();
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.15 });
    document.querySelectorAll("[data-r]").forEach((n) => io.observe(n));
    return () => { removeEventListener("scroll", f); io.disconnect(); };
  }, []);
  const step = Math.floor(p * STEPS.length);
  const spot = (e) => { e.currentTarget.style.setProperty("--mx", `${e.clientX}px`); e.currentTarget.style.setProperty("--my", `${e.clientY}px`); };
  return (
    <>
      <header className="nav">
        <a href="#" className="logo">RegulaLens</a>
        <nav className="links"><a href="#how">How it works</a><a href="#pipe">Pipeline</a><a href="#caps">Capabilities</a><a href={REPO} target="_blank" rel="noreferrer">Source</a></nav>
        <a className="btn solid sm" href="#app/overview">Open workspace</a>
      </header>
      <div className="heroWrap" onMouseMove={spot}>
        <section className="hero">
          <div>
            <h1>Know what changed in the rulebook.</h1>
            <p className="lede">RegulaLens reads regulatory PDFs, redlines the differences between versions, and answers questions with the exact page it found them on.</p>
            <div className="cta"><a className="btn solid" href="#app/documents">Upload a PDF</a><a className="btn" href="#how">See how it works</a></div>
          </div>
          <div className="doc" aria-hidden="true">
            <div className="doc-bar"><i /><i /><i /><span>rbi_circular_2026.pdf</span></div>
            <div className="doc-body">
              <small>Page 14 of 48</small>
              <p className="clause">Regulated entities must file the incident report within <s>30 days</s> <ins>15 days</ins> of detection.</p>
              <div className="ghost" /><div className="ghost s" />
              <span className="tag">1 change found</span>
            </div>
          </div>
        </section>
      </div>
      <div className="mq" aria-hidden="true"><div>{[...MQ, ...MQ, ...MQ, ...MQ].map((x, i) => <span key={i}>{x}</span>)}</div></div>
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
      <section id="pipe" className="sec">
        <h2 data-r>From PDF to reviewed change.</h2>
        <p className="lede" data-r>Every document follows the same path. The last step is the next one being built.</p>
        <div className="pipe">{PIPE.map(([t, on], i) => <div key={t} data-r style={{ "--d": `${i * 90}ms` }} className={`node ${on ? "" : "plan"}`}><small>{i + 1}</small>{t}</div>)}</div>
      </section>
      <section id="caps" className="sec">
        <h2 data-r>What it does.</h2>
        <div className="bento">{CAPS.map(([t, d, st], i) => (
          <div key={t} data-r className="cap" style={{ "--d": `${i * 70}ms` }} onMouseMove={glow}>
            <span className="st">{st}</span><h3>{t}</h3><p>{d}</p>
          </div>))}
        </div>
      </section>
      <section className="sec">
        <h2 data-r>Built with.</h2>
        <div className="stack">{STACK.map(([k, v], i) => <div key={k} data-r style={{ "--d": `${i * 70}ms` }}><small>{k}</small><b>{v}</b></div>)}</div>
        <div className="cta final" data-r><a className="btn solid" href="#app/documents">Open the workspace</a><a className="btn" href={REPO} target="_blank" rel="noreferrer">Read the source</a></div>
      </section>
      <footer><span>Built with FastAPI, React, PyMuPDF, SQLite and Docker.</span><a href={REPO} target="_blank" rel="noreferrer">github.com/rajshreesinha-23/regulalens-ai</a></footer>
    </>
  );
}

function Num({ v }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof v !== "number") return;
    let r, t0;
    const f = (t) => { t0 ??= t; const k = Math.min((t - t0) / 700, 1); setN(Math.round(v * k)); if (k < 1) r = requestAnimationFrame(f); };
    r = requestAnimationFrame(f);
    return () => cancelAnimationFrame(r);
  }, [v]);
  return typeof v === "number" ? n : v ?? "-";
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
        <div className="page" key={view}>
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
        <div><strong><Num v={docs?.length} /></strong><span>Documents stored</span></div>
        <div><strong><Num v={total || undefined} /></strong><span>Pages extracted</span></div>
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
            <div className="split"><p>{c.before ? <s>{c.before}</s> : <em>Nothing here before</em>}</p><p>{c.after ? <ins>{c.after}</ins> : <em>Removed in the new version</em>}</p></div>
          </div>))}</div></> : <><p className="lede">No changes found, or the response had an unexpected shape:</p><pre className="raw">{JSON.stringify(res, null, 2)}</pre></>)}
    </>
  );
}
