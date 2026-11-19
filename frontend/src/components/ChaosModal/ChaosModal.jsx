import { useState, useEffect, useRef } from "react";
import helpers from "../../services";
import "./ChaosModal.css";

const ChaosModal = ({ binPath, isOpen, onClose }) => {
  const [config, setConfig] = useState({
    enabled: false,
    statusCode: 200,
    responseBody: "OK",
    delayMs: 0,
    failureRate: 0,
    failureStatusCode: 500,
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && binPath) {
      helpers
        .getChaosConfig(binPath)
        .then((data) => {
          if (data) {
            setConfig({
              enabled: !!data.enabled,
              statusCode: data.statusCode || 200,
              responseBody: data.responseBody !== undefined ? data.responseBody : "OK",
              delayMs: data.delayMs || 0,
              failureRate: data.failureRate || 0,
              failureStatusCode: data.failureStatusCode || 500,
            });
          }
        })
        .catch(console.error);
    }
  }, [isOpen, binPath]);

  // Esc key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await helpers.updateChaosConfig(binPath, {
        ...config,
        statusCode: parseInt(config.statusCode, 10) || 200,
        delayMs: parseInt(config.delayMs, 10) || 0,
        failureRate: parseFloat(config.failureRate) || 0,
        failureStatusCode: parseInt(config.failureStatusCode, 10) || 500,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 1500);
      onClose();
    } catch (err) {
      alert("Failed to save failure simulation settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="chaos-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="chaos-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chaos-title"
      >
        <div className="chaos-modal-header">
          <div>
            <div id="chaos-title" className="chaos-modal-title">
              <span>Simulate failures</span>
              <span className="tech-tag mono">(Chaos mock)</span>
            </div>
            <div className="chaos-modal-subtitle">
              Make this endpoint misbehave so you can see how the sender reacts and retries.
            </div>
          </div>
          <button
            type="button"
            className="chaos-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} className="chaos-form">
          {/* Section 1: Always respond with */}
          <div className="chaos-section">
            <span className="chaos-section-label mono">Always respond with</span>

            <div className="form-toggle-row">
              <div>
                <div className="toggle-label">Enable failure simulation</div>
                <div className="toggle-help">Override default 200 OK responses</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  aria-label="Enable failure simulation"
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Status code</label>
                <input
                  type="number"
                  className="mono"
                  value={config.statusCode}
                  onChange={(e) => setConfig({ ...config, statusCode: e.target.value })}
                  placeholder="200"
                  min="100"
                  max="599"
                />
              </div>

              <div className="form-group">
                <label>Response delay (ms)</label>
                <input
                  type="number"
                  className="mono"
                  value={config.delayMs}
                  onChange={(e) => setConfig({ ...config, delayMs: e.target.value })}
                  placeholder="e.g. 500"
                  min="0"
                  max="10000"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Response body</label>
              <textarea
                className="mono chaos-textarea"
                rows={2}
                value={config.responseBody}
                onChange={(e) => setConfig({ ...config, responseBody: e.target.value })}
                placeholder='e.g. {"error": "Rate limit exceeded"}'
              />
            </div>
          </div>

          {/* Section 2: Sometimes fail */}
          <div className="chaos-section">
            <span className="chaos-section-label mono">Sometimes fail</span>

            <div className="form-grid">
              <div className="form-group">
                <label>Random failure rate (%)</label>
                <input
                  type="number"
                  className="mono"
                  value={config.failureRate}
                  onChange={(e) => setConfig({ ...config, failureRate: e.target.value })}
                  placeholder="0 - 100"
                  min="0"
                  max="100"
                  step="5"
                />
              </div>

              <div className="form-group">
                <label>Failure status code</label>
                <input
                  type="number"
                  className="mono"
                  value={config.failureStatusCode}
                  onChange={(e) => setConfig({ ...config, failureStatusCode: e.target.value })}
                  placeholder="500"
                  min="400"
                  max="599"
                />
              </div>
            </div>
          </div>

          {/* Live Summary */}
          <div className="chaos-live-summary mono">
            {config.enabled ? (
              <span>
                Responds {config.statusCode || 200} after {config.delayMs || 0}ms.{" "}
                {Number(config.failureRate) > 0
                  ? `${config.failureRate}% of requests return ${config.failureStatusCode || 500}.`
                  : "Random failure disabled."}
              </span>
            ) : (
              <span>Failure simulation is currently off. Endpoint returns 200 OK.</span>
            )}
          </div>

          <div className="chaos-modal-footer">
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Saving..." : savedSuccess ? "Saved" : "Save settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChaosModal;
