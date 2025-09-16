const jwt = require('jsonwebtoken');

// Verification: prefer RS256 public key; fallback to HS256 shared secret
const getVerifyConfig = () => {
  const publicKey = process.env.JWT_PUBLIC_KEY;
  const secret = process.env.JWT_SECRET || process.env.JWT_SHARED_SECRET;
  if (publicKey) return { key: publicKey, options: { algorithms: ['RS256'] } };
  if (secret) return { key: secret, options: { algorithms: ['HS256'] } };
  throw new Error('JWT configuration missing. Set JWT_PUBLIC_KEY or JWT_SECRET.');
};

// Signing: prefer RS256 private key; fallback to HS256 shared secret
const getSignConfig = () => {
  const privateKey = process.env.JWT_PRIVATE_KEY;
  const secret = process.env.JWT_SECRET || process.env.JWT_SHARED_SECRET;
  if (privateKey) return { key: privateKey, algorithm: 'RS256' };
  if (secret) return { key: secret, algorithm: 'HS256' };
  return null; // no signing material available
};

const verifyJwt = (token) => {
  const { key, options } = getVerifyConfig();
  return jwt.verify(token, key, options);
};

const signJwt = (payload, { expiresIn = '12h' } = {}) => {
  const cfg = getSignConfig();
  if (!cfg) throw new Error('JWT signing unavailable. Set JWT_PRIVATE_KEY or JWT_SECRET.');
  return jwt.sign(payload, cfg.key, { algorithm: cfg.algorithm, expiresIn });
};

module.exports = { verifyJwt, signJwt };

