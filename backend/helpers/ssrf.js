const dns = require('dns');
const { promisify } = require('util');
const lookup = promisify(dns.lookup);

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1' || ip === '0.0.0.0' || ip === '::') {
    return true;
  }
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && !parts.some(isNaN)) {
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 Link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 Private
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 Private
    if (a === 100 && b >= 64 && b <= 127) return true; // Carrier-grade NAT 100.64.0.0/10
    if (a >= 224) return true; // Multicast / Reserved
  }
  const lower = ip.toLowerCase();
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }
  if (lower.startsWith('::ffff:')) {
    const v4part = lower.replace('::ffff:', '');
    return isPrivateIp(v4part);
  }
  return false;
}

async function validateTargetUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Target URL must be a non-empty string');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err) {
    throw new Error(`Invalid URL format: ${err.message}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Only HTTP and HTTPS target URLs are allowed, received: ${parsed.protocol}`);
  }

  let addresses = [];
  try {
    const resolved = await lookup(parsed.hostname, { all: true });
    addresses = Array.isArray(resolved) ? resolved : [resolved];
  } catch (err) {
    throw new Error(`DNS resolution failed for hostname "${parsed.hostname}": ${err.message}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new Error(`Could not resolve hostname "${parsed.hostname}"`);
  }

  for (const addr of addresses) {
    const ip = addr.address;
    if (isPrivateIp(ip)) {
      throw new Error(`Access to private, loopback, or link-local address (${ip}) is forbidden`);
    }
  }

  return parsed.href;
}

module.exports = {
  validateTargetUrl,
  isPrivateIp,
};
