const express = require('express');
const router = express.Router();
const postgres = require('../db/postgres_utils');
const { executeReplay } = require('../helpers/replay');
const { verifySignature } = require('../helpers/signature');

// Helper to compute deep diff between two bodies / objects
function computeBodyDiff(bodyA, bodyB) {
  let parsedA = bodyA;
  let parsedB = bodyB;
  let isJsonA = false;
  let isJsonB = false;

  try {
    parsedA = typeof bodyA === 'string' ? JSON.parse(bodyA) : bodyA;
    isJsonA = true;
  } catch {
    // not JSON
  }

  try {
    parsedB = typeof bodyB === 'string' ? JSON.parse(bodyB) : bodyB;
    isJsonB = true;
  } catch {
    // not JSON
  }

  const strA = typeof bodyA === 'string' ? bodyA : JSON.stringify(bodyA, null, 2);
  const strB = typeof bodyB === 'string' ? bodyB : JSON.stringify(bodyB, null, 2);

  return {
    identical: strA === strB,
    bothJson: isJsonA && isJsonB,
    lengthA: strA.length,
    lengthB: strB.length,
  };
}

// GET /api/requests/:id - Get full stored request
router.get('/:id', async (req, res, next) => {
  try {
    const request = await postgres.getRequest(req.params.id);
    return res.json(request);
  } catch (err) {
    return next(err);
  }
});

// GET /api/requests/:id/replays - Get replay history
router.get('/:id/replays', async (req, res, next) => {
  try {
    const replays = await postgres.getReplaysForRequest(req.params.id);
    return res.json(replays);
  } catch (err) {
    return next(err);
  }
});

// POST /api/requests/:id/replay - Replay request to targetUrl (supports edit-then-replay overrides)
router.post('/:id/replay', async (req, res, next) => {
  const { targetUrl, method: customMethod, headers: customHeaders, body: customBody } = req.body;
  if (!targetUrl) {
    return res.status(400).json({ error: 'targetUrl is required' });
  }

  try {
    const stored = await postgres.getRequest(req.params.id);

    // Determine final method, headers, and body (supporting edit-then-replay overrides)
    const method = customMethod || stored.http_method || 'POST';
    const headers = customHeaders || stored.headers || {};
    let body = customBody;
    if (body === undefined) {
      body = stored.raw_body || (stored.body ? JSON.stringify(stored.body) : '');
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const replayResult = await executeReplay({
      targetUrl,
      method,
      headers,
      body,
      clientIp,
    });

    const savedReplay = await postgres.saveReplay({
      requestId: stored.id,
      targetUrl: replayResult.targetUrl,
      method: replayResult.method,
      headers: replayResult.headers,
      body: replayResult.body,
      responseStatus: replayResult.responseStatus,
      responseHeaders: replayResult.responseHeaders,
      responseBody: replayResult.responseBody,
      latencyMs: replayResult.latencyMs,
      errorMessage: replayResult.errorMessage,
    });

    return res.json(savedReplay);
  } catch (err) {
    const status = err.status || err.code || (err.message.includes('Forbidden') || err.message.includes('Invalid') ? 400 : 500);
    return res.status(status).json({ error: err.message });
  }
});

// POST /api/requests/:id/dual-replay - Dual target replay with side-by-side diff
router.post('/:id/dual-replay', async (req, res, next) => {
  const { targetUrlA, targetUrlB, method: customMethod, headers: customHeaders, body: customBody } = req.body;

  if (!targetUrlA || !targetUrlB) {
    return res.status(400).json({ error: 'Both targetUrlA and targetUrlB are required for dual replay' });
  }

  try {
    const stored = await postgres.getRequest(req.params.id);

    const method = customMethod || stored.http_method || 'POST';
    const headers = customHeaders || stored.headers || {};
    let body = customBody;
    if (body === undefined) {
      body = stored.raw_body || (stored.body ? JSON.stringify(stored.body) : '');
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Execute both replays concurrently
    const [resultA, resultB] = await Promise.all([
      executeReplay({ targetUrl: targetUrlA, method, headers, body, clientIp }),
      executeReplay({ targetUrl: targetUrlB, method, headers, body, clientIp }),
    ]);

    // Save both to history
    const [savedA, savedB] = await Promise.all([
      postgres.saveReplay({
        requestId: stored.id,
        targetUrl: resultA.targetUrl,
        method: resultA.method,
        headers: resultA.headers,
        body: resultA.body,
        responseStatus: resultA.responseStatus,
        responseHeaders: resultA.responseHeaders,
        responseBody: resultA.responseBody,
        latencyMs: resultA.latencyMs,
        errorMessage: resultA.errorMessage,
      }),
      postgres.saveReplay({
        requestId: stored.id,
        targetUrl: resultB.targetUrl,
        method: resultB.method,
        headers: resultB.headers,
        body: resultB.body,
        responseStatus: resultB.responseStatus,
        responseHeaders: resultB.responseHeaders,
        responseBody: resultB.responseBody,
        latencyMs: resultB.latencyMs,
        errorMessage: resultB.errorMessage,
      }),
    ]);

    // Calculate diff
    const statusMatch = resultA.responseStatus === resultB.responseStatus;
    const latencyDeltaMs = resultA.latencyMs - resultB.latencyMs;
    const bodyDiff = computeBodyDiff(resultA.responseBody, resultB.responseBody);

    // Headers diff
    const allHeaderKeys = Array.from(new Set([
      ...Object.keys(resultA.responseHeaders || {}).map((k) => k.toLowerCase()),
      ...Object.keys(resultB.responseHeaders || {}).map((k) => k.toLowerCase()),
    ])).sort();

    const headerDiffs = allHeaderKeys.map((key) => ({
      key,
      valA: resultA.responseHeaders[key] || null,
      valB: resultB.responseHeaders[key] || null,
      match: resultA.responseHeaders[key] === resultB.responseHeaders[key],
    }));

    return res.json({
      targetA: savedA,
      targetB: savedB,
      diff: {
        statusMatch,
        statusA: resultA.responseStatus,
        statusB: resultB.responseStatus,
        latencyA: resultA.latencyMs,
        latencyB: resultB.latencyMs,
        latencyDeltaMs,
        bodyIdentical: bodyDiff.identical,
        bodyDiff,
        headerDiffs,
      },
    });
  } catch (err) {
    const status = err.status || err.code || 500;
    return res.status(status).json({ error: err.message });
  }
});

// POST /api/requests/:id/verify-signature - HMAC signature verification
router.post('/:id/verify-signature', async (req, res, next) => {
  const { secret, type } = req.body;
  if (!secret) {
    return res.status(400).json({ error: 'Secret is required to verify signature' });
  }

  try {
    const stored = await postgres.getRequest(req.params.id);
    const rawBody = stored.raw_body || (stored.body ? JSON.stringify(stored.body) : '');
    const headers = stored.headers || {};

    const verificationResult = verifySignature({
      rawBody,
      secret,
      type,
      headers,
    });

    return res.json(verificationResult);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
