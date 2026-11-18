import { useState } from "react";
import helpers from "../../services";
import "./DiffTab.css";

const DiffTab = ({ request }) => {
  const [targetUrlA, setTargetUrlA] = useState("");
  const [targetUrlB, setTargetUrlB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diffResult, setDiffResult] = useState(null);

  const handleRunDiff = async (e) => {
    e.preventDefault();
    if (!targetUrlA.trim() || !targetUrlB.trim()) {
      setError("Please provide both Target URL A and Target URL B");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await helpers.sendDualReplay(request.id, {
        targetUrlA: targetUrlA.trim(),
        targetUrlB: targetUrlB.trim(),
      });
      setDiffResult(result);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Dual replay failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="diff-tab-container">
      <form onSubmit={handleRunDiff} className="diff-form-card">
        <div className="diff-inputs-grid">
          <div className="diff-input-group">
            <label>Target URL A (e.g. Production)</label>
            <input
              type="text"
              className="mono"
              placeholder="https://api.example.com/prod/webhook"
              value={targetUrlA}
              onChange={(e) => setTargetUrlA(e.target.value)}
            />
          </div>

          <div className="diff-input-group">
            <label>Target URL B (e.g. Staging / Canary)</label>
            <input
              type="text"
              className="mono"
              placeholder="https://api.example.com/staging/webhook"
              value={targetUrlB}
              onChange={(e) => setTargetUrlB(e.target.value)}
            />
          </div>
        </div>

        <div className="diff-actions-row">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Replaying Dual Targets..." : "Run Dual Replay & Diff"}
          </button>
        </div>

        {error && <div className="diff-error-banner">{error}</div>}
      </form>

      {diffResult && (
        <div className="diff-results-container">
          {/* Summary metric cards */}
          <div className="diff-metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Status Code Match</div>
              <div className="metric-value">
                <span
                  className={`badge-status ${
                    diffResult.diff.statusMatch ? "status-success" : "status-error"
                  }`}
                >
                  {diffResult.diff.statusMatch
                    ? `MATCH (${diffResult.diff.statusA})`
                    : `MISMATCH (${diffResult.diff.statusA} vs ${diffResult.diff.statusB})`}
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Latency Comparison</div>
              <div className="metric-value mono">
                <span>A: {diffResult.diff.latencyA} ms</span>
                <span className="metric-separator">&bull;</span>
                <span>B: {diffResult.diff.latencyB} ms</span>
                <span
                  className={`delta-tag ${
                    diffResult.diff.latencyDeltaMs < 0
                      ? "delta-faster"
                      : diffResult.diff.latencyDeltaMs > 0
                      ? "delta-slower"
                      : ""
                  }`}
                >
                  ({diffResult.diff.latencyDeltaMs > 0 ? "+" : ""}
                  {diffResult.diff.latencyDeltaMs} ms)
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Body Comparison</div>
              <div className="metric-value">
                <span
                  className={`badge-status ${
                    diffResult.diff.bodyIdentical ? "status-success" : "status-warning"
                  }`}
                >
                  {diffResult.diff.bodyIdentical ? "IDENTICAL" : "DIFFERENT"}
                </span>
              </div>
            </div>
          </div>

          {/* Side-by-side Response Body */}
          <div className="side-by-side-card">
            <div className="sbs-header">
              <div className="sbs-col-title mono">
                Target A: {diffResult.targetA.target_url} ({diffResult.targetA.response_status})
              </div>
              <div className="sbs-col-title mono">
                Target B: {diffResult.targetB.target_url} ({diffResult.targetB.response_status})
              </div>
            </div>

            <div className="sbs-body-grid">
              <div className="sbs-body-col">
                <pre className="mono code-box">
                  {diffResult.targetA.response_body || "(Empty body)"}
                </pre>
              </div>
              <div className="sbs-body-col">
                <pre className="mono code-box">
                  {diffResult.targetB.response_body || "(Empty body)"}
                </pre>
              </div>
            </div>
          </div>

          {/* Response Headers Diff Table */}
          {diffResult.diff.headerDiffs && diffResult.diff.headerDiffs.length > 0 && (
            <div className="headers-diff-card">
              <div className="headers-diff-title">Headers Comparison</div>
              <div className="headers-diff-table">
                <div className="hdiff-row hdiff-header mono">
                  <span className="hcol-key">Header</span>
                  <span className="hcol-val">Target A Value</span>
                  <span className="hcol-val">Target B Value</span>
                  <span className="hcol-match">Match</span>
                </div>
                {diffResult.diff.headerDiffs.map((h) => (
                  <div
                    key={h.key}
                    className={`hdiff-row mono ${h.match ? "" : "hdiff-mismatch"}`}
                  >
                    <span className="hcol-key">{h.key}</span>
                    <span className="hcol-val truncate">{h.valA || "(none)"}</span>
                    <span className="hcol-val truncate">{h.valB || "(none)"}</span>
                    <span className="hcol-match">
                      {h.match ? (
                        <span className="match-yes">&check;</span>
                      ) : (
                        <span className="match-no">&times;</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiffTab;
