
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudUpload,
  Command,
  FileCheck2,
  FileClock,
  FileSearch,
  FileText,
  Filter,
  GitCompareArrows,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  Menu,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { label: "Documents", icon: FileText, group: "WORKSPACE" },
  { label: "Change Monitor", icon: GitCompareArrows, group: "INTELLIGENCE" },
  { label: "Ask RegulaLens", icon: MessageSquareText, group: "INTELLIGENCE" },
  { label: "Impact Analysis", icon: BarChart3, group: "INTELLIGENCE" },
];

const pageDetails = {
  Overview: {
    title: "Overview",
    subtitle: "Your regulatory intelligence workspace at a glance.",
  },
  Documents: {
    title: "Documents",
    subtitle: "Upload, organize and explore your regulatory documents.",
  },
  "Change Monitor": {
    title: "Change Monitor",
    subtitle: "Compare regulatory documents to identify what changed.",
  },
  "Ask RegulaLens": {
    title: "Ask RegulaLens",
    subtitle: "Explore regulatory documents using natural language.",
  },
  "Impact Analysis": {
    title: "Impact Analysis",
    subtitle: "Understand requirements and identify areas for review.",
  },
};

function getDocuments(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.documents)) return payload.documents;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function getDocumentName(doc) {
  return (
    doc?.filename ||
    doc?.file_name ||
    doc?.name ||
    doc?.title ||
    `Document ${doc?.id ?? ""}`
  );
}

function getDocumentId(doc) {
  return doc?.id ?? doc?.document_id ?? doc?.filename ?? doc?.file_name;
}

function formatDate(value) {
  if (!value) return "Recently added";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(error) {
  if (error instanceof TypeError) {
    return "Could not connect to the API. Check that your FastAPI backend is running.";
  }
  return error?.message || "Something went wrong. Please try again.";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "blue",
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <p className="metric-label">{label}</p>
      <div className="metric-value">{value}</div>
      <div className="metric-bottom">
        <span className="metric-neutral">{note}</span>
      </div>
    </article>
  );
}

