import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://hookprism.onrender.com";

const BINS_URL = `${API_BASE_URL}/api/bins`;
const REQUESTS_URL = `${API_BASE_URL}/api/requests`;

async function createBin() {
  const result = await axios.post(BINS_URL);
  return result.data[0].bin_path;
}

async function getRequestList(binPath) {
  const result = await axios.get(`${BINS_URL}/${binPath}/requests`);
  return result.data;
}

async function getRequest(requestId) {
  const result = await axios.get(`${BINS_URL}/requests/${requestId}`);
  return result.data;
}

async function deleteRequest(binPath, requestId) {
  const result = await axios.delete(`${BINS_URL}/${binPath}/requests/${requestId}`);
  return result.status;
}

async function deleteAllRequests(binPath) {
  const result = await axios.delete(`${BINS_URL}/${binPath}/requests`);
  return result.status;
}

async function getChaosConfig(binPath) {
  const result = await axios.get(`${BINS_URL}/${binPath}/chaos`);
  return result.data;
}

async function updateChaosConfig(binPath, chaosConfig) {
  const result = await axios.put(`${BINS_URL}/${binPath}/chaos`, chaosConfig);
  return result.data;
}

async function sendReplay(requestId, payload) {
  const result = await axios.post(`${REQUESTS_URL}/${requestId}/replay`, payload);
  return result.data;
}

async function getReplays(requestId) {
  const result = await axios.get(`${REQUESTS_URL}/${requestId}/replays`);
  return result.data;
}

async function sendDualReplay(requestId, payload) {
  const result = await axios.post(`${REQUESTS_URL}/${requestId}/dual-replay`, payload);
  return result.data;
}

async function verifySignature(requestId, payload) {
  const result = await axios.post(`${REQUESTS_URL}/${requestId}/verify-signature`, payload);
  return result.data;
}

function removeBinFromPath(path) {
  if (!path) return "/";
  const relevantPathArray = path.split("/");
  // format: /api/endpoints/:bin_path/subpath
  if (relevantPathArray.length >= 4) {
    const sub = "/" + relevantPathArray.slice(4).join("/");
    return sub === "/" ? "/" : sub;
  }
  return path;
}

function convertDbTimetoDateObj(databaseTime) {
  if (!databaseTime) return new Date();
  if (databaseTime instanceof Date) return databaseTime;
  return new Date(databaseTime);
}

function formatRelativeTime(date) {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function groupRequestsByDate(requestsList) {
  if (!requestsList || requestsList.length === 0) return [];
  const groupedRequests = [];
  let currentGroup = {
    dateReceived: new Date(requestsList[0].received_at).toLocaleDateString(),
    requests: [],
  };

  for (let i = 0; i < requestsList.length; i++) {
    const dStr = new Date(requestsList[i].received_at).toLocaleDateString();
    if (dStr !== currentGroup.dateReceived) {
      groupedRequests.push(currentGroup);
      currentGroup = {
        dateReceived: dStr,
        requests: [],
      };
    }
    currentGroup.requests.push(requestsList[i]);
  }

  groupedRequests.push(currentGroup);
  return groupedRequests;
}

async function sendSampleWebhook(binPath, type = "order") {
  const urlBase = `${API_BASE_URL}/api/endpoints/${binPath}`;
  if (type === "stripe") {
    const payload = {
      id: "evt_1P8x9" + Math.floor(1000 + Math.random() * 9000),
      object: "event",
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: "cs_live_" + Math.floor(100000 + Math.random() * 900000),
          amount_total: 24900,
          currency: "usd",
          customer_email: "alex.dev@linear.app",
          payment_status: "paid",
        },
      },
    };
    return axios.post(`${urlBase}/webhooks/stripe`, payload, {
      headers: {
        "Content-Type": "application/json",
        "stripe-signature":
          "t=1700000000,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd",
      },
    });
  }

  if (type === "github") {
    const payload = {
      ref: "refs/heads/main",
      repository: {
        name: "hookprism-core",
        full_name: "tanmay/hookprism-core",
        private: false,
      },
      pusher: { name: "tanmayjoddar", email: "tanmay@hookprism.io" },
      head_commit: {
        id: "9f82d1c",
        message: "feat(engine): add zero-latency dual target diffing",
        timestamp: new Date().toISOString(),
      },
    };
    return axios.post(`${urlBase}/webhooks/github`, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256":
          "sha256=d5794d51ec517bd503b47429fa4ea1a86dc6158bb04204c57b131b17800f195e",
        "X-GitHub-Event": "push",
      },
    });
  }

  // Default: order.created
  const payload = {
    event: "order.created",
    timestamp: new Date().toISOString(),
    order_id: "ord_" + Math.floor(100000 + Math.random() * 900000),
    amount: 149.99,
    currency: "usd",
    customer: {
      id: "cus_92819",
      name: "Sarah Chen",
      email: "sarah.chen@acmecorp.io",
    },
    line_items: [{ sku: "PRO-ANNUAL-TIER", qty: 1, price: 149.99 }],
  };
  return axios.post(`${urlBase}/orders`, payload, {
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  API_BASE_URL,
  createBin,
  getRequestList,
  getRequest,
  deleteRequest,
  deleteAllRequests,
  getChaosConfig,
  updateChaosConfig,
  sendReplay,
  getReplays,
  sendDualReplay,
  verifySignature,
  sendSampleWebhook,
  removeBinFromPath,
  convertDbTimetoDateObj,
  formatRelativeTime,
  groupRequestsByDate,
};
