import { useState } from "react";
import "./Headers.css";

const Headers = ({ obj }) => {
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);

  const entries = Object.entries(obj || {});
  const filtered = entries.filter(([k, v]) =>
    k.toLowerCase().includes(filter.toLowerCase()) ||
    String(v).toLowerCase().includes(filter.toLowerCase())
  );

  const copyAll = () => {
    const text = entries.map(([k, v]) => `${k}: ${v}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySingle = (k, v) => {
    navigator.clipboard.writeText(`${k}: ${v}`);
  };

  return (
    <div className="headers-panel">
      <div className="headers-toolbar">
        <input
          type="text"
          className="headers-search-input mono"
          placeholder="Filter headers by key or value..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className="btn btn-sm" onClick={copyAll}>
          {copied ? "Copied!" : "Copy All Headers"}
        </button>
      </div>

      <div className="headers-table-box">
        <div className="headers-table-head mono">
          <span className="hhead-key">Header Key</span>
          <span className="hhead-val">Value</span>
        </div>
        <div className="headers-table-body">
          {filtered.length === 0 ? (
            <div className="headers-empty mono">No headers matching filter</div>
          ) : (
            filtered.map(([k, v]) => (
              <div
                key={k}
                className="headers-row mono"
                onClick={() => copySingle(k, v)}
                title="Click to copy this header"
              >
                <span className="hkey-cell">{k}</span>
                <span className="hval-cell truncate">{String(v)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Headers;
