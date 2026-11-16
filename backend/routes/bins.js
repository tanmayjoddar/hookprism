const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const postgres = require('../db/postgres_utils');

// GET /api/bins/:bin_path/requests - List all requests in bin
router.get('/:bin_path/requests', async (req, res, next) => {
  const { bin_path: binPath } = req.params;
  try {
    const requests = await postgres.getAllRequestsInBin(binPath);
    return res.json(requests);
  } catch (error) {
    return next(error);
  }
});

// GET /api/bins/requests/:request_id - Get specific request details
router.get('/requests/:request_id', async (req, res, next) => {
  const { request_id: requestId } = req.params;
  try {
    const request = await postgres.getRequest(requestId);
    // Format payload for backward compatibility with frontend
    const result = {
      id: String(request.id),
      payload: {
        headers: request.headers || {},
        body: request.body || request.raw_body,
        raw_body: request.raw_body || '',
        method: request.http_method,
        path: request.http_path,
        query: request.query_params || {},
        received_at: request.received_at,
        ip: request.ip,
      },
    };
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// POST /api/bins - Create a new bin
router.post('/', async (req, res, next) => {
  const binPath = uuidv4();
  try {
    const result = await postgres.createBin(binPath);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// GET /api/bins/:bin_path/chaos - Get bin chaos configuration
router.get('/:bin_path/chaos', async (req, res, next) => {
  const { bin_path: binPath } = req.params;
  try {
    const bin = await postgres.getBin(binPath);
    return res.json(bin.chaos_config || {
      enabled: false,
      statusCode: 200,
      responseBody: 'OK',
      delayMs: 0,
      failureRate: 0,
      failureStatusCode: 500,
    });
  } catch (error) {
    return next(error);
  }
});

// PUT /api/bins/:bin_path/chaos - Update bin chaos configuration
router.put('/:bin_path/chaos', async (req, res, next) => {
  const { bin_path: binPath } = req.params;
  const chaosConfig = req.body;
  try {
    const updatedBin = await postgres.updateBinChaos(binPath, chaosConfig);
    return res.json(updatedBin.chaos_config);
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/bins/:bin_path - Delete entire bin
router.delete('/:bin_path', async (req, res, next) => {
  const { bin_path: binPath } = req.params;
  try {
    await postgres.deleteBin(binPath);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/bins/:bin_path/requests/:request_id - Delete single request
router.delete('/:bin_path/requests/:request_id', async (req, res, next) => {
  const { bin_path: binPath, request_id: requestId } = req.params;
  try {
    await postgres.deleteRequest(requestId);
    const io = req.app.get('socketio');
    if (io) {
      io.to(binPath).emit('requestDeleted', requestId);
    }
    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/bins/:bin_path/requests - Delete all requests in bin
router.delete('/:bin_path/requests', async (req, res, next) => {
  const { bin_path: binPath } = req.params;
  try {
    await postgres.deleteAllRequestsInBin(binPath);
    const io = req.app.get('socketio');
    if (io) {
      io.to(binPath).emit('allRequestsDeleted');
    }
    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
