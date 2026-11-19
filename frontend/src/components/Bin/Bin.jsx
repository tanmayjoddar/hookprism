import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import socket from "../../socket";
import helpers from "../../services";
import EndpointHeader from "../EndpointHeader/EndpointHeader";
import RequestList from "../RequestList/RequestList";
import RequestDetails from "../RequestDetails/RequestDetails";
import ChaosModal from "../ChaosModal/ChaosModal";
import "./Bin.css";

const Bin = () => {
  const { bin_path } = useParams();
  const [requestList, setRequestList] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRequestID, setSelectedRequestID] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const [chaosActive, setChaosActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [simulatingType, setSimulatingType] = useState(null);

  // Load initial requests and chaos config
  useEffect(() => {
    socket.emit("joinBinRoom", bin_path);

    const loadData = async () => {
      setLoading(true);
      try {
        const [list, chaos] = await Promise.all([
          helpers.getRequestList(bin_path),
          helpers.getChaosConfig(bin_path).catch(() => null),
        ]);

        const converted = (list || []).map((request) => ({
          ...request,
          received_at: helpers.convertDbTimetoDateObj(request.received_at),
        }));
        setRequestList(converted);

        if (chaos && chaos.enabled) {
          setChaosActive(true);
        }

        // Auto-select first request if available
        if (converted.length > 0) {
          const full = await helpers.getRequest(converted[0].id);
          full.date = converted[0].received_at;
          setSelectedRequest(full);
          setSelectedRequestID(converted[0].id);
        }
      } catch (err) {
        console.error("Error loading bin data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Socket Event Handlers
    const handleNewRequest = (newRequest) => {
      const newRequestMod = {
        ...newRequest,
        received_at: helpers.convertDbTimetoDateObj(newRequest.received_at),
      };

      setRequestList((prev) => [newRequestMod, ...prev]);

      // If nothing was selected, select the new one
      setSelectedRequestID((prevId) => {
        if (!prevId) {
          helpers.getRequest(newRequest.id).then((full) => {
            full.date = newRequestMod.received_at;
            setSelectedRequest(full);
          });
          return newRequest.id;
        }
        return prevId;
      });
    };

    const handleRequestDeleted = (requestId) => {
      setRequestList((prev) => prev.filter((r) => String(r.id) !== String(requestId)));
      setSelectedRequestID((prevId) => {
        if (String(prevId) === String(requestId)) {
          setSelectedRequest(null);
          return null;
        }
        return prevId;
      });
    };

    const handleAllRequestsDeleted = () => {
      setRequestList([]);
      setSelectedRequest(null);
      setSelectedRequestID(null);
    };

    socket.on("newRequest", handleNewRequest);
    socket.on("requestDeleted", handleRequestDeleted);
    socket.on("allRequestsDeleted", handleAllRequestsDeleted);

    return () => {
      socket.off("newRequest", handleNewRequest);
      socket.off("requestDeleted", handleRequestDeleted);
      socket.off("allRequestsDeleted", handleAllRequestsDeleted);
      socket.emit("leaveBinRoom", bin_path);
    };
  }, [bin_path]);

  const handleDeleteRequest = async (requestId) => {
    try {
      await helpers.deleteRequest(bin_path, requestId);
      setRequestList((prev) => prev.filter((r) => r.id !== requestId));
      if (selectedRequestID === requestId) {
        setSelectedRequest(null);
        setSelectedRequestID(null);
      }
    } catch (err) {
      alert("Failed to delete request: " + err.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Delete all captured requests in this bin?")) return;
    try {
      await helpers.deleteAllRequests(bin_path);
      setRequestList([]);
      setSelectedRequest(null);
      setSelectedRequestID(null);
    } catch (err) {
      alert("Failed to clear requests: " + err.message);
    }
  };

  const filteredRequests = useMemo(() => {
    const list = requestList.filter((r) => {
      const path = helpers.removeBinFromPath(r.http_path || "").toLowerCase();
      const method = (r.http_method || "").toLowerCase();
      const term = searchTerm.toLowerCase();
      return path.includes(term) || method.includes(term);
    });
    return helpers.groupRequestsByDate(list);
  }, [requestList, searchTerm]);

  const endpointUrl = `${helpers.API_BASE_URL}/api/endpoints/${bin_path}`;
  const browserTestUrl = `${endpointUrl}/order/42?customer=Sarah+Chen&plan=enterprise&status=active`;

  const readyCurlCmd = `curl -X POST "${endpointUrl}/sample" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"order.created","amount":129.99,"customer":{"id":"cus_42","email":"alex@example.com"}}'`;

  const copySampleCurl = () => {
    navigator.clipboard.writeText(readyCurlCmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const triggerSimulation = async (type) => {
    setSimulatingType(type);
    try {
      await helpers.sendSampleWebhook(bin_path, type);
    } catch (err) {
      console.error("Simulation failed:", err);
      alert("Simulation failed: " + (err.response?.data?.error || err.message));
    } finally {
      setTimeout(() => setSimulatingType(null), 600);
    }
  };

  return (
    <div className="bin-workspace">
      <EndpointHeader
        binPath={bin_path}
        onOpenChaos={() => setIsChaosOpen(true)}
        onClearAll={handleClearAll}
        isChaosActive={chaosActive}
      />

      <div className="bin-layout">
        <RequestList
          requests={filteredRequests}
          setSelectedRequest={setSelectedRequest}
          setSelectedRequestID={setSelectedRequestID}
          selectedRequestID={selectedRequestID}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          binPath={bin_path}
          onDeleteRequest={handleDeleteRequest}
        />

        <main className="bin-main-content">
          {loading ? (
            <div className="empty-state-card">
              <div className="spinner" />
              <div className="empty-title">Connecting to live inspection stream...</div>
            </div>
          ) : !selectedRequest ? (
            <div className="empty-state-playground">
              {/* Status Header */}
              <div className="empty-hero-badge">
                <span className="live-pulse" />
                <span>Live Webhook Ingestion Active</span>
              </div>
              <h2 className="empty-hero-title">Awaiting Webhook Payloads</h2>
              <p className="empty-hero-desc">
                HookPrism captures, validates cryptographic signatures, replays with SSRF safety,
                and compares responses side-by-side. Choose how you want to test this bin:
              </p>

              {/* 1-Click Interactive Simulation Cards */}
              <div className="simulation-section">
                <div className="simulation-header">
                  <span className="sim-title">Method 1: Instant 1-Click Simulations</span>
                  <span className="sim-tag">Zero-tooling verification</span>
                </div>
                <div className="simulation-cards-grid">
                  <button
                    type="button"
                    className="sim-card"
                    onClick={() => triggerSimulation("order")}
                    disabled={!!simulatingType}
                  >
                    <div className="sim-card-top">
                      <span className="badge-method badge-post">POST</span>
                      <span className="sim-card-title">Order Created</span>
                    </div>
                    <p className="sim-card-desc">Simulate an ecommerce payment with JSON payload &amp; headers.</p>
                    <div className="sim-card-action">
                      {simulatingType === "order" ? "Sending..." : "⚡ Send Order Event"}
                    </div>
                  </button>

                  <button
                    type="button"
                    className="sim-card"
                    onClick={() => triggerSimulation("stripe")}
                    disabled={!!simulatingType}
                  >
                    <div className="sim-card-top">
                      <span className="badge-method badge-post">POST</span>
                      <span className="sim-card-title">Stripe Checkout</span>
                    </div>
                    <p className="sim-card-desc">Simulate Stripe webhook with HMAC signature header.</p>
                    <div className="sim-card-action">
                      {simulatingType === "stripe" ? "Sending..." : "⚡ Simulate Stripe Event"}
                    </div>
                  </button>

                  <button
                    type="button"
                    className="sim-card"
                    onClick={() => triggerSimulation("github")}
                    disabled={!!simulatingType}
                  >
                    <div className="sim-card-top">
                      <span className="badge-method badge-post">POST</span>
                      <span className="sim-card-title">GitHub Push</span>
                    </div>
                    <p className="sim-card-desc">Simulate GitHub commit push with X-Hub-Signature-256.</p>
                    <div className="sim-card-action">
                      {simulatingType === "github" ? "Sending..." : "⚡ Simulate GitHub Push"}
                    </div>
                  </button>
                </div>
              </div>

              {/* Browser Address Bar & cURL Methods */}
              <div className="methods-split-grid">
                {/* Method 2: Browser Address Bar */}
                <div className="method-card">
                  <div className="method-card-header">
                    <span className="method-card-num">Method 2</span>
                    <span className="method-card-heading">Test Directly from Browser</span>
                  </div>
                  <p className="method-card-p">
                    HookPrism accepts all HTTP methods (GET, POST, etc.). Open a live request in a new tab;
                    watch it appear here via WebSockets in real time:
                  </p>
                  <div className="browser-test-action">
                    <a
                      href={browserTestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                    >
                      ↗ Open Test URL in New Tab
                    </a>
                  </div>
                  <div className="method-url-preview mono truncate" title={browserTestUrl}>
                    {browserTestUrl}
                  </div>
                </div>

                {/* Method 3: cURL / Postman / CLI */}
                <div className="method-card">
                  <div className="method-card-header">
                    <span className="method-card-num">Method 3</span>
                    <span className="method-card-heading">cURL &amp; Webhook Senders</span>
                  </div>
                  <p className="method-card-p">
                    Send from your terminal or point Stripe CLI, GitHub Webhooks, or Twilio to this URL:
                  </p>
                  <div className="sample-curl-box">
                    <div className="sample-curl-header">
                      <span className="mono">Ready-to-use cURL:</span>
                      <button className="btn btn-sm" onClick={copySampleCurl}>
                        {copiedCurl ? "Copied!" : "Copy cURL"}
                      </button>
                    </div>
                    <pre className="mono sample-curl-code">{readyCurlCmd}</pre>
                  </div>
                </div>
              </div>

              {/* Feature Verification Callout */}
              <div className="features-badge-bar">
                <div className="feat-pill" title="Pre-flight DNS validation prevents private network traversal">
                  <span className="feat-icon">🛡️</span>
                  <span>SSRF Safe Replay</span>
                </div>
                <div className="feat-pill" title="Simultaneous dispatch to Staging &amp; Prod with diff comparison">
                  <span className="feat-icon">⚖️</span>
                  <span>Dual Target Diffing</span>
                </div>
                <div className="feat-pill" title="Configurable status codes, latency, and random error rates">
                  <span className="feat-icon">🧪</span>
                  <span>Chaos Mock Engine</span>
                </div>
                <div className="feat-pill" title="Timing-safe cryptographic verification for Stripe and GitHub">
                  <span className="feat-icon">🔐</span>
                  <span>HMAC Verification</span>
                </div>
              </div>
            </div>
          ) : (
            <RequestDetails
              request={selectedRequest}
              onDelete={handleDeleteRequest}
            />
          )}
        </main>
      </div>

      <ChaosModal
        binPath={bin_path}
        isOpen={isChaosOpen}
        onClose={() => {
          setIsChaosOpen(false);
          helpers.getChaosConfig(bin_path).then((c) => setChaosActive(!!c?.enabled));
        }}
      />
    </div>
  );
};

export default Bin;
