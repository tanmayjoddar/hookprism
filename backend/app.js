const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
});

const binRoutes = require('./routes/bins');
const endpointRoutes = require('./routes/endpoints');
const requestRoutes = require('./routes/requests');

app.use(cors());

// Capture raw body for signature verification while parsing JSON
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

app.use(
  express.text({
    type: ['text/*', 'application/xml', 'application/json'],
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

app.use(
  express.raw({
    type: '*/*',
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

io.on('connection', (socket) => {
  socket.on('joinBinRoom', (binPath) => {
    socket.join(binPath);
  });

  socket.on('leaveBinRoom', (binPath) => {
    socket.leave(binPath);
  });
});

app.set('socketio', io);

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hookprism-backend',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/bins', binRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/endpoints', endpointRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  const statusCode = error.status || error.code || 500;
  const numericStatus = typeof statusCode === 'number' && statusCode >= 100 && statusCode < 600 ? statusCode : 500;
  return res.status(numericStatus).json({
    error: error.message || 'Internal Server Error',
    code: numericStatus,
  });
});

module.exports = httpServer;
