// Backward compatibility layer - delegating to PostgreSQL / in-memory
const postgres = require('./postgres_utils');

async function deleteRequest(mongoId) {
  return true;
}

async function createRequest(payload) {
  return { id: String(Date.now()), payload };
}

async function getRequest(id) {
  try {
    // If id is a numeric string, fetch directly from postgres
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      const row = await postgres.getRequest(numericId);
      return {
        id: String(row.id),
        payload: {
          headers: row.headers || {},
          body: row.body || row.raw_body,
          raw_body: row.raw_body || '',
          method: row.http_method,
          path: row.http_path,
          query: row.query_params || {},
          received_at: row.received_at,
          ip: row.ip,
        },
      };
    }
  } catch {
    // Return empty payload if not found
  }
  return null;
}

module.exports = {
  deleteRequest,
  createRequest,
  getRequest,
};
