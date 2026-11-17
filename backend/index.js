require('dotenv').config();
const httpServer = require('./app');

const port = process.env.PORT || process.env.BACKEND_PORT || 3000;

httpServer.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`Connected to Neon PostgreSQL database`);
});
