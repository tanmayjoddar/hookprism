import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import socket from "../../socket";
import helpers from "../../services";
import "./EndpointHeader.css";

const PrismLogo = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="prism-logo-svg"
    aria-hidden="true"
  >
    <path d="M2 14H10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <polygon
      points="14,4 23,22 5,22"
      stroke="currentColor"
      strokeWidth="1.75"
      fill="rgba(242, 106, 27, 0.08)"
      strokeLinejoin="round"
    />
    <path d="M18.5 13L26 9.5" stroke="#f26a1b" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M19.5 15.5L26 15.5" stroke="#38bdf8" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M18.5 18L26 21.5" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const EndpointHeader = ({ binPath, onOpenChaos, onClearAll, isChaosActive, requestCount = 0 }) => {
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [menuOpen, setMenuOpen] = useState(false);
  const endpoint = `${helpers.API_BASE_URL}/api/endpoints/${binPath}`;

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const copyHandler = () => {
    navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClearWithCount = () => {
    if (window.confirm(`Delete all ${requestCount} captured request${requestCount === 1 ? "" : "s"} in this bin?`)) {
      onClearAll();
    }
  };

  return (
    <header className="endpoint-navbar">
      <div className="nav-left">
        <Link to="/" className="nav-brand" title="HookPrism Home">
          <PrismLogo />
          <span className="nav-brand-title">HookPrism</span>
        </Link>
        <span className="nav-divider" aria-hidden="true">/</span>
        <span className="nav-bin-uuid mono" title={binPath}>
          {binPath.slice(0, 8)}
        </span>
        <div
          className="socket-status"
          title={isConnected ? "Real-time WebSocket connected" : "Reconnecting to server..."}
        >
          <span className={`socket-dot ${isConnected ? "is-connected" : "is-reconnecting"}`} />
          <span className="socket-label mono">{isConnected ? "Connected" : "Reconnecting"}</span>
        </div>
      </div>

      <div className="nav-center">
        <div className="endpoint-address-pill">
          <div className="pill-prefix">
            <span className="pill-name">Your endpoint</span>
            <span className="info-trigger" tabIndex="0" role="note" aria-label="Endpoint information">
              i
              <span className="info-tooltip">
                Send any HTTP request (GET, POST, etc.) to this URL and it will appear on this page instantly.
              </span>
            </span>
          </div>

          <span className="pill-url mono truncate" title={endpoint}>
            {endpoint}
          </span>

          <button
            type="button"
            className="btn btn-sm pill-copy-btn"
            onClick={copyHandler}
            title="Copy endpoint URL to clipboard"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className={`nav-right ${menuOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className={`btn btn-sm ${isChaosActive ? "btn-chaos-active" : ""}`}
          onClick={() => { setMenuOpen(false); onOpenChaos(); }}
          title="Make this endpoint answer with errors, delays or random failures"
        >
          {isChaosActive && <span className="chaos-indicator-dot" />}
          <span>Simulate failures</span>
          <span className="tech-tag">(Chaos mock)</span>
        </button>

        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => { setMenuOpen(false); handleClearWithCount(); }}
          title="Delete all captured requests in this bin"
        >
          Clear all
        </button>

        <Link to="/" className="btn btn-sm" title="Create a new webhook bin">
          New Bin
        </Link>
      </div>

      <button
        type="button"
        className="nav-mobile-toggle"
        aria-label="Toggle secondary actions"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span>&bull;&bull;&bull;</span>
      </button>
    </header>
  );
};

export default EndpointHeader;
