import { useEffect, useMemo, useState } from "react";

interface Farmer {
  id: number;
  name: string;
  village: string;
  sugarcane_tons: number;
  amount_paid: number;
  payment_pending: number;
}

interface DashboardData {
  farmers: Farmer[];
  summary: {
    farmerCount: number;
    totalTons: number;
    totalPaid: number;
    totalPending: number;
  };
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    leaf: <><path d="M20 4c-7.5 0-13 3.7-13 10a6 6 0 0 0 6 6c6.3 0 10-5.5 10-13V4h-3Z" /><path d="M4 21c3-5 7-8 13-11" /></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,
    coins: <><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h2v4M16 14h2v4" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.5-2L20 12M4 12l2.9 5a7 7 0 0 0 11.5-2" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function LoginScreen({
  onLogin,
  loading,
  error,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  loading: boolean;
  error: string;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLogin(username, password);
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <a className="brand login-brand" href="#" aria-label="Sanjivani home">
          <span className="brand-mark"><Icon name="leaf" size={23} /></span>
          <span><strong>sanjivani</strong><small>SUGAR FACTORY</small></span>
        </a>
        <div className="login-kicker"><span /> SECURE ADMIN ACCESS</div>
        <h1>Welcome back</h1>
        <p className="login-copy">Sign in to manage your farmer operations.</p>
        <form className="login-form" onSubmit={submitLogin}>
          <label htmlFor="admin-username">Admin username</label>
          <input id="admin-username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"} <span>→</span>
          </button>
        </form>
        <div className="login-security"><span>●</span> Protected factory workspace</div>
      </section>
      <div className="login-aside">
        <div className="login-aside-orbit" />
        <span className="login-aside-kicker">SANJIVANI FARMER INTELLIGENCE</span>
        <h2>Better insight.<br />Stronger harvests.</h2>
        <p>A clear view of farmer supply, payments, and the people behind every harvest.</p>
        <div className="login-aside-bottom">GROWING TOGETHER <span>✳</span></div>
      </div>
    </main>
  );
}

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState("Factory Admin");
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [farmerForm, setFarmerForm] = useState({
    name: "",
    village: "",
    sugarcane_tons: "",
    amount_paid: "",
    payment_pending: "",
  });
  const [editingFarmerId, setEditingFarmerId] = useState<number | null>(null);
  const [savingFarmer, setSavingFarmer] = useState(false);
  const [farmerFormError, setFarmerFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/session")
      .then(async (response) => {
        if (!active) return;
        const session = (await response.json()) as { authenticated: boolean; username?: string };
        if (active && session.authenticated && session.username) {
          setCurrentAdmin(session.username);
          setAuthenticated(true);
        }
      })
      .catch(() => {
        if (active) setAuthError("Unable to reach the sign-in service. Check that the server is running.");
      })
      .finally(() => {
        if (active) setAuthChecked(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authenticated) void loadDashboard();
  }, [authenticated]);

  async function login(username: string, password: string) {
    setLoginLoading(true);
    setAuthError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as { username?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Sign-in failed (${response.status}).`);
      setCurrentAdmin(payload.username ?? username);
      setAuthenticated(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error(`Sign-out failed (${response.status}).`);
      setAuthenticated(false);
      setData(null);
      setAnswer("");
      setQuestion("");
      setAuthError("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/dashboard");
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!response.ok) throw new Error(`Dashboard request failed (${response.status}).`);
      setData((await response.json()) as DashboardData);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load farmer records.");
    } finally {
      setLoading(false);
    }
  }

  const resetFarmerForm = () => {
    setFarmerForm({ name: "", village: "", sugarcane_tons: "", amount_paid: "", payment_pending: "" });
    setEditingFarmerId(null);
    setFarmerFormError("");
  };

  async function saveFarmer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingFarmer(true);
    setFarmerFormError("");

    try {
      const payload = {
        name: farmerForm.name.trim(),
        village: farmerForm.village.trim(),
        sugarcane_tons: Number(farmerForm.sugarcane_tons),
        amount_paid: Number(farmerForm.amount_paid),
        payment_pending: Number(farmerForm.payment_pending),
      };

      if (!payload.name || !payload.village || !Number.isFinite(payload.sugarcane_tons) || !Number.isFinite(payload.amount_paid) || !Number.isFinite(payload.payment_pending)) {
        throw new Error("Please complete all farmer fields with valid numeric values.");
      }

      const response = await fetch(editingFarmerId ? `/api/farmers/${editingFarmerId}` : "/api/farmers", {
        method: editingFarmerId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string; farmer?: Farmer };
      if (!response.ok) throw new Error(result.error ?? "Unable to save farmer details.");

      await loadDashboard();
      resetFarmerForm();
    } catch (error) {
      setFarmerFormError(error instanceof Error ? error.message : "Unable to save farmer details.");
    } finally {
      setSavingFarmer(false);
    }
  }

  function startEditingFarmer(farmer: Farmer) {
    setEditingFarmerId(farmer.id);
    setFarmerForm({
      name: farmer.name,
      village: farmer.village,
      sugarcane_tons: String(farmer.sugarcane_tons),
      amount_paid: String(farmer.amount_paid),
      payment_pending: String(farmer.payment_pending),
    });
    setFarmerFormError("");
  }

  const farmers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return data?.farmers ?? [];
    return (data?.farmers ?? []).filter((farmer) =>
      `${farmer.name} ${farmer.village}`.toLocaleLowerCase().includes(query),
    );
  }, [data, search]);

  const topFarmers = (data?.farmers ?? []).slice(0, 5);
  const topTons = Math.max(...topFarmers.map((farmer) => farmer.sugarcane_tons), 1);

  async function askModel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("");
    setAskError("");
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload = (await response.json()) as { answer?: string; error?: string };
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!response.ok) throw new Error(payload.error ?? `Model request failed (${response.status}).`);
      setAnswer(payload.answer ?? "The model returned no answer.");
    } catch (error) {
      setAskError(error instanceof Error ? error.message : "Could not reach the AI assistant.");
    } finally {
      setAsking(false);
    }
  }

  const stats = [
    { label: "Registered farmers", value: data ? number.format(data.summary.farmerCount) : "—", note: "Across all villages", icon: "users", tone: "green" },
    { label: "Sugarcane supplied", value: data ? `${number.format(data.summary.totalTons)} t` : "—", note: "Total recorded supply", icon: "leaf", tone: "lime" },
    { label: "Payments completed", value: data ? currency.format(data.summary.totalPaid) : "—", note: "Paid to farmers", icon: "coins", tone: "blue" },
    { label: "Payments outstanding", value: data ? currency.format(data.summary.totalPending) : "—", note: "Pending settlement", icon: "chart", tone: "amber" },
  ];

  if (!authChecked) {
    return <main className="auth-loading"><span className="loading-spinner" /> Checking admin session…</main>;
  }

  if (!authenticated) {
    return <LoginScreen onLogin={login} loading={loginLoading} error={authError} />;
  }

  return (
    <div className="app-shell">
      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="topbar-leading">
            <div className="breadcrumb"><strong>Workspace overview</strong></div>
          </div>
          <div className="topbar-right">
            <span className="live-status"><i /> Live data</span>
            <div className="top-avatar">SF</div>
            <button className="logout-button" onClick={() => void logout()} aria-label="Sign out" title="Sign out"><Icon name="logout" size={17} /></button>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> FARMER OPERATIONS</div>
              <h1>Good day, Factory Admin <span className="wave">✳</span></h1>
              <p className="welcome-copy">Here’s what’s happening across your farmer network.</p>
            </div>
            <button className="refresh-button" onClick={() => void loadDashboard()} disabled={loading}>
              <Icon name="refresh" size={16} /> {loading ? "Refreshing" : "Refresh data"}
            </button>
          </section>

          {loadError && <div className="alert error-alert" role="alert"><span>{loadError}</span><button onClick={() => void loadDashboard()}>Try again</button></div>}

          <section className="stats-grid" aria-label="Farmer summary">
            {stats.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <div className="stat-top"><span>{stat.label}</span><span className={`stat-icon ${stat.tone}`}><Icon name={stat.icon} size={19} /></span></div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-note"><span className={`status-bullet ${stat.tone}`} />{stat.note}</div>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="panel supply-panel" id="supply">
              <div className="panel-heading">
                <div><h2>Supply leaderboard</h2><p>Top farmers by sugarcane delivered</p></div>
                <span className="period-pill"><span /> All time</span>
              </div>
              {loading && !data ? <div className="skeleton-list" aria-label="Loading supply data"><i /><i /><i /><i /></div> :
                topFarmers.length ? <div className="leaderboard">
                  {topFarmers.map((farmer, index) => (
                    <div className="leader-row" key={`${farmer.name}-${farmer.village}`}>
                      <div className={`rank rank-${index + 1}`}>{String(index + 1).padStart(2, "0")}</div>
                      <div className="leader-info"><strong>{farmer.name}</strong><span>{farmer.village}</span></div>
                      <div className="leader-meter"><span style={{ width: `${Math.max(7, (farmer.sugarcane_tons / topTons) * 100)}%` }} /></div>
                      <strong className="leader-tons">{number.format(farmer.sugarcane_tons)} <small>t</small></strong>
                    </div>
                  ))}
                </div> : <div className="empty-state">{loadError ? "Supply data is unavailable." : "No farmer records found yet."}</div>}
            </article>

            <article className="panel assistant-panel" id="assistant">
              <div className="assistant-header">
                <div className="assistant-icon"><Icon name="spark" size={19} /></div>
                <div><h2>Ask Sanjivani AI</h2><p>Answers grounded in your farmer data</p></div>
                <span className="ai-badge">AI</span>
              </div>
              <div className="suggestion-label">TRY ASKING</div>
              <button className="suggestion" onClick={() => setQuestion("Who supplied the most sugarcane, and what is their pending payment?")}>
                Who supplied the most sugarcane? <span>↗</span>
              </button>
              <button className="suggestion" onClick={() => setQuestion("What is the total pending payment across all farmers?")}>
                What payments are still outstanding? <span>↗</span>
              </button>
              <form className="ask-form" onSubmit={askModel}>
                <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your farmers..." aria-label="Ask the AI about farmer records" maxLength={1000} />
                <button aria-label="Send question" type="submit" disabled={asking || !question.trim()}><Icon name="send" size={17} /></button>
              </form>
              {asking && <div className="model-status"><span className="typing-dots"><i /><i /><i /></span> Reviewing farmer records…</div>}
              {askError && <div className="model-error" role="alert">{askError}</div>}
              {answer && <div className="model-answer"><strong><Icon name="spark" size={15} /> Insight</strong><p>{answer}</p></div>}
            </article>
          </section>

          <section className="panel farmers-panel" id="farmers">
            <div className="panel-heading farmers-heading">
              <div><h2 id="payments">Farmer records</h2><p>Supply and payment overview by farmer</p></div>
              <label className="search-box"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search farmers..." aria-label="Search farmers" /></label>
            </div>

            <form className="farmer-editor" onSubmit={saveFarmer}>
              <div className="farmer-editor-header">
                <strong>{editingFarmerId ? "Update farmer record" : "Add a new farmer"}</strong>
                {editingFarmerId && <button type="button" className="link-button" onClick={resetFarmerForm}>Cancel</button>}
              </div>

              <div className="farmer-form-grid">
                <label>
                  <span>Farmer name</span>
                  <input value={farmerForm.name} onChange={(event) => setFarmerForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Ramesh Patil" required />
                </label>
                <label>
                  <span>Village</span>
                  <input value={farmerForm.village} onChange={(event) => setFarmerForm((current) => ({ ...current, village: event.target.value }))} placeholder="e.g. Rahata" required />
                </label>
                <label>
                  <span>Sugarcane supplied (tons)</span>
                  <input type="number" min="0" step="0.1" value={farmerForm.sugarcane_tons} onChange={(event) => setFarmerForm((current) => ({ ...current, sugarcane_tons: event.target.value }))} required />
                </label>
                <label>
                  <span>Amount paid</span>
                  <input type="number" min="0" step="1000" value={farmerForm.amount_paid} onChange={(event) => setFarmerForm((current) => ({ ...current, amount_paid: event.target.value }))} required />
                </label>
                <label>
                  <span>Pending payment</span>
                  <input type="number" min="0" step="1000" value={farmerForm.payment_pending} onChange={(event) => setFarmerForm((current) => ({ ...current, payment_pending: event.target.value }))} required />
                </label>
              </div>

              {farmerFormError && <div className="farmer-form-error" role="alert">{farmerFormError}</div>}

              <div className="farmer-form-actions">
                <button type="submit" className="primary-button" disabled={savingFarmer}>
                  {savingFarmer ? (editingFarmerId ? "Updating..." : "Saving...") : (editingFarmerId ? "Update farmer" : "Add farmer")}
                </button>
              </div>
            </form>

            <div className="table-scroll">
              <table>
                <thead><tr><th>FARMER</th><th>VILLAGE</th><th>SUGARCANE SUPPLIED</th><th>AMOUNT PAID</th><th>PENDING PAYMENT</th><th>STATUS</th><th>ACTION</th></tr></thead>
                <tbody>
                  {farmers.map((farmer) => (
                    <tr key={farmer.id ?? `${farmer.name}-${farmer.village}`}>
                      <td><div className="farmer-cell"><span className="farmer-avatar">{farmer.name.trim().slice(0, 1).toUpperCase()}</span><strong>{farmer.name}</strong></div></td>
                      <td className="muted-cell">{farmer.village}</td>
                      <td><strong>{number.format(farmer.sugarcane_tons)} t</strong></td>
                      <td>{currency.format(farmer.amount_paid)}</td>
                      <td>{currency.format(farmer.payment_pending)}</td>
                      <td><span className={`payment-status ${farmer.payment_pending > 0 ? "pending" : "settled"}`}><i />{farmer.payment_pending > 0 ? "Pending" : "Settled"}</span></td>
                      <td><button type="button" className="small-button" onClick={() => startEditingFarmer(farmer)}>Edit</button></td>
                    </tr>
                  ))}
                  {!loading && farmers.length === 0 && <tr><td className="table-empty" colSpan={7}>{search ? "No farmers match your search." : loadError ? "Farmer records could not be loaded." : "No farmer records available."}</td></tr>}
                  {loading && !data && <tr><td className="table-empty" colSpan={7}>Loading farmer records…</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-footer"><span>Showing <strong>{farmers.length}</strong> of <strong>{data?.summary.farmerCount ?? 0}</strong> farmers</span><span>Synced from factory records <span className="sync-dot" /></span></div>
          </section>
          <footer className="page-footer"><span>© 2026 Sanjivani Sugar Factory</span><span>Farmer Intelligence Dashboard <span className="footer-separator">·</span> Secure &amp; private</span></footer>
        </div>
      </main>
    </div>
  );
}

export default App;
