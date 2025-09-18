// services/tokenStore.js
// In-memory user-to-token map for single-session-per-user JWT

const validTokens = new Set();
const userTokenMap = new Map(); // userId (string) -> token

function addToken(token, userId) {
  // If user already has a token, remove the old one
  if (userTokenMap.has(userId)) {
    const oldToken = userTokenMap.get(userId);
    validTokens.delete(oldToken);
  }
  validTokens.add(token);
  userTokenMap.set(userId, token);
}

function removeToken(token) {
  validTokens.delete(token);
  // Remove from userTokenMap if present
  for (const [userId, t] of userTokenMap.entries()) {
    if (t === token) {
      userTokenMap.delete(userId);
      break;
    }
  }
}

function isTokenValid(token) {
  return validTokens.has(token);
}

function clearTokens() {
  validTokens.clear();
  userTokenMap.clear();
}

function getUserToken(userId) {
  return userTokenMap.get(userId);
}

module.exports = {
  addToken,
  removeToken,
  isTokenValid,
  clearTokens,
  getUserToken
};
