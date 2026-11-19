import { useState } from "react";
import { Link } from "react-router-dom";
import helpers from "../../services";
import "./EndpointHeader.css";

const EndpointHeader = ({ binPath, onOpenChaos, onClearAll, isChaosActive }) => {
  const [copied, setCopied] = useState(false);
  const endpoint = `${helpers.API_BASE_URL}/api/endpoints/${binPath}`;
  const browserTestUrl = `${endpoint}/test-order?item=Mechanical+Keyboard&price=129.99&customer=Alex`;

  const copyHandler = () => {
    navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInTabHandler = () => {
    window.open(browserTestUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <header className="endpoint-navbar">
      <div className="nav-left">
        <Link to="/" className="nav-brand" title="HookPrism Home">
          <div className="nav-brand-dot" />
          <span className="nav-brand-title">HOOKPRISM</span>
        </Link>
        <span className="nav-divider">/</span>
        <span className="nav-bin-uuid mono" title={binPath}>
          {binPath.slice(0, 8)}...{binPath.slice(-4)}
        </span>
        <span className="socket-status-badge" title="Real-time WebSocket connection active">
          <span className="live-dot" />
          <span>LIVE</span>
        </span>
      </div>

      <div className="nav-center">
        <div className="endpoint-address-bar">
          <span className="method-pill" title="Endpoint accepts all HTTP methods (GET, POST, PUT, DELETE, etc.)">
            CATCH-ALL
          </span>
          <span className="endpoint-url-text mono truncate" title={endpoint}>
            {endpoint}
          </span>
          <div className="address-bar-actions">
            <button
              type="button"
              className="action-btn copy-btn"
              onClick={copyHandler}
              title="Copy endpoint URL to clipboard"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              type="button"
              className="action-btn test-btn"
              onClick={openInTabHandler}
              title="Send a live test request directly from a new browser tab"
            >
              ↗ Test in Tab
            </button>
          </div>
        </div>
      </div>

      <div className="nav-right">
        <button
          type="button"
          className={`btn btn-sm ${isChaosActive ? "btn-chaos-active" : ""}`}
          onClick={onOpenChaos}
          title="Configure custom status codes, artificial delays, and failure rates"
        >
          {isChaosActive && <span className="chaos-pulse" />}
          Chaos Mock
        </button>

        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={onClearAll}
          title="Delete all captured requests in this bin"
        >
          Clear
        </button>

        <Link to="/" className="btn btn-sm" title="Create a new webhook bin">
          New Bin
        </Link>
      </div>
    </header>
  );
};

export default EndpointHeader;
