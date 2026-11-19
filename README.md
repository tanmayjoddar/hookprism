# HookPrism &bull; Webhook Inspector, Replay Engine & Chaos Testing Platform

A modern, high-performance developer platform to capture, inspect, verify, chaos-test, and replay webhook payloads to single or dual destinations with real-time diffing.

![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat&logo=react&logoColor=black)
![Neon PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL%2016-00E599?style=flat&logo=postgresql&logoColor=black)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2F%20Workers-F38020?style=flat&logo=cloudflare&logoColor=white)

---

## Key Features

### 1. Replay Engine
- **Targeted Replay (`POST /api/requests/:id/replay`)**: Re-sends the captured request (method, headers, payload) to any public endpoint.
- **Header Sanitization**: Automatically strips hop-by-hop and host-specific headers (`host`, `content-length`, `connection`, `transfer-encoding`, `cf-*`, `x-forwarded-*`).
- **Comprehensive Logging**: Stores response status, response headers, response body (truncated at 1MB), latency in ms, and timestamps.
- **Replay History (`GET /api/requests/:id/replays`)**: Inspect past replays for any request.
- **Enterprise Safety**:
  - HTTP/HTTPS only protocol validation.
  - **SSRF Defense**: DNS resolution with strict validation blocking private, loopback (`127.0.0.1`), CGNAT, and link-local IP addresses.
  - 10-second request timeout guards.
  - In-memory rate limiting to protect target services.

### 2. X-Factor Features
- **Edit-then-Replay**: Modify HTTP method (`POST`, `GET`, `PUT`, `PATCH`, `DELETE`), custom headers, or payload body directly in the UI before replaying to test edge cases and malformed payloads.
- **Dual-Target Replay with Diff (`POST /api/requests/:id/dual-replay`)**: Send the exact same payload simultaneously to two endpoints (e.g., Staging vs. Production). View side-by-side status, latency delta, body comparison, and detailed headers diff.
- **Chaos Mock Responses (`GET` / `PUT /api/bins/:bin_path/chaos`)**: Configure what the webhook capture URL returns to callers:
  - Custom status codes (e.g. `200`, `201`, `429`).
  - Custom response body.
  - Artificial latency delays (up to 10s) to test timeouts.
  - Probabilistic failure rate (e.g. 30% 500 errors) to verify webhook sender retry behaviors.
- **Signature Verification (`POST /api/requests/:id/verify-signature`)**: Constant-time HMAC SHA-256 verification with pass/fail badges for:
  - **GitHub**: `x-hub-signature-256` (`sha256=<hash>`).
  - **Stripe**: `stripe-signature` (`t=timestamp,v1=signature`) with timestamp drift checks.

### 3. Developer UI
- **Linear / Vercel Aesthetic**: Dark, dense UI with neutral grays and restrained accents.
- **Typography**: Geist for interface, JetBrains Mono for payloads, headers, and URLs.
- **Interactive Inspector**: JSON syntax highlighting, Copy as cURL, real-time Socket.IO streaming, and responsive layout.

---

## Architecture & Hosting

- **Frontend**: Cloudflare Pages / Workers (`https://origin-splat.tanmayjoddar.workers.dev`).
- **Database**: Serverless PostgreSQL on [Neon](https://neon.tech).
- **Backend**: Node.js & Express on [Render](https://render.com).

---

## Local Development

### Prerequisites
- Node.js 18+
- Neon PostgreSQL connection string (in `.env`)

### 1. Database Setup
Ensure `DATABASE_URL` is set in `backend/.env`:
```bash
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
```
Initialize the schema:
```bash
cd backend
node db/init_db.js
```

### 2. Run Backend
```bash
cd backend
npm install
npm start
# Runs on http://localhost:3000
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## API Testing with cURL

### Health Check
```bash
curl http://localhost:3000/health
```

### Create a Bin
```bash
curl -X POST http://localhost:3000/api/bins
```

### Send a Webhook to Capture
```bash
curl -X POST http://localhost:3000/api/endpoints/<BIN_UUID>/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"invoice.paid","amount":4200}'
```

### Send Replay
```bash
curl -X POST http://localhost:3000/api/requests/<REQUEST_ID>/replay \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://httpbin.org/post"}'
```

### Edit-then-Replay (Custom Method & Body)
```bash
curl -X POST http://localhost:3000/api/requests/<REQUEST_ID>/replay \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://httpbin.org/put","method":"PUT","body":"{\"tampered\":true}"}'
```

### Dual-Target Replay with Diff
```bash
curl -X POST http://localhost:3000/api/requests/<REQUEST_ID>/dual-replay \
  -H "Content-Type: application/json" \
  -d '{"targetUrlA":"https://httpbin.org/post","targetUrlB":"https://postman-echo.com/post"}'
```

### Configure Chaos Mocking
```bash
curl -X PUT http://localhost:3000/api/bins/<BIN_UUID>/chaos \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"statusCode":429,"responseBody":"{\"error\":\"Rate limited\"}","delayMs":250,"failureRate":0}'
```

### Verify Signature
```bash
curl -X POST http://localhost:3000/api/requests/<REQUEST_ID>/verify-signature \
  -H "Content-Type: application/json" \
  -d '{"secret":"your_webhook_secret"}'
```

---

## License
MIT
