const crypto = require('crypto');

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyGitHubSignature(rawBody, secret, signatureHeader) {
  if (!signatureHeader) {
    return {
      valid: false,
      type: 'github',
      error: 'Missing x-hub-signature-256 header',
    };
  }

  const cleanHeader = signatureHeader.trim();
  const expectedPrefix = 'sha256=';
  const receivedHash = cleanHeader.startsWith(expectedPrefix)
    ? cleanHeader.slice(expectedPrefix.length)
    : cleanHeader;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody || '');
  const computedHash = hmac.digest('hex');

  const valid = safeCompare(computedHash.toLowerCase(), receivedHash.toLowerCase());

  return {
    valid,
    type: 'github',
    headerName: 'x-hub-signature-256',
    receivedSignature: cleanHeader,
    computedSignature: `sha256=${computedHash}`,
    algorithm: 'HMAC-SHA256',
  };
}

function verifyStripeSignature(rawBody, secret, signatureHeader, toleranceSeconds = 300) {
  if (!signatureHeader) {
    return {
      valid: false,
      type: 'stripe',
      error: 'Missing stripe-signature header',
    };
  }

  const items = signatureHeader.split(',').reduce((acc, part) => {
    const [key, val] = part.trim().split('=');
    if (key && val) {
      if (!acc[key]) acc[key] = [];
      acc[key].push(val);
    }
    return acc;
  }, {});

  const timestamp = items.t ? items.t[0] : null;
  const signatures = items.v1 || [];

  if (!timestamp || signatures.length === 0) {
    return {
      valid: false,
      type: 'stripe',
      error: 'Invalid stripe-signature format (expected t=...,v1=...)',
    };
  }

  const payload = `${timestamp}.${rawBody || ''}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const computedHash = hmac.digest('hex');

  const matchFound = signatures.some((sig) => safeCompare(sig, computedHash));

  // Check timestamp drift if desired
  const now = Math.floor(Date.now() / 1000);
  const timestampNum = parseInt(timestamp, 10);
  const drift = Math.abs(now - timestampNum);
  const withinTolerance = !isNaN(drift) && drift <= toleranceSeconds;

  return {
    valid: matchFound,
    type: 'stripe',
    headerName: 'stripe-signature',
    receivedSignatures: signatures,
    computedSignature: computedHash,
    timestamp: timestampNum,
    driftSeconds: drift,
    withinTolerance,
    algorithm: 'HMAC-SHA256 (t.payload)',
  };
}

function verifySignature({ rawBody, secret, type, headers }) {
  const normHeaders = {};
  if (headers && typeof headers === 'object') {
    Object.keys(headers).forEach((k) => {
      normHeaders[k.toLowerCase()] = headers[k];
    });
  }

  if (type === 'github' || (!type && normHeaders['x-hub-signature-256'])) {
    const header = normHeaders['x-hub-signature-256'];
    return verifyGitHubSignature(rawBody, secret, header);
  }

  if (type === 'stripe' || (!type && normHeaders['stripe-signature'])) {
    const header = normHeaders['stripe-signature'];
    return verifyStripeSignature(rawBody, secret, header);
  }

  // If neither specified, try both headers
  if (normHeaders['x-hub-signature-256']) {
    return verifyGitHubSignature(rawBody, secret, normHeaders['x-hub-signature-256']);
  }
  if (normHeaders['stripe-signature']) {
    return verifyStripeSignature(rawBody, secret, normHeaders['stripe-signature']);
  }

  return {
    valid: false,
    error: 'No recognized webhook signature header found (x-hub-signature-256 or stripe-signature)',
  };
}

module.exports = {
  verifyGitHubSignature,
  verifyStripeSignature,
  verifySignature,
};
