import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import helpers from "../../services";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recentBins, setRecentBins] = useState([]);
  const [customBinInput, setCustomBinInput] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("origin_recent_bins") || "[]");
      setRecentBins(saved);
    } catch {
      setRecentBins([]);
    }
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
    <div className="home-container">
      <header className="home-topbar">
        <div className="home-brand">
          <div className="brand-dot" />
          <span className="brand-title">HOOKPRISM</span>
          <span className="brand-tag">v2.0</span>
        </div>
        <div className="home-topbar-right">
          <span className="system-status">
            <span className="status-indicator" /> System Online
          </span>
        </div>
      </header>

      <main className="home-main">
        <div className="hero-box">
          <h1 className="hero-heading">Inspect, Replay, and Diff Webhooks</h1>
          <p className="hero-subtext">
            Developer tool to capture HTTP payloads, verify signatures, inject chaos mock responses,
            and replay to single or dual destinations with real-time diffing.
          </p>

          <div className="hero-actions">
            <button
              className="btn btn-primary btn-large"
              onClick={newBinHandler}
              disabled={loading}
            >
              {loading ? "Generating Bin..." : "Create New Bin"}
            </button>

            <form onSubmit={openCustomBin} className="open-existing-form">
              <input
                type="text"
                className="mono input-existing"
                placeholder="Paste bin UUID to open..."
                value={customBinInput}
                onChange={(e) => setCustomBinInput(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary">
                Open
              </button>
            </form>
          </div>

          {recentBins.length > 0 && (
            <div className="recent-bins-card">
              <div className="recent-header">Recent Bins</div>
              <div className="recent-list">
                {recentBins.map((bin) => (
                  <button
                    key={bin}
                    className="recent-item mono"
                    onClick={() => navigate(`/display/${bin}`)}
                  >
                    <span>/api/endpoints/{bin}</span>
                    <span className="arrow-text">&rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-title">Replay &amp; Edit</div>
              <div className="feature-desc">
                Resend stored payloads with custom overrides. Automatic SSRF defense and 10s execution guards.
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-title">Dual-Target Diff</div>
              <div className="feature-desc">
                Parallel dispatch to staging and production. Compare status, headers, body, and latency side-by-side.
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-title">Chaos Simulation</div>
              <div className="feature-desc">
                Simulate latency delays, rate limiting (429), or probabilistic server errors (500) to verify sender retries.
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-title">Signature Verification</div>
              <div className="feature-desc">
                Verify GitHub (X-Hub-Signature-256) and Stripe HMAC signatures using constant-time evaluation.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
