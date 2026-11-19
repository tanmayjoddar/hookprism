import { useState } from "react";
import { Link } from "react-router-dom";
import helpers from "../../services";
import "./EndpointHeader.css";

const EndpointHeader = ({ binPath, onOpenChaos, onClearAll, isChaosActive }) => {
  const [copied, setCopied] = useState(false);
  const endpoint = `${helpers.API_BASE_URL}/api/endpoints/${binPath}`;

  const copyHandler = () => {
    navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="endpoint-navbar">
      <div className="nav-left">
        <Link to="/" className="nav-brand">
          <div className="nav-brand-dot" />
          <span className="nav-brand-title">HOOKPRISM</span>
        </Link>
        <span className="nav-divider">/</span>
        <span className="nav-bin-uuid mono">{binPath}</span>
      </div>

      <div className="nav-center">
        <div className="endpoint-copy-pill" onClick={copyHandler} title="Click to copy endpoint URL">
          <span className="pill-label mono">POST</span>
          <span className="pill-url mono truncate">{endpoint}</span>
          <button type="button" className="pill-copy-btn">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="nav-right">
        <button
          type="button"
          className={`btn btn-sm ${isChaosActive ? "btn-chaos-active" : ""}`}
          onClick={onOpenChaos}
        >
          {isChaosActive && <span className="chaos-pulse" />}
          Chaos Mock
        </button>

        <button type="button" className="btn btn-sm btn-danger" onClick={onClearAll}>
          Clear All
        </button>

        <Link to="/" className="btn btn-sm">
          New Bin
        </Link>
      </div>
    </header>
  );
};

export default EndpointHeader;
