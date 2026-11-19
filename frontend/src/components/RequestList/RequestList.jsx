import helpers from "../../services";
import "./RequestList.css";

const RequestList = ({
  requests,
  setSelectedRequest,
  setSelectedRequestID,
  selectedRequestID,
  searchTerm,
  setSearchTerm,
  binPath,
  onDeleteRequest,
}) => {
  // Flatten or use grouped requests
  const allRequests = requests.reduce((acc, g) => [...acc, ...g.requests], []);

  const handleSelect = async (req) => {
    setSelectedRequestID(req.id);
    try {
      const full = await helpers.getRequest(req.id);
      full.date = req.received_at;
      setSelectedRequest(full);
    } catch {
      setSelectedRequest(null);
    }
  };

  const handleDelete = (e, reqId) => {
    e.stopPropagation();
    if (onDeleteRequest) {
      onDeleteRequest(reqId);
    } else {
      helpers.deleteRequest(binPath, reqId);
    }
  };

  return (
    <aside className="request-sidebar">
      <div className="sidebar-search-box">
        <input
          type="search"
          className="sidebar-search-input mono"
          placeholder="Filter requests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="count-pill mono">{allRequests.length}</span>
      </div>

      <div className="sidebar-list-container">
        {allRequests.length === 0 ? (
          <div className="empty-sidebar-msg">
            {searchTerm ? "No matching requests" : "No requests received yet"}
          </div>
        ) : (
          allRequests.map((req) => {
            const isSelected = selectedRequestID === req.id;
            const method = (req.http_method || "POST").toUpperCase();
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

            const displayPath = helpers.removeBinFromPath(req.http_path) || "/";

            return (
              <div
                key={req.id}
                className={`sidebar-item ${isSelected ? "sidebar-item-active" : ""}`}
                onClick={() => handleSelect(req)}
              >
                <div className="item-left">
                  <span className={`badge-method ${methodClass}`}>{method}</span>
                  <span className="item-path mono truncate" title={displayPath}>
                    {displayPath}
                  </span>
                </div>

                <div className="item-right">
                  <span className="item-time mono">
                    {helpers.formatRelativeTime(req.received_at)}
                  </span>
                  <button
                    className="item-delete-btn"
                    onClick={(e) => handleDelete(e, req.id)}
                    title="Delete request"
                  >
                    &times;
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default RequestList;
