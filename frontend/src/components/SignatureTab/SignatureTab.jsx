import { useState, useEffect } from "react";
import helpers from "../../services";
import "./SignatureTab.css";

const SignatureTab = ({ request }) => {
  const [secret, setSecret] = useState("");
  const [type, setType] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Check which signature headers exist on current request
  const headers = request?.payload?.headers || {};
  const hasGitHub = !!(headers["x-hub-signature-256"] || headers["X-Hub-Signature-256"]);
  const hasStripe = !!(headers["stripe-signature"] || headers["Stripe-Signature"]);

  useEffect(() => {
    setResult(null);
    setError(null);
    if (hasGitHub && !hasStripe) setType("github");
    else if (hasStripe && !hasGitHub) setType("stripe");
    else setType("auto");
  }, [request?.id]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!secret.trim()) {
      setError("Please enter the signing secret");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await helpers.verifySignature(request.id, {
        secret: secret.trim(),
        type: type === "auto" ? undefined : type,
      });
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sig-tab-container">
      <div className="sig-header-box">
        <div className="sig-detected-tags">
          <span className="sig-detect-label">Detected Webhook Signatures:</span>
          {hasGitHub && <span className="sig-tag sig-tag-gh mono">x-hub-signature-256</span>}
          {hasStripe && <span className="sig-tag sig-tag-stripe mono">stripe-signature</span>}
          {!hasGitHub && !hasStripe && (
            <span className="sig-tag-none mono">No signature headers found</span>
          )}
        </div>
      </div>

      <form onSubmit={handleVerify} className="sig-form-card">
        <div className="sig-inputs-row">
          <div className="sig-type-select-box">
            <select
              className="sig-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="auto">Auto-detect Header</option>
              <option value="github">GitHub (X-Hub-Signature-256)</option>
              <option value="stripe">Stripe (stripe-signature)</option>
            </select>
          </div>

          <input
            type="password"
            className="sig-secret-input mono"
            placeholder="Enter signing secret (e.g. whsec_... or secret token)"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Verifying..." : "Verify Signature"}
          </button>
        </div>

        {error && <div className="sig-error-banner">{error}</div>}
      </form>

      {result && (
        <div className="sig-result-card">
          <div className="sig-result-badge-row">
            <div className="sig-status-group">
              <span
                className={`sig-badge ${
                  result.valid ? "sig-badge-valid" : "sig-badge-invalid"
                }`}
              >
                {result.valid ? "SIGNATURE VALID &bull; PASSED" : "SIGNATURE INVALID &bull; FAILED"}
              </span>
              <span className="sig-algo mono">{result.algorithm || "HMAC-SHA256"}</span>
            </div>
          </div>

          {result.error && <div className="sig-reason-box">{result.error}</div>}

          <div className="sig-details-grid">
            <div className="sig-detail-item">
              <div className="detail-label">Header Used</div>
              <div className="detail-val mono">{result.headerName || "(none)"}</div>
            </div>

            {result.receivedSignature && (
              <div className="sig-detail-item">
                <div className="detail-label">Received Signature</div>
                <div className="detail-val mono code-break">{result.receivedSignature}</div>
              </div>
            )}

            {result.computedSignature && (
              <div className="sig-detail-item">
                <div className="detail-label">Computed Signature</div>
                <div className="detail-val mono code-break">{result.computedSignature}</div>
              </div>
            )}

            {result.timestamp !== undefined && (
              <div className="sig-detail-item">
                <div className="detail-label">Timestamp Drift</div>
                <div className="detail-val mono">
                  {result.driftSeconds}s {result.withinTolerance ? "(within tolerance)" : "(stale / expired)"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureTab;
