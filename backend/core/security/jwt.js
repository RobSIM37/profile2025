const jwt = require('jsonwebtoken');

const getVerifyConfig = () => {
  const publicKey = process.env.JWT_PUBLIC_KEY;
  const secret = process.env.JWT_SECRET || process.env.JWT_SHARED_SECRET;
  if (publicKey) {
    return { key: publicKey, options: { algorithms: ['RS256'] } };
  }
  if (secret) {
    return { key: secret, options: { algorithms: ['HS256'] } };
  }
  // Dev mode: warn and allow unsigned decoding? No — reject to enforce real JWTs.
  throw new Error('JWT configuration missing. Set JWT_PUBLIC_KEY or JWT_SECRET.');
};

const verifyJwt = (token) => {
  const { key, options } = getVerifyConfig();
  return jwt.verify(token, key, options);
};

module.exports = { verifyJwt };

