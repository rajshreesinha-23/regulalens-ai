import { useEffect, useRef, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const AUTHOR = "Rajshree Sinha";
const REPO = "https://github.com/rajshreesinha-23/regulalens-ai";

const STEPS = [
  {
    title: "Upload a regulation",
    text: "Drop in a PDF. It is checked, opened and read page by page.",
    visual: (
      <div className="mock">
        <div className="file">rbi_circular_2026.pdf</div>
        <div className="bar"><i /></div>
        <small>48 pages read</small>
      </div>
    ),
  },
  {
    title: "Every page stays in place",
    text: "Text is stored with its page number, so nothing you find is ever unsourced.",
    visual: (
      <div className="mock">
        {[12, 13, 14].map((p) => (
          <div className="pg" key={p}><b>p.{p}</b><span /><span /><span className="short" /></div>
        ))}
      </div>
    ),
  },
  {
    title: "See exactly what changed",
    text: "Compare two versions. Removed wording is struck out, new wording is highlighted.",
    visual: (
      <div className="mock redline">
        Report within <s>30 days</s> <ins>15 days</ins> of detection.
      </div>
    ),
  },
  {
    title: "Ask, get the page",
    text: "Ask in plain language. Answers cite the document and page they came from.",
    visual: (
      <div className="mock">
        <div className="q">Who must file the incident report?</div>
        <div className="a">Regulated entities, within 15 days. <b>[1] p.14</b></div>
      </div>
    ),
  },
];

const STRIP = ["Page-aware extraction", "Redline comparison", "Cited answers", "FastAPI", "React", "Docker", "SQLite", "BM25 retrieval"];

async function call(path, options) {
  const res = await fetch(`${API}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

export function Tools() {
  const [docs, setDocs] = useState([]);
  const [tab, setTab] = useState("ask");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState("all");
  const [result, setResult] = useState(null);
  const [oldId, setOldId] = useState("");
  const [newId, setNewId] = useState("");
  const [diff, setDiff] = useState(null);

  const load = () =>
    call("/documents").then((d) => setDocs(d.documents)).catch(() => setError("Backend is not reachable. Start it with docker compose up."));
  useEffect(() => { load(); }, []);

  const run = async (fn) => {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const upload = (file) => run(async () => {
    const body = new FormData();
    body.append("file", file);
    await call("/documents/extract", { method: "POST", body });
    await load();
    setTab("ask");
  });

  const ask = () => run(async () => {
    setResult(null);
    setResult(await call("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, document_ids: scope === "all" ? null : [Number(scope)] }),
    }));
  });

  const compare = () => run(async () => {
    setDiff(null);
    setDiff(await call("/documents/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_document_id: Number(oldId), new_document_id: Number(newId) }),
    }));
  });

  return (
    <div className="tools">
      <div className="tabs" role="tablist">
        {["ask", "compare", "upload"].map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "ask" ? "Ask a question" : t === "compare" ? "Compare versions" : "Upload a PDF"}
          </button>
        ))}
        <span className="count">{docs.length} document{docs.length === 1 ? "" : "s"} loaded</span>
      </div>

      <div className="pane">
        {error && <p className="err" role="alert">{error}</p>}

        {tab === "upload" && (
          <label className="drop">
            <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
            <span>{busy ? "Reading the PDF..." : "Choose a PDF, up to 10 MB"}</span>
          </label>
        )}

        {tab === "ask" && (
          <>
            <div className="row">
              <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && question.trim() && ask()} placeholder="What is the deadline for reporting an incident?" aria-label="Your question" />
              <select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Search in">
                <option value="all">All documents</option>
                {docs.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
              </select>
              <button className="solid" disabled={busy || !question.trim()} onClick={ask}>{busy ? "Searching..." : "Ask"}</button>
            </div>
            {docs.length === 0 && <p className="hint">No documents yet. Upload a PDF first.</p>}
            {result && (
              <div className="answer">
                <p>{result.answer}</p>
                {result.citations.map((c) => (
                  <blockquote key={c.number}>
                    <b>[{c.number}] {c.filename}, page {c.page_number}</b>
                    <span>{c.text.slice(0, 260)}{c.text.length > 260 ? "..." : ""}</span>
                  </blockquote>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "compare" && (
          <>
            <div className="row">
              <select value={oldId} onChange={(e) => setOldId(e.target.value)} aria-label="Older version">
                <option value="">Older version</option>
                {docs.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
              </select>
              <select value={newId} onChange={(e) => setNewId(e.target.value)} aria-label="Newer version">
                <option value="">Newer version</option>
                {docs.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
              </select>
              <button className="solid" disabled={busy || !oldId || !newId || oldId === newId} onClick={compare}>{busy ? "Comparing..." : "Compare"}</button>
            </div>
            {diff && <pre className="json">{JSON.stringify(diff.comparison, null, 2)}</pre>}
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const stage = useRef(null);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = stage.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(Math.max(-r.top / (r.height - window.innerHeight), 0), 0.999);
      setProgress(p);
      setStep(Math.floor(p * STEPS.length));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="nav">
        <a href="#top" className="brand">RegulaLens</a>
        <nav>
          <a href="#how">How it works</a>
          <a href="#try">Try it</a>
          <a href={REPO} target="_blank" rel="noreferrer">Source</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <h1>Know what changed in the rulebook.</h1>
          <p className="clause">
            Regulated entities must file the incident report within{" "}
            <s className="del">30 days</s>
            <ins className="add">15 days</ins> of detection.
          </p>
          <p className="lede">
            RegulaLens reads regulatory PDFs, redlines the differences between versions, and answers questions with the exact page it found them on.
          </p>
          <div className="cta">
            <a className="btn solid" href="#try">Try it on a PDF</a>
            <a className="btn" href="#how">See how it works</a>
          </div>
        </section>

        <div className="strip" aria-hidden="true">
          <div className="track">
            {[...STRIP, ...STRIP, ...STRIP, ...STRIP].map((s, i) => <span key={i}>{s}</span>)}
          </div>
        </div>

        <section id="how" className="stage" ref={stage}>
          <div className="pin">
            <div className="rail"><i style={{ height: `${progress * 100}%` }} /></div>
            <div className="slides">
              {STEPS.map((s, i) => (
                <article key={s.title} className={`slide ${i === step ? "active" : i < step ? "past" : ""}`} aria-hidden={i !== step}>
                  <span className="idx">{i + 1} of {STEPS.length}</span>
                  <h2>{s.title}</h2>
                  <p>{s.text}</p>
                  <div className="vis">{s.visual}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="try" className="try">
          <h2>Try it on your own document.</h2>
          <p className="lede">This is the live system. Upload a PDF, then ask it something.</p>
          <Tools />
        </section>
      </main>

      <footer>
        <div>
          <strong>{AUTHOR}</strong>
          <span>Built with FastAPI, React, PyMuPDF, SQLite and Docker.</span>
        </div>
        <a href={REPO} target="_blank" rel="noreferrer">github.com/rajshreesinha-23/regulalens-ai</a>
      </footer>
    </>
  );
}
