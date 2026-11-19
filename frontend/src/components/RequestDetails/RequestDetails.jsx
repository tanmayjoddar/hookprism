import { useState } from "react";
import Headers from "../Headers/Headers";
import Body from "../Body/Body";
import ReplayTab from "../ReplayTab/ReplayTab";
import DiffTab from "../DiffTab/DiffTab";
import SignatureTab from "../SignatureTab/SignatureTab";
import helpers from "../../services";
import "./RequestDetails.css";

function generateCurlCommand(request) {
  const method = request.payload?.method || "POST";
  const url = `${helpers.API_BASE_URL}${request.payload?.path || ""}`;
  let cmd = `curl -X ${method} "${url}"`;

  const headers = request.payload?.headers || {};
  for (const [key, val] of Object.entries(headers)) {
    if (["host", "content-length", "connection"].includes(key.toLowerCase())) continue;
    cmd += ` \\\n  -H "${key}: ${val}"`;
  }

  const rawBody =
    typeof request.payload?.body === "string"
      ? request.payload.body
      : request.payload?.raw_body ||
        (request.payload?.body ? JSON.stringify(request.payload.body) : "");

  if (rawBody && !["GET", "HEAD"].includes(method.toUpperCase())) {
    const escaped = rawBody.replace(/"/g, '\\"');
    cmd += ` \\\n  --data "${escaped}"`;
  }

  return cmd;
}

const RequestDetails = ({ request, onDelete }) => {
  const [activeTab, setActiveTab] = useState("body");
  const [copiedCurl, setCopiedCurl] = useState(false);

  const method = (request.payload?.method || "POST").toUpperCase();
  const methodClass =
    method === "POST"
      ? "badge-post"
      : method === "GET"
      ? "badge-get"
      : method === "PUT"
      ? "badge-put"
      : method === "DELETE"
      ? "badge-delete"
      : "badge-patch";

  const handleCopyCurl = () => {
    const cmd = generateCurlCommand(request);
    navigator.clipboard.writeText(cmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 1500);
  };

  return (
    <div className="request-details-panel">
      {/* Top Details Bar */}
      <div className="request-header-bar">
        <div className="req-header-left">
          <span className={`badge-method ${methodClass}`}>{method}</span>
          <span className="req-path mono truncate" title={request.payload?.path}>
            {request.payload?.path}
          </span>
          {request.payload?.ip && (
            <span className="req-ip-tag mono" title="Client IP address">
              {request.payload.ip}
            </span>
          )}
          <span className="req-time-tag mono">
            {helpers.formatRelativeTime(request.date || request.received_at)}
          </span>
        </div>

        <div className="req-header-right">
          <button type="button" className="btn btn-sm" onClick={handleCopyCurl}>
            {copiedCurl ? "Copied" : "Copy as cURL"}
          </button>
          {onDelete && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => onDelete(request.id)}
              title="Delete this request"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Tabs navigation: Plain English first, tech tag in tooltip */}
      <div className="request-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "body"}
          className={`tab-btn ${activeTab === "body" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("body")}
          title="Payload body viewer"
        >
          Body
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "headers"}
          className={`tab-btn ${activeTab === "headers" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("headers")}
          title="HTTP Headers"
        >
          Headers ({Object.keys(request.payload?.headers || {}).length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "replay"}
          className={`tab-btn ${activeTab === "replay" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("replay")}
          title="Replay — resend to any URL"
        >
          <span>Resend</span>
          <span className="tab-tech-tag mono">Replay</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "diff"}
          className={`tab-btn ${activeTab === "diff" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("diff")}
          title="Dual-target diff — compare two servers"
        >
          <span>Compare</span>
          <span className="tab-tech-tag mono">Diff</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "signature"}
          className={`tab-btn ${activeTab === "signature" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("signature")}
          title="HMAC-SHA256 — verify webhook signature"
        >
          <span>Verify</span>
          <span className="tab-tech-tag mono">HMAC</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="request-tab-body">
        {activeTab === "body" && <Body body={request.payload?.body} />}
        {activeTab === "headers" && <Headers obj={request.payload?.headers} />}
        {activeTab === "replay" && <ReplayTab request={request} />}
        {activeTab === "diff" && <DiffTab request={request} />}
        {activeTab === "signature" && <SignatureTab request={request} />}
      </div>
    </div>
  );
};

export default RequestDetails;
