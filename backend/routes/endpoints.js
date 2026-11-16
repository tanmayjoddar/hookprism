const express = require('express');
const router = express.Router();
const postgres = require('../db/postgres_utils');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.all('/:bin_path/:remaining_path*?', async (req, res, next) => {
  const { bin_path: binPath } = req.params;

  try {
    const bin = await postgres.getBin(binPath);
    const binId = bin.id;
    const chaosConfig = bin.chaos_config || { enabled: false };

    // Extract raw body
    let rawBody = req.rawBody;
    if (rawBody === undefined || rawBody === null) {
      if (typeof req.body === 'string') {
        rawBody = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString('utf8');
      } else if (req.body && Object.keys(req.body).length > 0) {
        rawBody = JSON.stringify(req.body);
      } else {
        rawBody = '';
      }
    }

    // Try parsing body if it's JSON string
    let parsedBody = req.body;
    if (typeof parsedBody === 'string' && parsedBody.trim().startsWith('{')) {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch {
        // Keep string
      }
    }

    const clientIp =
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      '';

    const newRequest = await postgres.createRequest({
      binId,
      httpMethod: req.method,
      httpPath: req.originalUrl || req.path,
      headers: req.headers,
      queryParams: req.query,
      rawBody,
      body: parsedBody,
      ip: clientIp,
    });

    // Real-time broadcast
    const io = req.app.get('socketio');
    if (io) {
      io.to(binPath).emit('newRequest', newRequest);
    }

    // Apply Chaos Mock response if enabled
    if (chaosConfig && chaosConfig.enabled) {
      const delayMs = parseInt(chaosConfig.delayMs, 10) || 0;
      if (delayMs > 0) {
        await sleep(Math.min(delayMs, 10000));
      }

      const failureRate = parseFloat(chaosConfig.failureRate) || 0;
      const isFailure = Math.random() * 100 < failureRate;

      if (isFailure) {
        const failStatus = parseInt(chaosConfig.failureStatusCode, 10) || 500;
        const failBody = chaosConfig.failureResponseBody || chaosConfig.responseBody || 'Chaos Mock Simulated Failure';
        return res.status(failStatus).send(failBody);
      }

      const successStatus = parseInt(chaosConfig.statusCode, 10) || 200;
      const successBody = chaosConfig.responseBody !== undefined ? chaosConfig.responseBody : 'OK';
      return res.status(successStatus).send(successBody);
    }

    return res.status(200).send('OK');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
