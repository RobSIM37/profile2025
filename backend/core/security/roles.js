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
    CLAIMS.update,
    CLAIMS.leaderboardRead,
    CLAIMS.leaderboardWrite,
    CLAIMS.announce
  ],
  guest: [
    CLAIMS.system,
    CLAIMS.game,
    CLAIMS.messageMe,
    CLAIMS.leaderboardRead
  ],
  user: [
    CLAIMS.system,
    CLAIMS.game,
    CLAIMS.messageMe,
    CLAIMS.message,
    CLAIMS.chat,
    CLAIMS.startGame,
    CLAIMS.leaderboardRead,
    CLAIMS.leaderboardWrite
  ],
  contributor: [
    // User + contribute
    CLAIMS.system,
    CLAIMS.game,
    CLAIMS.messageMe,
    CLAIMS.message,
    CLAIMS.chat,
    CLAIMS.startGame,
    CLAIMS.contribute,
    CLAIMS.leaderboardRead,
    CLAIMS.leaderboardWrite
  ]
};
