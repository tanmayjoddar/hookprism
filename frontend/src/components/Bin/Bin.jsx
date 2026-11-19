import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { socket } from "../../socket";
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
  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const [chaosActive, setChaosActive] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const readyCurlCmd = `curl -X POST "${helpers.API_BASE_URL}/api/endpoints/${bin_path}/sample" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"order.created","amount":99.99,"customer":{"id":"cus_42","email":"alex@example.com"}}'`;

  const copySampleCurl = () => {
    navigator.clipboard.writeText(readyCurlCmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
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
              <div className="empty-title">Loading webhook captures...</div>
            </div>
          ) : !selectedRequest ? (
            <div className="empty-state-card">
              <div className="empty-indicator">
                <span className="live-pulse" /> Listening for HTTP requests
              </div>
              <h2 className="empty-heading">No requests selected</h2>
              <p className="empty-subtext">
                Send an HTTP request to this bin’s endpoint URL to inspect its headers, payload,
                signatures, and test replay.
              </p>

              <div className="sample-curl-box">
                <div className="sample-curl-header">
                  <span className="mono">Ready-to-use cURL example:</span>
                  <button className="btn btn-sm" onClick={copySampleCurl}>
                    {copiedCurl ? "Copied cURL!" : "Copy cURL"}
                  </button>
                </div>
                <pre className="mono sample-curl-code">{readyCurlCmd}</pre>
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
