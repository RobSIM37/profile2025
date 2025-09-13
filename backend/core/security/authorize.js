const roleClaims = require('./roles');
const CLAIMS = require('./claims');

// Simple glob-like intent matcher supporting:
// - '*' for a single segment
// - '**' for any remainder
function matches(pattern, intent) {
  if (pattern === '**') return true;
  const pSegs = pattern.split('.');
  const iSegs = intent.split('.');
  let i = 0, j = 0;
  while (j < pSegs.length && i < iSegs.length) {
    const p = pSegs[j];
    if (p === '**') return true; // anything after
    if (p !== '*' && p !== iSegs[i]) return false;
    i++; j++;
  }
  return j === pSegs.length && i === iSegs.length; // full match
}

function collectClaimsFromRoles(roles) {
  const set = new Set();
  (roles || []).forEach(r => {
    (roleClaims[r] || []).forEach(c => set.add(c));
  });
  return Array.from(set);
}

function normalizeClaimToPattern(claim) {
  if (!claim) return null;
  // If claim starts with a dot or is a known key, resolve via CLAIMS
  const key = claim.startsWith('.') ? claim.slice(1) : claim;
  if (CLAIMS[key]) return CLAIMS[key];
  return claim; // assume already a glob pattern
}

function isAuthorized(user, intent) {
  const directClaims = (user?.claims || []).map(normalizeClaimToPattern);
  const fromRoles = collectClaimsFromRoles(user?.roles || []).map(normalizeClaimToPattern);
  const claims = [...new Set([...directClaims, ...fromRoles])];
  if (claims.includes('**')) return true;
  return claims.some(c => matches(c, intent) || intent.startsWith(c.replace('*', '')));
}

module.exports = { isAuthorized };
