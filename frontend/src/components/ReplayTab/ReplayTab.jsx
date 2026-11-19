import { useState, useEffect } from "react";
import helpers from "../../services";
import "./ReplayTab.css";

const ReplayTab = ({ request }) => {
  const [targetUrl, setTargetUrl] = useState("");
  const [method, setMethod] = useState(request.payload.method || "POST");
  const [showEditor, setShowEditor] = useState(false);
  const [customBody, setCustomBody] = useState("");
  const [customHeaders, setCustomHeaders] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latestReplay, setLatestReplay] = useState(null);
  const [replaysHistory, setReplaysHistory] = useState([]);

  // Initialize custom body & headers when request changes
  useEffect(() => {
    if (request) {
      setMethod(request.payload.method || "POST");
      const initialBody =
        typeof request.payload.body === "string"
          ? request.payload.body
          : request.payload.raw_body ||
            (request.payload.body ? JSON.stringify(request.payload.body, null, 2) : "");
      setCustomBody(initialBody);

      const initialHeaders = request.payload.headers
        ? JSON.stringify(request.payload.headers, null, 2)
        : "{}";
      setCustomHeaders(initialHeaders);

      // Load replay history
      loadHistory();
    }
  }, [request.id]);

  const loadHistory = async () => {
    try {
      const history = await helpers.getReplays(request.id);
      setReplaysHistory(history || []);
      if (history && history.length > 0 && !latestReplay) {
        setLatestReplay(history[0]);
      }
    } catch {
      // Ignore
    }
  };

  const handleSendReplay = async (e) => {
    e.preventDefault();
    if (!targetUrl.trim()) {
      setError("Please enter a valid target URL");
      return;
    }

    setLoading(true);
    setError(null);

    let parsedHeaders = undefined;
    if (showEditor && customHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(customHeaders);
      } catch {
        setError("Invalid JSON format in custom headers");
        setLoading(false);
        return;
      }
    }

    try {
      const result = await helpers.sendReplay(request.id, {
        targetUrl: targetUrl.trim(),
        method: showEditor ? method : request.payload.method,
        headers: parsedHeaders,
        body: showEditor ? customBody : undefined,
      });

      setLatestReplay(result);
      setReplaysHistory((prev) => [result, ...prev]);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || "Replay failed";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="replay-tab-container">
      {/* Target URL & Action Bar */}
      <form onSubmit={handleSendReplay} className="replay-action-card">
        <div className="replay-input-row">
          {showEditor && (
            <select
              className="method-select mono"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          )}

          <input
            type="text"
            className="target-url-input mono"
            placeholder="https://api.example.com/webhook-receiver"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Replaying..." : "Send Replay"}
          </button>

          <button
            type="button"
            className={`btn ${showEditor ? "btn-active" : ""}`}
            onClick={() => setShowEditor(!showEditor)}
          >
            {showEditor ? "Hide Editor" : "Edit-then-Replay"}
          </button>
        </div>

        <div className="target-url-presets">
          <span className="preset-label">Quick test:</span>
          <button
            type="button"
            className="preset-pill mono"
            onClick={() => setTargetUrl("https://httpbin.org/post")}
          >
            https://httpbin.org/post
          </button>
          <button
            type="button"
            className="preset-pill mono"
            onClick={() => setTargetUrl("https://httpbin.org/anything")}
          >
            https://httpbin.org/anything
          </button>
        </div>

        {error && <div className="replay-error-banner">{error}</div>}

        {/* Edit-then-replay editor */}
        {showEditor && (
          <div className="edit-replay-panel">
            <div className="editor-columns">
              <div className="editor-group">
                <div className="editor-header">
                  <span>Custom Headers (JSON)</span>
                </div>
                <textarea
                  className="mono code-textarea"
                  rows={6}
                  value={customHeaders}
                  onChange={(e) => setCustomHeaders(e.target.value)}
                  placeholder="{}"
                />
              </div>

              <div className="editor-group">
                <div className="editor-header">
                  <span>Custom Payload Body</span>
                </div>
                <textarea
                  className="mono code-textarea"
                  rows={6}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="Payload body..."
                />
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Replay Result Panel */}
      {latestReplay && (
        <div className="replay-result-card">
          <div className="result-header">
            <div className="result-header-left">
              <span className="result-title">Response</span>
              <span
                className={`badge-status ${
                  latestReplay.response_status >= 200 && latestReplay.response_status < 300
                    ? "status-success"
                    : latestReplay.response_status >= 400
                    ? "status-error"
                    : "status-warning"
                }`}
              >
                {latestReplay.response_status || "ERR"}
              </span>
              <span className="latency-badge mono">{latestReplay.latency_ms} ms</span>
              <span className="target-url-tag mono">{latestReplay.target_url}</span>
            </div>
            <span className="time-tag mono">
              {helpers.formatRelativeTime(latestReplay.created_at)}
            </span>
          </div>

          {latestReplay.error_message && (
            <div className="replay-error-msg">{latestReplay.error_message}</div>
          )}

          <div className="result-body-box">
            <pre className="mono result-pre">
              {latestReplay.response_body || "(Empty response body)"}
            </pre>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="replay-history-section">
        <div className="history-header">
          <span>Replay History ({replaysHistory.length})</span>
        </div>

        {replaysHistory.length === 0 && !loading && (
          <div className="history-empty">
            No replays sent yet for this request. Enter a target URL above to test.
          </div>
        )}

        {replaysHistory.length > 0 && (
          <div className="history-table">
            <div className="history-table-header mono">
              <span className="col-status">Status</span>
              <span className="col-url">Target URL</span>
              <span className="col-lat">Latency</span>
              <span className="col-time">Time</span>
            </div>
            {replaysHistory.map((rep) => (
              <div
                key={rep.id}
                className={`history-row mono ${
                  latestReplay && latestReplay.id === rep.id ? "row-selected" : ""
                }`}
                onClick={() => setLatestReplay(rep)}
              >
                <span className="col-status">
                  <span
                    className={`badge-status ${
                      rep.response_status >= 200 && rep.response_status < 300
                        ? "status-success"
                        : "status-error"
                    }`}
                  >
                    {rep.response_status || "ERR"}
                  </span>
                </span>
                <span className="col-url truncate">{rep.target_url}</span>
                <span className="col-lat">{rep.latency_ms} ms</span>
                <span className="col-time">{helpers.formatRelativeTime(rep.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplayTab;
