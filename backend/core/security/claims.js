// Canonical claim roots mapped to intent glob patterns
// Use these on FE/BE to keep meaning aligned.
module.exports = {
  system: 'system.**',
  game: '*.game.**',
  startGame: '*.game.requestNew',
  chat: 'chat.**',
  message: 'message.**',
  messageMe: 'message.me.**',
  contribute: 'contribute.**',
  update: 'update.**',
  elevate: 'elevate.**',
  // Leaderboard permissions
  leaderboardRead: 'leaderboard.read',
  leaderboardWrite: 'leaderboard.write',
  // Announcements
  announce: 'announce'
};
