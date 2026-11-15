require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(databaseUrl);

class HttpError extends Error {
  constructor(message, code = 500) {
    super(message);
    this.code = code;
  }
}

async function createBin(binPath) {
  try {
    const rows = await sql.query(
      'INSERT INTO bins (bin_path) VALUES ($1) RETURNING *',
      [binPath]
    );
    return rows;
  } catch (err) {
    throw new HttpError(`Error creating bin: ${err.message}`, 500);
  }
}

async function getBin(binPath) {
  try {
    const rows = await sql.query('SELECT * FROM bins WHERE bin_path = $1', [binPath]);
    if (!rows || rows.length === 0) {
      throw new HttpError('Bin does not exist', 404);
    }
    return rows[0];
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(`Error fetching bin: ${err.message}`, 500);
  }
}

async function getBinId(binPath) {
  const bin = await getBin(binPath);
  return bin.id;
}

async function updateBinChaos(binPath, chaosConfig) {
  try {
    const rows = await sql.query(
      'UPDATE bins SET chaos_config = $1 WHERE bin_path = $2 RETURNING *',
      [JSON.stringify(chaosConfig), binPath]
    );
    if (!rows || rows.length === 0) {
      throw new HttpError('Bin does not exist', 404);
    }
    return rows[0];
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(`Error updating chaos configuration: ${err.message}`, 500);
  }
}

async function deleteBin(binPath) {
  try {
    const rows = await sql.query('DELETE FROM bins WHERE bin_path = $1 RETURNING id', [binPath]);
    return rows.length > 0;
  } catch (err) {
    throw new HttpError(`Error deleting bin: ${err.message}`, 500);
  }
}

async function createRequest({
  binId,
  httpMethod,
  httpPath,
  headers = {},
  queryParams = {},
  rawBody = '',
  body = null,
  ip = '',
  mongoId = '',
}) {
  try {
    const rows = await sql.query(
      `INSERT INTO requests (bin_id, http_method, http_path, headers, query_params, raw_body, body, ip, mongo_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        binId,
        httpMethod,
        httpPath,
        JSON.stringify(headers),
        JSON.stringify(queryParams),
        rawBody,
        body !== null ? JSON.stringify(body) : null,
        ip,
        mongoId || String(Date.now()),
      ]
    );
    return rows[0];
  } catch (err) {
    throw new HttpError(`Error creating request: ${err.message}`, 500);
  }
}

async function getAllRequestsInBin(binPath) {
  const binId = await getBinId(binPath);
  try {
    const rows = await sql.query(
      'SELECT * FROM requests WHERE bin_id = $1 ORDER BY received_at DESC',
      [binId]
    );
    return rows;
  } catch (err) {
    throw new HttpError(`Error fetching requests: ${err.message}`, 500);
  }
}

async function getRequest(requestId) {
  try {
    const rows = await sql.query('SELECT * FROM requests WHERE id = $1', [requestId]);
    if (!rows || rows.length === 0) {
      throw new HttpError('Request does not exist', 404);
    }
    return rows[0];
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(`Error fetching request: ${err.message}`, 500);
  }
}

async function deleteRequest(requestId) {
  try {
    const rows = await sql.query('DELETE FROM requests WHERE id = $1 RETURNING id', [requestId]);
    return rows.length > 0;
  } catch (err) {
    throw new HttpError(`Error deleting request: ${err.message}`, 500);
  }
}

async function deleteAllRequestsInBin(binPath) {
  const binId = await getBinId(binPath);
  try {
    const rows = await sql.query('DELETE FROM requests WHERE bin_id = $1 RETURNING id', [binId]);
    return rows.length;
  } catch (err) {
    throw new HttpError(`Error deleting all requests: ${err.message}`, 500);
  }
}

async function saveReplay({
  requestId,
  targetUrl,
  method,
  headers = {},
  body = '',
  responseStatus = null,
  responseHeaders = {},
  responseBody = '',
  latencyMs = 0,
  errorMessage = null,
}) {
  try {
    const rows = await sql.query(
      `INSERT INTO replays (request_id, target_url, method, headers, body, response_status, response_headers, response_body, latency_ms, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        requestId,
        targetUrl,
        method,
        JSON.stringify(headers),
        body,
        responseStatus,
        JSON.stringify(responseHeaders),
        responseBody,
        latencyMs,
        errorMessage,
      ]
    );
    return rows[0];
  } catch (err) {
    throw new HttpError(`Error saving replay: ${err.message}`, 500);
  }
}

async function getReplaysForRequest(requestId) {
  try {
    const rows = await sql.query(
      'SELECT * FROM replays WHERE request_id = $1 ORDER BY created_at DESC',
      [requestId]
    );
    return rows;
  } catch (err) {
    throw new HttpError(`Error fetching replays: ${err.message}`, 500);
  }
}

module.exports = {
  createBin,
  getBin,
  getBinId,
  updateBinChaos,
  deleteBin,
  createRequest,
  getAllRequestsInBin,
  getRequest,
  deleteRequest,
  deleteAllRequestsInBin,
  saveReplay,
  getReplaysForRequest,
  HttpError,
};
