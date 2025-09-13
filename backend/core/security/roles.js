const CLAIMS = require('./claims');

// Role -> claim patterns (resolved via CLAIMS)
// These are starting points; adjust per your needs.
module.exports = {
  owner: [
    '**'
  ],
  admin: [
    // All except elevate
    CLAIMS.system,
    CLAIMS.game,
    CLAIMS.startGame,
    CLAIMS.chat,
    CLAIMS.message,
    CLAIMS.messageMe,
    CLAIMS.contribute,
    CLAIMS.update
  ],
  guest: [
    CLAIMS.system,
    CLAIMS.game,
    CLAIMS.messageMe
  ],
  user: [
    CLAIMS.system,
    CLAIMS.game,
    CLAIMS.messageMe,
    CLAIMS.message,
    CLAIMS.chat,
    CLAIMS.startGame
  ],
  contributor: [
    // User + contribute
    CLAIMS.system,
    CLAIMS.game,
    CLAIMS.messageMe,
    CLAIMS.message,
    CLAIMS.chat,
    CLAIMS.startGame,
    CLAIMS.contribute
  ]
};