function EmptyState({ icon: Icon = FileSearch, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={25} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function App() {
  const [page, setPage] = useState("Overview");
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [search, setSearch] = useState("");
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [compareFirst, setCompareFirst] = useState("");
  const [compareSecond, setCompareSecond] = useState("");
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [impactText, setImpactText] = useState("");
  const [impactResult, setImpactResult] = useState(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/documents`);
      if (!response.ok) {
        throw new Error(`Could not load documents (${response.status}).`);
      }

      const payload = await response.json();
      setDocuments(getDocuments(payload));
      setApiOnline(true);
    } catch (err) {
      setApiOnline(false);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (notice) {
      const timeout = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(timeout);
    }
  }, [notice]);

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return documents;

    return documents.filter((doc) =>
      getDocumentName(doc).toLowerCase().includes(query)
    );
  }, [documents, search]);

  const recentDocuments = useMemo(() => {
    return [...documents].slice(-5).reverse();
  }, [documents]);

  const openPage = (nextPage) => {
    setPage(nextPage);
    setMobileNav(false);
    setError("");
    setSelectedDocument(null);
  };

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf" &&
        !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("The PDF must be smaller than 10 MB.");
      return;
    }

    setError("");
    setFile(selectedFile);
  };

  const uploadDocument = async (event) => {
    event?.preventDefault();

    if (!file) {
      setError("Choose a PDF file before uploading.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API}/documents/extract`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail || result.message || `Upload failed (${response.status}).`
        );
      }

      setNotice("Your PDF was processed successfully.");
      setFile(null);
      await loadDocuments();
      setPage("Documents");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (doc) => {
    setSelectedDocument(doc);
    setError("");

    const id = getDocumentId(doc);
    if (id === undefined || id === null) return;

    try {
      const response = await fetch(
        `${API}/documents/${encodeURIComponent(id)}`
      );

      if (!response.ok) return;

      const details = await response.json();
      setSelectedDocument({ ...doc, ...details });
    } catch {
      // Keep the document summary visible if detail retrieval is unavailable.
    }
  };

  const compareDocuments = async (event) => {
    event?.preventDefault();

    if (!compareFirst || !compareSecond) {
      setError("Select both documents to compare.");
      return;
    }

    if (compareFirst === compareSecond) {
      setError("Choose two different documents.");
      return;
    }

    setComparing(true);
    setError("");
    setComparison(null);

    try {
      const response = await fetch(`${API}/documents/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document1_id: compareFirst,
          document2_id: compareSecond,
          old_document_id: compareFirst,
          new_document_id: compareSecond,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail || result.message ||
          `Comparison failed (${response.status}).`
        );
      }

      setComparison(result);
      setNotice("Document comparison completed.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setComparing(false);
    }
  };

  const askQuestion = async (event) => {
    event?.preventDefault();

    const prompt = question.trim();
    if (!prompt) return;

    setMessages((current) => [
      ...current,
      { role: "user", content: prompt },
    ]);
    setQuestion("");
    setAsking(true);
    setError("");

    try {
      // This endpoint is used only if your backend implements it.
      const response = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          document_id: selectedDocument ? getDocumentId(selectedDocument) : null,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
          "The question-answering API is not configured yet. Your document ingestion and comparison features can still be used."
        );
      }

      const answer =
        result.answer ||
        result.response ||
        result.message ||
        "The API returned no answer.";

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: answer,
          citations: result.citations || result.sources || [],
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: getErrorMessage(err),
          citations: [],
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const runImpactAnalysis = (event) => {
    event?.preventDefault();

    if (!impactText.trim()) {
      setError("Enter a requirement or regulatory change to review.");
      return;
    }

    setError("");
    setImpactResult({
      requirement: impactText.trim(),
      message:
        "Your input has been captured. Evidence-backed impact analysis will become available when the analysis workflow is connected to the regulatory document retrieval pipeline.",
    });
  };

  const navigateToUpload = () => {
    setPage("Documents");
    setSelectedDocument(null);
    setError("");
    setTimeout(() => {
      document.getElementById("pdf-upload-input")?.focus();
    }, 0);
  };

  const pageInfo = pageDetails[page] || pageDetails.Overview;

  return (
    <div className="app-shell">
      {mobileNav && (
        <button
          type="button"
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}

      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <ShieldCheck size={23} strokeWidth={2.2} />
          </div>
          <div className="brand-copy">
            <strong>RegulaLens</strong>
            <span>REGULATORY INTELLIGENCE</span>
          </div>
          <button
            type="button"
            className="mobile-close"
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">R</div>
          <div className="workspace-copy">
            <strong>My workspace</strong>
            <span>Personal workspace</span>
          </div>
          <ChevronDown size={16} />
        </div>

        <nav className="sidebar-navigation" aria-label="Main navigation">
          {["WORKSPACE", "INTELLIGENCE"].map((group) => (
            <div className="nav-group" key={group}>
              <p className="nav-group-label">{group}</p>
              {navigation
                .filter((item) => item.group === group)
                .map(({ label, icon: Icon }) => (
                  <button
                    type="button"
                    key={label}
                    className={`nav-item ${page === label ? "active" : ""}`}
                    onClick={() => openPage(label)}
                  >
                    <Icon size={18} strokeWidth={1.9} />
                    <span>{label}</span>
                    {label === "Change Monitor" && (
                      <span className="nav-soon">COMPARE</span>
                    )}
                  </button>
                ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-status">
          <span className={`status-dot ${apiOnline ? "online" : ""}`} />
          <div>
            <strong>{apiOnline ? "API connected" : "API not connected"}</strong>
            <span>{apiOnline ? "Backend is responding" : "Check your backend"}</span>
          </div>
          <button
            type="button"
            aria-label="Refresh API status"
            title="Refresh API status"
            onClick={loadDocuments}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-item"
            onClick={() => setNotice("Settings will be available in a future update.")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <div className="profile-row">
            <div className="profile-avatar">RS</div>
            <div className="profile-copy">
              <strong>Workspace owner</strong>
              <span>Free workspace</span>
            </div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>{page}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="api-indicator">
              <span className={`status-dot ${apiOnline ? "online" : ""}`} />
              {apiOnline ? "System operational" : "Backend disconnected"}
            </div>
            <button
              type="button"
              className="icon-button"
              title="Notifications"
              aria-label="Notifications"
              onClick={() => setNotice("You're all caught up.")}
            >
              <Bell size={18} />
            </button>
            <div className="topbar-avatar">RS</div>
          </div>
        </header>

        <div className="page-content">
          {notice && (
            <div className="notice-banner" role="status">
              <CheckCircle2 size={17} />
              <span>{notice}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                REGULATORY WORKSPACE
              </div>
              <h1>{pageInfo.title}<span className="heading-period">.</span></h1>
              <p className="subtitle">{pageInfo.subtitle}</p>
            </div>
            <div className="heading-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={loadDocuments}
                disabled={loading}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={navigateToUpload}
              >
                <Plus size={17} />
                Add document
              </button>
            </div>
          </div>

          {page === "Overview" && (
            <>
              <section className="welcome-banner">
                <div className="banner-content">
                  <div className="banner-kicker">
                    <Sparkles size={14} />
                    YOUR REGULATORY COMMAND CENTER
                  </div>
                  <h2>Stay ahead of every<br />regulatory change.</h2>
                  <p>
                    Bring your regulatory documents together, compare
                    requirements, and build a clearer picture of what changed.
                  </p>
                  <button
                    type="button"
                    className="banner-button"
                    onClick={navigateToUpload}
                  >
                    Get started with a document
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="banner-visual" aria-hidden="true">
                  <div className="visual-orbit orbit-one" />
                  <div className="visual-orbit orbit-two" />
                  <div className="visual-center">
                    <ShieldCheck size={44} strokeWidth={1.5} />
                  </div>
                  <div className="float-card float-check">
                    <CheckCircle2 size={18} />
                    <span>Document ready</span>
                  </div>
                  <div className="float-card float-spark">
                    <Sparkles size={17} />
                    <span>Insight workspace</span>
                  </div>
                </div>
              </section>

              <div className="section-heading">
                <div>
                  <h2>Workspace overview</h2>
                  <p>A quick look at your regulatory intelligence workspace.</p>
                </div>
                <span className="live-label">
                  <span className={`status-dot ${apiOnline ? "online" : ""}`} />
                  {apiOnline ? "LIVE DATA" : "AWAITING CONNECTION"}
                </span>
              </div>

              <section className="metrics-grid">
                <MetricCard
                  icon={FileText}
                  label="TOTAL DOCUMENTS"
                  value={documents.length}
                  note="Available in your workspace"
                  tone="teal"
                />
                <MetricCard
                  icon={GitCompareArrows}
                  label="COMPARISONS"
                  value={comparison ? 1 : "—"}
                  note="Completed in this session"
                  tone="violet"
                />
                <MetricCard
                  icon={FileCheck2}
                  label="PROCESSED FILES"
                  value={documents.length}
                  note="Documents returned by the API"
                  tone="blue"
                />
                <MetricCard
                  icon={Activity}
                  label="API STATUS"
                  value={apiOnline ? "Online" : "Offline"}
                  note={apiOnline ? "Backend responding" : "Check backend terminal"}
                  tone="amber"
                />
              </section>

              <section className="dashboard-grid">
                <article className="panel recent-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Recently added documents</h3>
                      <p>Your latest regulatory files.</p>
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => openPage("Documents")}
                    >
                      View all <ArrowRight size={15} />
                    </button>
                  </div>

                  {loading && documents.length === 0 ? (
                    <div className="panel-loading">
                      <LoaderCircle className="spin" size={20} />
                      <span>Loading documents...</span>
                    </div>
                  ) : recentDocuments.length > 0 ? (
                    <div className="document-list">
                      {recentDocuments.map((doc, index) => (
                        <button
                          type="button"
                          className="document-row"
                          key={getDocumentId(doc) ?? index}
                          onClick={() => openDocument(doc)}
                        >
                          <div className="pdf-icon">
                            <FileText size={19} />
                          </div>
                          <div className="document-info">
                            <strong>{getDocumentName(doc)}</strong>
                            <span>
                              {formatDate(
                                doc.uploaded_at ||
                                doc.created_at ||
                                doc.createdAt
                              )}
                            </span>
                          </div>
                          <span className="status-badge extracted">
                            <Check size={12} /> Available
                          </span>
                          <ChevronRight className="row-arrow" size={17} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={FileText}
                      title="Your workspace starts here"
                      description="Upload a regulatory PDF to begin building your document library."
                      action={
                        <button
                          type="button"
                          className="button-primary"
                          onClick={navigateToUpload}
                        >
                          <Upload size={15} /> Upload a PDF
                        </button>
                      }
                    />
                  )}
                </article>

                <article className="panel next-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Your next steps</h3>
                      <p>Get more out of RegulaLens.</p>
                    </div>
                    <div className="mini-spark">
                      <Zap size={17} />
                    </div>
                  </div>

                  <div className="checklist">
                    <button
                      type="button"
                      className="checklist-item"
                      onClick={navigateToUpload}
                    >
                      <span className="check-circle complete">
                        <Check size={14} />
                      </span>
                      <span>
                        <strong>Upload a regulatory PDF</strong>
                        <p>Start with a circular or notification.</p>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="checklist-item"
                      onClick={() => openPage("Change Monitor")}
                    >
                      <span className="check-circle">
                        <GitCompareArrows size={14} />
                      </span>
                      <span>
                        <strong>Compare two versions</strong>
                        <p>Identify differences between documents.</p>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="checklist-item"
                      onClick={() => openPage("Ask RegulaLens")}
                    >
                      <span className="check-circle">
                        <MessageSquareText size={14} />
                      </span>
                      <span>
                        <strong>Explore document Q&A</strong>
                        <p>Prepare questions about your documents.</p>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="feature-tags">
                    <span className="feature-tag">
                      <ShieldCheck size={13} /> Evidence-focused
                    </span>
                    <span className="feature-tag">
                      <BookOpen size={13} /> Document-centric
                    </span>
                  </div>
                </article>
              </section>

              <div className="bottom-note">
                <Lightbulb size={17} />
                <span>
                  <strong>Built for clarity.</strong> Use the source documents
                  as your reference when reviewing regulatory requirements.
                </span>
              </div>
            </>
          )}

          {page === "Documents" && (
            <>
              <section className="panel upload-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Add a regulatory document</h3>
                    <p>Upload a PDF to extract its text for further analysis.</p>
                  </div>
                  <div className="mini-spark">
                    <CloudUpload size={18} />
                  </div>
                </div>

                <form onSubmit={uploadDocument}>
                  <label
                    className={`upload-dropzone ${dragging ? "dragging" : ""}`}
                    htmlFor="pdf-upload-input"
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      handleFileSelection(event.dataTransfer.files?.[0]);
                    }}
                  >
                    <div className="upload-icon">
                      <CloudUpload size={27} />
                    </div>
                    <strong>
                      {file ? file.name : "Drop your PDF here, or browse"}
                    </strong>
                    <span>
                      {file
                        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB selected`
                        : "PDF files only · Maximum file size 10 MB"}
                    </span>
                    <input
                      id="pdf-upload-input"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(event) =>
                        handleFileSelection(event.target.files?.[0])
                      }
                    />
                    <span className="upload-browse">Choose file</span>
                  </label>

                  <div className="upload-actions">
                    {file && (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => setFile(null)}
                      >
                        <X size={15} /> Remove file
                      </button>
                    )}
                    <button
                      type="submit"
                      className="button-primary"
                      disabled={!file || uploading}
                    >
                      {uploading ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Upload size={16} />
                      )}
                      {uploading ? "Processing PDF..." : "Upload and extract"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="panel documents-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Document library</h3>
                    <p>
                      {documents.length}{" "}
                      {documents.length === 1 ? "document" : "documents"} in
                      your workspace.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={loadDocuments}
                    disabled={loading}
                  >
                    <RefreshCw size={15} className={loading ? "spin" : ""} />
                    Refresh
                  </button>
                </div>

                <div className="table-toolbar">
                  <div className="search-box">
                    <Search size={17} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search documents..."
                      aria-label="Search documents"
                    />
                    {search && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setSearch("")}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <span className="result-count">
                    {filteredDocuments.length} results
                  </span>
                </div>

                {filteredDocuments.length > 0 ? (
                  <div className="document-list">
                    {filteredDocuments.map((doc, index) => (
                      <button
                        type="button"
                        className="document-row"
                        key={getDocumentId(doc) ?? index}
                        onClick={() => openDocument(doc)}
                      >
                        <div className="pdf-icon">
                          <FileText size={19} />
                        </div>
                        <div className="document-info">
                          <strong>{getDocumentName(doc)}</strong>
                          <span>
                            {formatDate(
                              doc.uploaded_at ||
                              doc.created_at ||
                              doc.createdAt
                            )}
                            {doc.page_count ? ` · ${doc.page_count} pages` : ""}
                          </span>
                        </div>
                        <span className="status-badge extracted">
                          <Check size={12} /> Available
                        </span>
                        <ChevronRight className="row-arrow" size={17} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={FileSearch}
                    title={search ? "No matching documents" : "No documents yet"}
                    description={
                      search
                        ? "Try a different search term."
                        : "Upload your first PDF above to populate your document library."
                    }
                    action={
                      search ? (
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => setSearch("")}
                        >
                          Clear search
                        </button>
                      ) : null
                    }
                  />
                )}
              </section>

              {selectedDocument && (
                <section className="panel detail-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>{getDocumentName(selectedDocument)}</h3>
                      <p>Document details and extracted content.</p>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Close document details"
                      onClick={() => setSelectedDocument(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="detail-body">
                    <div className="detail-meta">
                      <span>Document ID</span>
                      <strong>{String(getDocumentId(selectedDocument) ?? "Not provided")}</strong>
                    </div>
                    <div className="detail-meta">
                      <span>Uploaded</span>
                      <strong>
                        {formatDate(
                          selectedDocument.uploaded_at ||
                          selectedDocument.created_at
                        )}
                      </strong>
                    </div>
                    <div className="extracted-content">
                      <h4>Extracted text</h4>
                      <pre>
                        {selectedDocument.extracted_text ||
                          selectedDocument.text ||
                          selectedDocument.content ||
                          selectedDocument.text_content ||
                          "The document record was retrieved. This response did not include a text field. Check your API response schema if you expected the extracted text here."}
                      </pre>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

          {page === "Change Monitor" && (
            <section className="panel workspace-panel">
              <div className="panel-heading">
                <div>
                  <h3>Compare document versions</h3>
                  <p>
                    Choose two uploaded documents to inspect differences.
                  </p>
                </div>
                <div className="mini-spark">
                  <GitCompareArrows size={18} />
                </div>
              </div>

              {documents.length < 2 ? (
                <EmptyState
                  icon={GitCompareArrows}
                  title="Two documents needed"
                  description="Upload at least two regulatory PDFs before starting a comparison."
                  action={
                    <button
                      type="button"
                      className="button-primary"
                      onClick={navigateToUpload}
                    >
                      <Plus size={15} /> Add documents
                    </button>
                  }
                />
              ) : (
                <form className="comparison-form" onSubmit={compareDocuments}>
                  <div className="comparison-selectors">
                    <label className="field-label">
                      <span>BASELINE DOCUMENT</span>
                      <select
                        value={compareFirst}
                        onChange={(event) => setCompareFirst(event.target.value)}
                        required
                      >
                        <option value="">Select earlier version</option>
                        {documents.map((doc, index) => (
                          <option
                            key={getDocumentId(doc) ?? index}
                            value={String(getDocumentId(doc))}
                          >
                            {getDocumentName(doc)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="comparison-arrow">
                      <GitCompareArrows size={22} />
                    </div>

                    <label className="field-label">
                      <span>DOCUMENT TO COMPARE</span>
                      <select
                        value={compareSecond}
                        onChange={(event) => setCompareSecond(event.target.value)}
                        required
                      >
                        <option value="">Select newer version</option>
                        {documents.map((doc, index) => (
                          <option
                            key={getDocumentId(doc) ?? index}
                            value={String(getDocumentId(doc))}
                          >
                            {getDocumentName(doc)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="button-primary"
                    disabled={comparing}
                  >
                    {comparing ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      <GitCompareArrows size={16} />
                    )}
                    {comparing ? "Comparing documents..." : "Compare versions"}
                  </button>
                </form>
              )}

              {comparison && (
                <div className="comparison-results">
                  <div className="results-title">
                    <CheckCircle2 size={19} />
                    <div>
                      <h3>Comparison completed</h3>
                      <p>Review the response returned by the comparison API.</p>
                    </div>
                  </div>
                  <div className="comparison-summary">
                    <span>Total changes</span>
                    <strong>
                      {comparison.total_changes ??
                        comparison.changes?.length ??
                        comparison.differences?.length ??
                        "—"}
                    </strong>
                  </div>
                  {Array.isArray(comparison.changes) &&
                    comparison.changes.length > 0 && (
                      <div className="change-list">
                        {comparison.changes.map((change, index) => (
                          <div className="change-item" key={index}>
                            <span className="change-number">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <strong>
                                {change.type ||
                                  change.change_type ||
                                  "Change detected"}
                              </strong>
                              <p>
                                {change.description ||
                                  change.text ||
                                  change.content ||
                                  JSON.stringify(change)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  <details className="raw-response">
                    <summary>View complete API response</summary>
                    <pre>{JSON.stringify(comparison, null, 2)}</pre>
                  </details>
                </div>
              )}
            </section>
          )}

          {page === "Ask RegulaLens" && (
            <section className="panel chat-panel">
              <div className="panel-heading">
                <div>
                  <h3>Ask your regulatory questions</h3>
                  <p>
                    Ask about your documents in plain language. Answers require
                    a connected Q&amp;A endpoint.
                  </p>
                </div>
                <div className="mini-spark">
                  <Sparkles size={18} />
                </div>
              </div>

              <div className="chat-context">
                <div className="chat-context-icon">
                  <BookOpen size={18} />
                </div>
                <div>
                  <strong>Document context</strong>
                  <p>
                    {selectedDocument
                      ? getDocumentName(selectedDocument)
                      : `${documents.length} document(s) available. Select a document in the Documents page to inspect it.`}
                  </p>
                </div>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => openPage("Documents")}
                >
                  View documents
                </button>
              </div>

              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-welcome">
                    <div className="chat-welcome-icon">
                      <MessageSquareText size={24} />
                    </div>
                    <h3>What would you like to understand?</h3>
                    <p>
                      Start with a question about a regulatory requirement,
                      document section, or a change you want to review.
                    </p>
                    <div className="suggestion-list">
                      {[
                        "Summarize the key requirements",
                        "What should I review in this document?",
                        "Explain the main regulatory obligations",
                      ].map((suggestion) => (
                        <button
                          type="button"
                          key={suggestion}
                          onClick={() => setQuestion(suggestion)}
                        >
                          <Sparkles size={14} />
                          {suggestion}
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      className={`chat-message ${message.role}`}
                      key={`${message.role}-${index}`}
                    >
                      <div className="chat-message-icon">
                        {message.role === "user" ? (
                          <span>RS</span>
                        ) : (
                          <ShieldCheck size={17} />
                        )}
                      </div>
                      <div className="chat-message-body">
                        <strong>
                          {message.role === "user" ? "You" : "RegulaLens"}
                        </strong>
                        <p>{message.content}</p>
                        {message.citations?.length > 0 && (
                          <div className="citation-list">
                            <strong>Sources</strong>
                            {message.citations.map((citation, citationIndex) => (
                              <div key={citationIndex}>
                                <FileText size={13} />
                                {typeof citation === "string"
                                  ? citation
                                  : citation.title ||
                                    citation.filename ||
                                    JSON.stringify(citation)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {asking && (
                  <div className="chat-thinking">
                    <LoaderCircle size={16} className="spin" />
                    Preparing response...
                  </div>
                )}
              </div>

              <form className="chat-composer" onSubmit={askQuestion}>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask a question about your regulatory documents..."
                  rows={2}
                  aria-label="Your question"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      askQuestion(event);
                    }
                  }}
                />
                <div className="composer-footer">
                  <span>
                    <ShieldCheck size={13} />
                    Always verify answers against source documents.
                  </span>
                  <button
                    type="submit"
                    className="button-primary"
                    disabled={!question.trim() || asking}
                  >
                    <Send size={15} /> Send
                  </button>
                </div>
              </form>
            </section>
          )}

          {page === "Impact Analysis" && (
            <section className="panel workspace-panel">
              <div className="panel-heading">
                <div>
                  <h3>Regulatory impact review</h3>
                  <p>
                    Capture a requirement or change that needs further review.
                  </p>
                </div>
                <div className="mini-spark">
                  <BarChart3 size={18} />
                </div>
              </div>

              <form className="impact-form" onSubmit={runImpactAnalysis}>
                <label className="field-label">
                  <span>REQUIREMENT OR CHANGE</span>
                  <textarea
                    value={impactText}
                    onChange={(event) => setImpactText(event.target.value)}
                    placeholder="Describe a new regulatory requirement, changed obligation, or business process you want to review..."
                    rows={5}
                    required
                  />
                </label>
                <div className="impact-guidance">
                  <Lightbulb size={17} />
                  <p>
                    A complete impact assessment should connect each finding to
                    the source text and distinguish confirmed requirements from
                    items needing human review.
                  </p>
                </div>
                <button type="submit" className="button-primary">
                  <FileSearch size={16} /> Prepare review
                </button>
              </form>

              {impactResult && (
                <div className="impact-result">
                  <div className="results-title">
                    <FileClock size={19} />
                    <div>
                      <h3>Review input captured</h3>
                      <p>{impactResult.message}</p>
                    </div>
                  </div>
                  <div className="impact-requirement">
                    <strong>Requirement submitted</strong>
                    <p>{impactResult.requirement}</p>
                  </div>
                  <div className="impact-disclaimer">
                    <AlertCircle size={16} />
                    No compliance conclusion has been generated. Connect the
                    retrieval and evidence-analysis pipeline to produce
                    source-backed findings.
                  </div>
                </div>
              )}
            </section>
          )}

          <footer className="app-footer">
            <div>
              <ShieldCheck size={15} />
              <span>RegulaLens AI</span>
              <span className="footer-separator">·</span>
              <span>Regulatory intelligence workspace</span>
            </div>
            <span className="footer-version">DEVELOPMENT BUILD</span>
          </footer>
        </div>
      </main>

      {selectedDocument && page !== "Documents" && (
        <div className="document-drawer-backdrop" onClick={() => setSelectedDocument(null)}>
          <section
            className="document-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Document details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-heading">
              <div>
                <h3>{getDocumentName(selectedDocument)}</h3>
                <p>Document details</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close"
                onClick={() => setSelectedDocument(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="detail-body">
              <div className="detail-meta">
                <span>Document ID</span>
                <strong>{String(getDocumentId(selectedDocument) ?? "Not provided")}</strong>
              </div>
              <div className="extracted-content">
                <h4>Extracted text</h4>
                <pre>
                  {selectedDocument.extracted_text ||
                    selectedDocument.text ||
                    selectedDocument.content ||
                    "No extracted text was returned by the detail endpoint."}
                </pre>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
