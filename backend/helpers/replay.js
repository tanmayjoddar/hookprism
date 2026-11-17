const axios = require('axios');
const { validateTargetUrl } = require('./ssrf');

const FORBIDDEN_HEADERS = new Set([
  'host',
  'content-length',
  'connection',
  'transfer-encoding',
  'keep-alive',
  'cf-connecting-ip',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-real-ip',
]);

const MAX_BODY_BYTES = 1024 * 1024; // 1MB

// In-memory rate limiter: max 30 replays per minute per client IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 40;

function checkRateLimit(clientIp) {
  const ip = clientIp || 'global';
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record = { count: 0, startTime: now };
    rateLimitMap.set(ip, record);
  }
  record.count += 1;
  if (record.count > RATE_LIMIT_MAX) {
    return false;
  }
  return true;
}

function sanitizeHeaders(headers) {
  const clean = {};
  if (!headers || typeof headers !== 'object') return clean;
  for (const [key, val] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (!FORBIDDEN_HEADERS.has(lower)) {
      clean[key] = val;
    }
  }
  return clean;
}

function truncateString(str, maxBytes) {
  if (!str) return '';
  const buf = Buffer.from(str, 'utf8');
  if (buf.length <= maxBytes) return str;
  return buf.subarray(0, maxBytes).toString('utf8') + '... [truncated at 1MB]';
}

async function executeReplay({ targetUrl, method = 'POST', headers = {}, body = '', clientIp = '' }) {
  if (!checkRateLimit(clientIp)) {
    const err = new Error('Replay rate limit exceeded (maximum 40 requests per minute). Please try again shortly.');
    err.status = 429;
    throw err;
  }

  const validUrl = await validateTargetUrl(targetUrl);
  const cleanHeaders = sanitizeHeaders(headers);
  const upperMethod = (method || 'GET').toUpperCase();

  const startTime = Date.now();
  let responseStatus = null;
  let responseHeaders = {};
  let responseBody = '';
  let errorMessage = null;

  try {
    const response = await axios({
      method: upperMethod,
      url: validUrl,
      headers: cleanHeaders,
      data: ['GET', 'HEAD'].includes(upperMethod) ? undefined : body,
      timeout: 10000, // 10s timeout
      maxContentLength: 5 * 1024 * 1024,
      validateStatus: () => true, // Don't throw on 4xx/5xx
      responseType: 'text',
      transformResponse: [(data) => data], // Keep raw string
    });

    responseStatus = response.status;
    responseHeaders = response.headers || {};
    responseBody = truncateString(response.data, MAX_BODY_BYTES);
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      errorMessage = 'Request timed out after 10000ms';
      responseStatus = 504;
    } else {
      errorMessage = err.message || 'Network error during replay';
      responseStatus = 502;
    }
  }

  const latencyMs = Date.now() - startTime;

  return {
    targetUrl: validUrl,
    method: upperMethod,
    headers: cleanHeaders,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    responseStatus,
    responseHeaders,
    responseBody,
    latencyMs,
    errorMessage,
    createdAt: new Date().toISOString(),
  };
}

module.exports = {
  executeReplay,
  sanitizeHeaders,
  checkRateLimit,
};
