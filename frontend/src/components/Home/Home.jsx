import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import helpers from "../../services";
import "./Home.css";

// SVG Prism Logo Mark (A light beam entering a prism and refracting into 3 distinct lines)
const PrismLogo = ({ size = 22, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="prism-logo-svg"
    aria-hidden="true"
  >
    {/* Incoming beam */}
    <path d="M2 14H10" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    {/* Triangular Prism */}
    <polygon
      points="14,4 23,22 5,22"
      stroke={color}
      strokeWidth="1.75"
      fill="rgba(242, 106, 27, 0.08)"
      strokeLinejoin="round"
    />
    {/* Refracted rays */}
    <path d="M18.5 13L26 9.5" stroke="#f26a1b" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M19.5 15.5L26 15.5" stroke="#38bdf8" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M18.5 18L26 21.5" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recentBins, setRecentBins] = useState([]);
  const [customBinInput, setCustomBinInput] = useState("");
  const [apiOnline, setApiOnline] = useState(true);
  const [coldStart, setColdStart] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("origin_recent_bins") || "[]");
      setRecentBins(saved);
    } catch {
      setRecentBins([]);
    }

    // Health check with cold-start detection
    const timer = setTimeout(() => {
      setColdStart(true);
      setApiOnline(false);
    }, 2000);

    helpers
      .checkHealth()
      .then(() => {
        clearTimeout(timer);
        setColdStart(false);
        setApiOnline(true);
      })
      .catch(() => {
        clearTimeout(timer);
        setApiOnline(false);
      });

    return () => clearTimeout(timer);
  }, []);

  const saveRecentBin = (binPath) => {
    try {
      const existing = JSON.parse(localStorage.getItem("origin_recent_bins") || "[]");
      const updated = [binPath, ...existing.filter((b) => b !== binPath)].slice(0, 5);
      localStorage.setItem("origin_recent_bins", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const newBinHandler = async () => {
    setLoading(true);
    try {
      const binPath = await helpers.createBin();
      saveRecentBin(binPath);
      navigate(`/display/${binPath}`);
    } catch (err) {
      alert("Failed to create bin: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const openCustomBin = (e) => {
    e.preventDefault();
    if (!customBinInput.trim()) return;
    const clean = customBinInput.trim().replace(/^\/display\//, "").replace(/^\//, "");
    saveRecentBin(clean);
    navigate(`/display/${clean}`);
  };

  return (
    <div className="hp-landing">
      {/* Cold Start Banner if server sleeping */}
      {coldStart && (
        <aside className="cold-start-banner" role="status">
          <span className="cold-spinner" />
          <span>Waking up the server (free hosting). This can take up to 40 seconds.</span>
          <div className="cold-bar" />
        </aside>
      )}

      {/* 1. Navbar */}
      <header className="hp-navbar">
        <div className="hp-nav-inner">
          <div className="hp-nav-brand">
            <PrismLogo />
            <span className="hp-wordmark">HookPrism</span>
          </div>

          <nav className={`hp-nav-links ${mobileMenuOpen ? "is-open" : ""}`}>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
              How it works
            </a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a
              href="https://github.com/tanmayjoddar/hookprism"
              target="_blank"
              rel="noreferrer noopener"
            >
              GitHub
            </a>
          </nav>

          <div className="hp-nav-right">
            <div className="hp-api-status" title={apiOnline ? "Backend active" : "Server waking up"}>
              <span className={`hp-status-dot ${apiOnline ? "is-online" : "is-waking"}`} />
              <span className="hp-status-text mono">{apiOnline ? "API online" : "Waking up"}</span>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={newBinHandler}
              disabled={loading}
              title="A bin is a temporary URL that catches incoming requests"
            >
              {loading ? "Creating..." : "Create New Bin"}
            </button>

            <button
              type="button"
              className="hp-hamburger"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <main className="hp-main">
        {/* 2. Hero Section */}
        <section className="hp-hero">
          <div className="hp-hero-glow" aria-hidden="true" />
          <div className="hp-hero-content">
            <div className="hp-hero-left">
              <span className="hp-hero-tag mono">Webhook inspector and replay tool</span>
              <h1 className="hp-hero-title">HookPrism</h1>
              <p className="hp-hero-headline">
                See every webhook your app receives. Resend it. Break it on purpose.
              </p>
              <p className="hp-hero-subtext">
                When something happens in one app (a customer pays on Stripe, code is pushed on
                GitHub), that app automatically sends a message called a webhook. HookPrism gives you
                a temporary web address that catches these messages so you can see exactly what was
                sent, replay it, and test how your system reacts when things go wrong.
              </p>

              <div className="hp-hero-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={newBinHandler}
                  disabled={loading}
                  title="A bin is a temporary URL that catches incoming requests"
                >
                  {loading ? "Generating Bin..." : "Create New Bin"}
                </button>

                <form onSubmit={openCustomBin} className="hp-open-form">
                  <input
                    type="text"
                    className="mono hp-bin-input"
                    placeholder="Paste bin ID"
                    value={customBinInput}
                    onChange={(e) => setCustomBinInput(e.target.value)}
                    aria-label="Paste bin ID to open"
                  />
                  <button type="submit" className="btn btn-sm hp-open-btn">
                    Open
                  </button>
                </form>
              </div>

              {recentBins.length > 0 && (
                <div className="hp-recent-card">
                  <div className="hp-recent-label mono">Recent Bins</div>
                  <div className="hp-recent-list">
                    {recentBins.map((bin) => (
                      <button
                        key={bin}
                        type="button"
                        className="hp-recent-row mono"
                        onClick={() => navigate(`/display/${bin}`)}
                      >
                        <span className="truncate">/api/endpoints/{bin}</span>
                        <span className="hp-recent-arrow" aria-hidden="true">
                          &rsaquo;
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hero Visual Mockup: Pure HTML/CSS, slightly tilted, authentic */}
            <div className="hp-hero-right">
              <div className="hp-hero-mockup" aria-hidden="true">
                <div className="hp-mock-header">
                  <div className="hp-mock-left">
                    <span className="hp-mock-dot" />
                    <span className="badge-method badge-post">POST</span>
                    <span className="hp-mock-path mono">/orders</span>
                  </div>
                  <span className="hp-mock-time mono">just now</span>
                </div>

                <div className="hp-mock-body">
                  <pre className="mono hp-mock-json">
                    <code>
                      {`{\n`}
                      {`  `}
                      <span className="json-key">"event"</span>
                      {`: `}
                      <span className="json-string">"order.created"</span>
                      {`,\n`}
                      {`  `}
                      <span className="json-key">"amount"</span>
                      {`: `}
                      <span className="json-number">129.99</span>
                      {`,\n`}
                      {`  `}
                      <span className="json-key">"customer"</span>
                      {`: {\n`}
                      {`    `}
                      <span className="json-key">"id"</span>
                      {`: `}
                      <span className="json-string">"cus_9841"</span>
                      {`,\n`}
                      {`    `}
                      <span className="json-key">"email"</span>
                      {`: `}
                      <span className="json-string">"alex@acme.dev"</span>
                      {`\n  },\n`}
                      {`  `}
                      <span className="json-key">"currency"</span>
                      {`: `}
                      <span className="json-string">"usd"</span>
                      {`\n}`}
                    </code>
                  </pre>
                </div>

                <div className="hp-mock-footer">
                  <div className="hp-mock-status">
                    <span className="badge-status status-success">200 OK</span>
                    <span className="hp-mock-latency mono">142 ms</span>
                  </div>
                  <span className="hp-mock-sig mono">Signature verified</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. "What is a webhook?" Explainer Strip */}
        <section id="how-it-works" className="hp-explainer-section">
          <div className="hp-section-header">
            <span className="hp-eyebrow mono">Plain-English Guide</span>
            <h2 className="hp-section-title">What is a webhook?</h2>
          </div>

          <div className="hp-steps-grid">
            <div className="hp-step-card">
              <div className="hp-step-num mono">01</div>
              <h3 className="hp-step-title">A service sends a message</h3>
              <p className="hp-step-desc">
                A customer pays on Stripe, code is pushed to GitHub, or an order is submitted on
                Shopify. The service sends an automated HTTP message to an address you provide.
              </p>
            </div>

            <div className="hp-step-card">
              <div className="hp-step-num mono">02</div>
              <h3 className="hp-step-title">HookPrism catches it</h3>
              <p className="hp-step-desc">
                Your temporary URL receives the request. HookPrism stores the HTTP method, headers,
                body payload, client IP, and timestamps with zero loss.
              </p>
            </div>

            <div className="hp-step-card">
              <div className="hp-step-num mono">03</div>
              <h3 className="hp-step-title">You see everything</h3>
              <p className="hp-step-desc">
                Headers, payloads, and signatures stream live into your browser. You can resend them
                safely, compare two servers, or inject chaos errors to test retry logic.
              </p>
            </div>
          </div>

          <p className="hp-steps-tagline">No signup. No terminal required.</p>
        </section>

        {/* 4. "Works with" Marquee Row */}
        <section className="hp-marquee-section" aria-label="Supported integrations">
          <span className="hp-marquee-label">Works with any service that sends webhooks</span>
          <div className="hp-marquee-container">
            <div className="hp-marquee-track">
              {["Stripe", "GitHub", "Shopify", "Twilio", "Slack", "Stripe", "GitHub", "Shopify", "Twilio", "Slack"].map(
                (brand, idx) => (
                  <span key={idx} className="hp-brand-item mono">
                    {brand}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        {/* 5. Stats Row (Real facts only) */}
        <section className="hp-stats-section">
          <div className="hp-stats-grid">
            <div className="hp-stat-item">
              <span className="hp-stat-num mono">5</span>
              <span className="hp-stat-label">Inspector tools</span>
              <span className="hp-stat-sub">Body, Headers, Resend, Compare, Verify</span>
            </div>
            <div className="hp-stat-item">
              <span className="hp-stat-num mono">10s</span>
              <span className="hp-stat-label">Resend timeout guard</span>
              <span className="hp-stat-sub">Automated SSRF and execution protection</span>
            </div>
            <div className="hp-stat-item">
              <span className="hp-stat-num mono">2</span>
              <span className="hp-stat-label">Signature providers</span>
              <span className="hp-stat-sub">GitHub HMAC-SHA256 &amp; Stripe</span>
            </div>
          </div>
        </section>

        {/* 6. Statement Section */}
        <section className="hp-statement-section">
          <div className="hp-statement-inner">
            <div className="hp-statement-left">
              <h2 className="hp-statement-heading">Webhooks are invisible. Not anymore.</h2>
              <p className="hp-statement-text">
                Debugging webhook integrations in code is painful: you cannot attach breakpoints to
                third-party dispatchers, testing retries is tedious, and staging can silently break
                without notice. HookPrism gives you complete developer visibility.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={newBinHandler}
                disabled={loading}
              >
                Create New Bin
              </button>
            </div>

            <div className="hp-statement-right">
              {/* Mock Card 1 */}
              <div className="hp-mini-mock">
                <div className="hp-mini-header">
                  <span className="badge-method badge-post">POST</span>
                  <span className="mono">/checkout.completed</span>
                </div>
                <div className="hp-mini-code mono">
                  <code>{`{"status": "paid", "amount_total": 24900}`}</code>
                </div>
              </div>

              {/* Mock Card 2 */}
              <div className="hp-mini-mock hp-mini-highlight">
                <div className="hp-mini-header">
                  <span className="hp-mini-title">Two-server comparison</span>
                  <span className="badge-status status-error">STATUS MISMATCH 200 vs 201</span>
                </div>
                <div className="hp-mini-detail mono">Staging: 200 OK (84ms) &bull; Prod: 201 Created (102ms)</div>
              </div>

              {/* Mock Card 3 */}
              <div className="hp-mini-mock">
                <div className="hp-mini-header">
                  <span className="hp-mini-title">Simulate failures (Chaos Mock)</span>
                  <span className="badge-status status-warning">429 RATE LIMIT</span>
                </div>
                <div className="hp-mini-detail mono">Responds 429 after 500ms delay &bull; 30% failure rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Feature Cards Section (01-04 with Card 01 Featured) */}
        <section id="features" className="hp-features-section">
          <div className="hp-section-header">
            <span className="hp-eyebrow mono">Capabilities</span>
            <h2 className="hp-section-title">Everything you need to debug a webhook</h2>
          </div>

          <div className="hp-features-grid">
            {/* Card 01 - FEATURED */}
            <div className="hp-feat-card hp-feat-featured">
              <div className="hp-feat-top">
                <span className="hp-feat-num mono">01</span>
                <span className="hp-feat-badge mono">FEATURED</span>
              </div>
              <h3 className="hp-feat-title">Resend and edit</h3>
              <p className="hp-feat-desc">
                Send a captured request again to any public URL. Change the method, headers or body
                first to test edge cases.
              </p>
              <div className="hp-feat-tag mono">10s timeout &bull; SSRF-safe</div>
            </div>

            {/* Card 02 */}
            <div className="hp-feat-card">
              <div className="hp-feat-top">
                <span className="hp-feat-num mono">02</span>
              </div>
              <h3 className="hp-feat-title">Compare two servers</h3>
              <p className="hp-feat-desc">
                Send the same request to staging and production at once. See status, speed and
                response differences side by side.
              </p>
              <div className="hp-feat-tag mono tech-tag">Dual-target diff</div>
            </div>

            {/* Card 03 */}
            <div className="hp-feat-card">
              <div className="hp-feat-top">
                <span className="hp-feat-num mono">03</span>
              </div>
              <h3 className="hp-feat-title">Simulate failures</h3>
              <p className="hp-feat-desc">
                Make your URL answer with errors, delays or random failures to see how the sender
                retries.
              </p>
              <div className="hp-feat-tag mono tech-tag">429 / 500 &bull; Chaos mock</div>
            </div>

            {/* Card 04 */}
            <div className="hp-feat-card">
              <div className="hp-feat-top">
                <span className="hp-feat-num mono">04</span>
              </div>
              <h3 className="hp-feat-title">Verify the sender</h3>
              <p className="hp-feat-desc">
                Check that a Stripe or GitHub signature is genuine using your secret key. Constant-time
                cryptographic evaluation prevents timing attacks.
              </p>
              <div className="hp-feat-tag mono tech-tag">HMAC-SHA256</div>
            </div>
          </div>
        </section>

        {/* 8. Closing CTA Banner */}
        <section className="hp-cta-banner">
          <div className="hp-cta-inner">
            <h2 className="hp-cta-heading">Catch your first webhook in 10 seconds</h2>
            <p className="hp-cta-text">
              Zero configuration. Instant temporary HTTPS URL with real-time inspection.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={newBinHandler}
              disabled={loading}
            >
              {loading ? "Generating..." : "Create New Bin"}
            </button>
          </div>
        </section>
      </main>

      {/* 9. Footer */}
      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-grid">
            <div className="hp-footer-col">
              <span className="hp-footer-head mono">Product</span>
              <a href="#" onClick={(e) => { e.preventDefault(); newBinHandler(); }}>
                Create New Bin
              </a>
              <a href="#how-it-works">How it works</a>
              <a href="#features">Features</a>
            </div>

            <div className="hp-footer-col">
              <span className="hp-footer-head mono">Developers</span>
              <a
                href="https://github.com/tanmayjoddar/hookprism"
                target="_blank"
                rel="noreferrer noopener"
              >
                GitHub Repository
              </a>
              <a
                href="https://github.com/tanmayjoddar/hookprism#readme"
                target="_blank"
                rel="noreferrer noopener"
              >
                README &amp; Architecture
              </a>
              <a
                href="https://hookprism.onrender.com/health"
                target="_blank"
                rel="noreferrer noopener"
              >
                API Health Endpoint
              </a>
            </div>

            <div className="hp-footer-col">
              <span className="hp-footer-head mono">Project</span>
              <span>PostgreSQL on Neon</span>
              <span>Cloudflare Workers SPA</span>
              <span>Node.js &amp; Express on Render</span>
            </div>

            <div className="hp-footer-col">
              <span className="hp-footer-head mono">Connect</span>
              <a
                href="https://github.com/tanmayjoddar"
                target="_blank"
                rel="noreferrer noopener"
              >
                GitHub Profile
              </a>
              <span>Tanmay Joddar</span>
            </div>
          </div>

          <div className="hp-footer-bottom">
            <div className="hp-footer-bottom-left">
              <PrismLogo size={18} />
              <span className="mono">HookPrism</span>
              <span className="hp-footer-desc">&bull; Temporary webhook capture and inspection</span>
            </div>
            <div className="hp-footer-bottom-right mono">
              Built by Tanmay Joddar &bull; &copy; 2026
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
