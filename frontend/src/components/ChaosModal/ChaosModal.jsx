import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (isOpen && binPath) {
      helpers.getChaosConfig(binPath).then((data) => {
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
      }).catch(console.error);
    }
  }, [isOpen, binPath]);

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
      setTimeout(() => setSavedSuccess(false), 2000);
      onClose();
    } catch (err) {
      alert("Failed to save chaos config: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="chaos-backdrop" onClick={onClose}>
      <div className="chaos-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chaos-modal-header">
          <div>
            <div className="chaos-modal-title">Chaos Mock Responses</div>
            <div className="chaos-modal-subtitle">
              Configure what the capture endpoint returns to incoming webhooks
            </div>
          </div>
          <button className="btn btn-sm" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSave} className="chaos-form">
          <div className="form-toggle-row">
            <div>
              <div className="toggle-label">Enable Chaos Mocking</div>
              <div className="toggle-help">Override default 200 OK responses</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Normal Status Code</label>
              <input
                type="number"
                className="mono"
                value={config.statusCode}
                onChange={(e) => setConfig({ ...config, statusCode: e.target.value })}
                placeholder="200"
              />
            </div>

            <div className="form-group">
              <label>Artificial Latency (ms)</label>
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

            <div className="form-group">
              <label>Random Failure Rate (%)</label>
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
              <label>Failure Status Code</label>
              <input
                type="number"
                className="mono"
                value={config.failureStatusCode}
                onChange={(e) => setConfig({ ...config, failureStatusCode: e.target.value })}
                placeholder="500"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Response Body</label>
            <textarea
              className="mono chaos-textarea"
              rows={3}
              value={config.responseBody}
              onChange={(e) => setConfig({ ...config, responseBody: e.target.value })}
              placeholder='e.g. {"status":"received"}'
            />
          </div>

          <div className="chaos-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : savedSuccess ? "Saved!" : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChaosModal;
