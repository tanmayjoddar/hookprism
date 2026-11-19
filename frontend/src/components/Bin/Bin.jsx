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
  const [copiedBrowserUrl, setCopiedBrowserUrl] = useState(false);
  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const [chaosActive, setChaosActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [simulatingType, setSimulatingType] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

    const handleNewRequest = (newRequest) => {
      const newRequestMod = {
        ...newRequest,
        received_at: helpers.convertDbTimetoDateObj(newRequest.received_at),
      };

      setRequestList((prev) => [newRequestMod, ...prev]);

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
    setTimeout(() => setCopiedCurl(false), 1500);
  };

  const copyBrowserUrl = () => {
    navigator.clipboard.writeText(browserTestUrl);
    setCopiedBrowserUrl(true);
    setTimeout(() => setCopiedBrowserUrl(false), 1500);
  };

  const triggerSimulation = async (type) => {
    setSimulatingType(type);
    try {
      await helpers.sendSampleWebhook(bin_path, type);
    } catch (err) {
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
        requestCount={requestList.length}
      />

      {/* Mobile drawer toggle */}
      <div className="bin-mobile-subbar">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        >
          <span>Requests ({requestList.length})</span>
        </button>
      </div>

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
          isOpenOnMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="bin-main-content">
          {loading ? (
            <div className="bin-loading-view">
              <div className="skeleton bin-skeleton-bar" style={{ width: "240px", height: "24px" }} />
              <div className="skeleton bin-skeleton-bar" style={{ width: "420px", height: "14px" }} />
              <div className="bin-skeleton-cards">
                <div className="skeleton bin-skeleton-card" />
                <div className="skeleton bin-skeleton-card" />
                <div className="skeleton bin-skeleton-card" />
              </div>
            </div>
          ) : !selectedRequest ? (
            <div className="bin-empty-playground">
              <div className="empty-header-block">
                <h2 className="empty-main-heading">Waiting for your first request</h2>
                <p className="empty-main-subtext">
                  Pick any one of these three ways. The request will show up in the left list
                  instantly.
                </p>
              </div>

              {/* 3 Equal-Height Cards */}
              <div className="empty-cards-grid">
                {/* Card 01 */}
                <div className="empty-card">
                  <div className="empty-card-top">
                    <span className="empty-card-num mono">01</span>
                    <h3 className="empty-card-title">Send a sample</h3>
                    <p className="empty-card-desc">
                      Fire a realistic webhook payload directly from this page.
                    </p>
                  </div>

                  <div className="empty-card-cta">
                    <div className="sample-buttons-row">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => triggerSimulation("order")}
                        disabled={!!simulatingType}
                      >
                        {simulatingType === "order" ? "Sending..." : "Order"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => triggerSimulation("stripe")}
                        disabled={!!simulatingType}
                      >
                        {simulatingType === "stripe" ? "Sending..." : "Stripe"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => triggerSimulation("github")}
                        disabled={!!simulatingType}
                      >
                        {simulatingType === "github" ? "Sending..." : "GitHub"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 02 (FEATURED: Solid Accent) */}
                <div className="empty-card empty-card-featured">
                  <div className="empty-card-top">
                    <div className="featured-card-badge-row">
                      <span className="empty-card-num mono">02</span>
                      <span className="featured-pill mono">RECOMMENDED</span>
                    </div>
                    <h3 className="empty-card-title">Open in browser</h3>
                    <p className="empty-card-desc">
                      Open a test URL in a new tab. Your browser sends a request to the endpoint.
                    </p>
                  </div>

                  <div className="empty-card-cta">
                    <a
                      href={browserTestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-featured-cta"
                    >
                      Open test URL in new tab
                    </a>

                    <div className="browser-url-box">
                      <span className="browser-url-text mono truncate" title={browserTestUrl}>
                        {browserTestUrl}
                      </span>
                      <button
                        type="button"
                        className="btn-featured-copy mono"
                        onClick={copyBrowserUrl}
                      >
                        {copiedBrowserUrl ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 03 */}
                <div className="empty-card">
                  <div className="empty-card-top">
                    <span className="empty-card-num mono">03</span>
                    <h3 className="empty-card-title">Use the terminal</h3>
                    <p className="empty-card-desc">
                      Copy a ready-to-run cURL command and paste it into your terminal.
                    </p>
                  </div>

                  <div className="empty-card-cta">
                    <div className="empty-curl-block">
                      <button
                        type="button"
                        className="curl-copy-btn btn btn-sm mono"
                        onClick={copySampleCurl}
                      >
                        {copiedCurl ? "Copied" : "Copy"}
                      </button>
                      <pre className="mono empty-curl-code">{readyCurlCmd}</pre>
                    </div>
                  </div>
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
