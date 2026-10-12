
import { useEffect, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell,
  BookOpen, BrainCircuit, CheckCircle2, ChevronDown, CircleHelp,
  Clock3, FileSearch, FileText, Files, Gauge, GitCompareArrows,
  LayoutDashboard, Menu, Plus, Search, Settings, ShieldCheck,
  Sparkles, Upload, X, AlertCircle, LoaderCircle
} from "lucide-react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Documents", icon: Files },
  { label: "Change Monitor", icon: GitCompareArrows },
  { label: "Ask RegulaLens", icon: BrainCircuit },
  { label: "Impact Analysis", icon: Activity },
];

function App() {
  const [page, setPage] = useState("Overview");
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  async function loadDocuments() {
    setLoading(true);
    try {
      const response = await fetch(`${API}/documents`);
      if (!response.ok) throw new Error("Backend unavailable");
      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : data.documents || []);
      setApiOnline(true);
      setError("");
    } catch {
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
    fetch(`${API}/health`)
      .then((r) => setApiOnline(r.ok))
      .catch(() => setApiOnline(false));
  }, []);

  async function uploadDocument(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API}/documents/extract`, {
        method: "POST",
        body: form,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed. Please try again.");
      }

      setNotice(`${file.name} was uploaded and its text was extracted.`);
      setPage("Documents");
      await loadDocuments();
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Start FastAPI on port 8000 and check CORS."
          : err.message
      );
    } finally {
      setUploading(false);
    }
  }

  async function openDocument(doc) {
    setSelected({ ...doc, fetching: true });
    try {
      const response = await fetch(`${API}/documents/${doc.id}`);
      if (!response.ok) throw new Error("Could not load document");
      const data = await response.json();
      setSelected({ ...data, fetching: false });
    } catch {
      setSelected({ ...doc, fetching: false, loadError: true });
    }
  }

  const filtered = documents.filter((doc) =>
    (doc.filename || "").toLowerCase().includes(search.toLowerCase())
  );

  const displayDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-symbol"><ShieldCheck size={23} /></div>
          <div>
            <div className="brand-name">RegulaLens<span> AI</span></div>
            <div className="brand-caption">REGULATORY INTELLIGENCE</div>
          </div>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              onClick={() => { setPage(label); setMobileNav(false); }}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Documents" && documents.length > 0 && (
                <span className="nav-count">{documents.length}</span>
              )}
              {label === "Change Monitor" && <span className="soon-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <div className="workspace-label">PREFERENCES</div>
        <button className="nav-item" onClick={() => setNotice("Settings will be available in a future release.")}>
          <Settings size={18} strokeWidth={1.8} /><span>Settings</span>
        </button>
        <button className="nav-item" onClick={() => setNotice("Help centre is coming soon.")}>
          <CircleHelp size={18} strokeWidth={1.8} /><span>Help & support</span>
        </button>

        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><Sparkles size={16} /></div>
            <div className="plan-title">Your AI workspace</div>
            <p>Document intelligence, grounded in evidence.</p>
            <div className="plan-progress"><span /></div>
            <div className="plan-foot"><span>Document storage</span><span>{documents.length} saved</span></div>
          </div>
          <div className="profile">
            <div className="avatar">RL</div>
            <div className="profile-copy"><strong>RegulaLens Workspace</strong><span>Personal workspace</span></div>
            <ChevronDown size={16} className="muted-icon" />
          </div>
        </div>
      </aside>

      {mobileNav && <button className="mobile-backdrop" onClick={() => setMobileNav(false)} aria-label="Close menu" />}

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20} /></button>
            <span>Workspace</span><span className="crumb-slash">/</span><strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <label className="global-search">
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." />
              <kbd>⌘ K</kbd>
            </label>
            <div className={`connection ${apiOnline ? "online" : "offline"}`}>
              <span className="status-dot" />{apiOnline ? "Connected" : "Backend offline"}
            </div>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("You're all caught up.")}><Bell size={18} /><span /></button>
            <div className="avatar top-avatar">RL</div>
          </div>
        </header>

        <div className="page-content">
          {(notice || error) && (
            <div className={`notice ${error ? "notice-error" : ""}`}>
              {error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
              <span>{error || notice}</span>
              <button onClick={() => { setNotice(""); setError(""); }} aria-label="Dismiss"><X size={16} /></button>
            </div>
          )}

          {page === "Overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> YOUR REGULATORY COMMAND CENTRE</div>
                  <h1>Good evening<span className="heading-period">.</span></h1>
                  <p className="subtitle">One workspace to understand, track and act on regulatory change.</p>
                </div>
                <div className="heading-actions">
                  <button className="button-secondary" onClick={() => { setPage("Documents"); loadDocuments(); }}><FileSearch size={16} /> Browse documents</button>
                  <label className={`button-primary ${uploading ? "button-disabled" : ""}`}>
                    {uploading ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}
                    {uploading ? "Uploading..." : "Add document"}
                    <input type="file" accept=".pdf,application/pdf" hidden disabled={uploading} onChange={(e) => { uploadDocument(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </div>
              </div>

              <div className="welcome-banner">
                <div className="banner-orb orb-one" /><div className="banner-orb orb-two" />
                <div className="banner-content">
                  <div className="banner-kicker"><Sparkles size={14} /> THE INTELLIGENCE LAYER</div>
                  <h2>Regulations change.<br />Stay one step ahead.</h2>
                  <p>Bring your circulars into one place. Extract the details, preserve the evidence, and build towards smarter regulatory reviews.</p>
                  <button className="banner-button" onClick={() => setPage("Documents")}>Explore your documents <ArrowRight size={16} /></button>
                </div>
                <div className="banner-visual">
                  <div className="visual-ring ring-one" /><div className="visual-ring ring-two" />
                  <div className="visual-center"><ShieldCheck size={37} /></div>
                  <div className="float-card float-top"><span className="float-check"><CheckCircle2 size={15} /></span><span><b>Evidence first</b><small>Page-level extraction</small></span></div>
                  <div className="float-card float-bottom"><span className="float-spark"><BrainCircuit size={17} /></span><span><b>AI-ready documents</b><small>Structured source text</small></span></div>
                </div>
              </div>

              <div className="section-heading">
                <div><h2>Workspace at a glance</h2><p>Live counts from your connected workspace</p></div>
                <span className="live-label"><span className="status-dot" /> LIVE WORKSPACE</span>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-top"><span className="metric-icon teal"><Files size={19} /></span><span className="metric-label">TOTAL DOCUMENTS</span></div>
                  <div className="metric-value">{loading ? "—" : documents.length}</div>
                  <div className="metric-bottom"><span className="metric-neutral"><Activity size={14} /> Workspace library</span><span className="metric-note">PDFs saved</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-top"><span className="metric-icon violet"><FileText size={19} /></span><span className="metric-label">PAGES EXTRACTED</span></div>
                  <div className="metric-value">{loading ? "—" : documents.reduce((sum, d) => sum + Number(d.page_count || 0), 0)}</div>
                  <div className="metric-bottom"><span className="metric-neutral"><CheckCircle2 size={14} /> Text extraction</span><span className="metric-note">Saved pages</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-top"><span className="metric-icon amber"><GitCompareArrows size={19} /></span><span className="metric-label">CHANGES DETECTED</span></div>
                  <div className="metric-value">—</div>
                  <div className="metric-bottom"><span className="metric-neutral">Not yet available</span><span className="metric-note">Planned feature</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-top"><span className="metric-icon blue"><BrainCircuit size={19} /></span><span className="metric-label">AI REVIEWS</span></div>
                  <div className="metric-value">—</div>
                  <div className="metric-bottom"><span className="metric-neutral">Not yet available</span><span className="metric-note">Planned feature</span></div>
                </div>
              </div>

              <div className="dashboard-grid">
                <section className="panel documents-panel">
                  <div className="panel-heading">
                    <div><h3>Recently added</h3><p>Your latest regulatory source documents</p></div>
                    <button className="text-button" onClick={() => setPage("Documents")}>View all <ArrowRight size={15} /></button>
                  </div>
                  {loading ? (
                    <div className="empty-state"><LoaderCircle className="spin" size={23} /><p>Loading your library...</p></div>
                  ) : documents.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon"><Files size={23} /></div>
                      <strong>Your document library starts here</strong>
                      <p>Upload an RBI or SEBI circular PDF to extract and store its text.</p>
                      <label className="button-secondary upload-empty"><Upload size={16} /> Upload your first PDF<input type="file" accept=".pdf,application/pdf" hidden onChange={(e) => { uploadDocument(e.target.files?.[0]); e.target.value = ""; }} /></label>
                    </div>
                  ) : (
                    <div className="document-list">
                      {documents.slice(0, 5).map((doc) => (
                        <button className="document-row" key={doc.id} onClick={() => openDocument(doc)}>
                          <div className="pdf-icon"><FileText size={19} /></div>
                          <div className="document-info"><strong>{doc.filename}</strong><span>{doc.page_count || 0} pages <span className="row-separator">·</span> Added {displayDate(doc.created_at)}</span></div>
                          <span className="status-badge extracted"><CheckCircle2 size={13} /> Extracted</span>
                          <ArrowRight size={16} className="row-arrow" />
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <section className="panel activity-panel">
                  <div className="panel-heading">
                    <div><h3>Build your intelligence layer</h3><p>Your next steps</p></div>
                    <span className="mini-spark"><Sparkles size={17} /></span>
                  </div>
                  <div className="checklist">
                    <div className="checklist-item"><span className={`check-circle ${documents.length ? "complete" : ""}`}>{documents.length ? <CheckCircle2 size={16} /> : "1"}</span><div><strong>Build your document library</strong><p>Upload a regulatory PDF and extract its text.</p></div><button onClick={() => setPage("Documents")} aria-label="Open documents"><ArrowRight size={16} /></button></div>
                    <div className="checklist-item"><span className="check-circle">2</span><div><strong>Enable semantic search</strong><p>Retrieve relevant clauses using embeddings.</p><span className="feature-tag">UP NEXT</span></div></div>
                    <div className="checklist-item"><span className="check-circle">3</span><div><strong>Compare document versions</strong><p>Identify changes with source-level evidence.</p><span className="feature-tag">PLANNED</span></div></div>
                    <div className="checklist-item"><span className="check-circle">4</span><div><strong>Ask questions with citations</strong><p>Get answers grounded in the source text.</p><span className="feature-tag">PLANNED</span></div></div>
                  </div>
                </section>
              </div>

              <div className="bottom-note"><ShieldCheck size={16} /><span><strong>Evidence over assumptions.</strong> RegulaLens AI is being built to keep regulatory answers traceable to their source documents.</span></div>
            </>
          )}

          {page === "Documents" && (
            <>
              <div className="page-heading">
                <div><div className="eyebrow"><span className="eyebrow-line" /> SOURCE LIBRARY</div><h1>Documents<span className="heading-period">.</span></h1><p className="subtitle">Manage your regulatory PDFs and inspect extracted source text.</p></div>
                <label className={`button-primary ${uploading ? "button-disabled" : ""}`}><Upload size={17} />{uploading ? "Uploading..." : "Upload PDF"}<input type="file" accept=".pdf,application/pdf" hidden disabled={uploading} onChange={(e) => { uploadDocument(e.target.files?.[0]); e.target.value = ""; }} /></label>
              </div>
              <div className="document-summary">
                <div className="summary-item"><Files size={18} /><span>Documents in library</span><strong>{documents.length}</strong></div>
                <div className="summary-item"><BookOpen size={18} /><span>Total extracted pages</span><strong>{documents.reduce((sum, d) => sum + Number(d.page_count || 0), 0)}</strong></div>
                <button className="button-secondary refresh-button" onClick={loadDocuments}><Activity size={15} /> Refresh library</button>
              </div>
              <section className="panel full-panel">
                <div className="panel-heading"><div><h3>Source documents</h3><p>Files stored in your local RegulaLens database</p></div><span className="result-count">{filtered.length} results</span></div>
                {loading ? <div className="empty-state"><LoaderCircle className="spin" size={23} /><p>Loading documents...</p></div> : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><FileSearch size={24} /></div><strong>{search ? "No matching documents" : "No documents yet"}</strong><p>{search ? "Try another search term." : "Upload a PDF to get started. The backend will extract and save its text."}</p><label className="button-primary upload-empty">{search ? "Clear search" : "Upload a PDF"}<input type="file" accept=".pdf,application/pdf" hidden onChange={(e) => { uploadDocument(e.target.files?.[0]); e.target.value = ""; }} /></label></div> : <div className="table-wrap"><table><thead><tr><th>DOCUMENT</th><th>PAGES</th><th>DATE ADDED</th><th>STATUS</th><th></th></tr></thead><tbody>{filtered.map((doc) => <tr key={doc.id}><td><button className="table-document" onClick={() => openDocument(doc)}><span className="pdf-icon"><FileText size={18} /></span><span><strong>{doc.filename}</strong><small>Document ID: {doc.id}</small></span></button></td><td>{doc.page_count ?? "—"}</td><td>{displayDate(doc.created_at)}</td><td><span className="status-badge extracted"><CheckCircle2 size={13} /> Text saved</span></td><td><button className="icon-button" onClick={() => openDocument(doc)} aria-label={`Open ${doc.filename}`}><ArrowRight size={16} /></button></td></tr>)}</tbody></table></div>}
              </section>
              <p className="footnote"><ShieldCheck size={14} /> Documents are served by your local backend. Only upload files you're authorized to process.</p>
            </>
          )}

          {page !== "Overview" && page !== "Documents" && (
            <div className="coming-page">
              <div className="coming-icon">{page === "Ask RegulaLens" ? <BrainCircuit size={29} /> : page === "Change Monitor" ? <GitCompareArrows size={29} /> : <Gauge size={29} />}</div>
              <div className="eyebrow"><span className="eyebrow-line" /> REGULALENS AI</div>
              <h1>{page}<span className="heading-period">.</span></h1>
              <p className="subtitle">{page === "Ask RegulaLens" ? "Ask questions across your regulatory documents and trace answers to their source." : page === "Change Monitor" ? "Compare circular versions and surface meaningful regulatory changes." : "Understand which regulatory updates may matter to your workflows."}</p>
              <div className="coming-card"><span className="feature-tag">IN DEVELOPMENT</span><h3>This workspace is being built.</h3><p>The current backend supports PDF extraction and saved document retrieval. This feature will become functional when its analysis pipeline is implemented.</p><button className="button-primary" onClick={() => setPage("Documents")}>Go to documents <ArrowRight size={16} /></button></div>
            </div>
          )}
        </div>
        <footer className="app-footer"><span>RegulaLens AI <span className="footer-dot">·</span> Regulatory intelligence workspace</span><span>Built with evidence in mind <ShieldCheck size={14} /></span></footer>
      </main>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="document-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title-icon"><FileText size={21} /></div><div><span className="eyebrow">DOCUMENT VIEWER</span><h2>{selected.filename}</h2></div><button className="icon-button modal-close" onClick={() => setSelected(null)} aria-label="Close document"><X size={19} /></button></div>
            <div className="modal-meta"><span>Document ID: {selected.id}</span><span>{selected.page_count || 0} pages</span><span>{displayDate(selected.created_at)}</span></div>
            <div className="modal-body">
              {selected.fetching ? <div className="empty-state"><LoaderCircle className="spin" size={24} /><p>Retrieving extracted text...</p></div> : selected.loadError ? <div className="empty-state"><AlertCircle size={24} /><p>Unable to retrieve this document's text.</p></div> : (
                (selected.pages || []).map((p, i) => {
                  const pageNumber = p.page ?? p.page_number ?? i + 1;
                  const pageText = typeof p === "string" ? p : p.text || "";
                  return <article className="source-page" key={pageNumber}><div className="source-page-label"><span>PAGE {pageNumber}</span><span>EXTRACTED SOURCE</span></div><p>{pageText || "No readable text on this page."}</p></article>;
                })
              )}
            </div>
            <div className="modal-footer"><span><ShieldCheck size={15} /> Original source text</span><button className="button-secondary" onClick={() => setSelected(null)}>Close viewer</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;