const { Pool } = require('pg');
const config = require('./config');

const pools = {};
for (const [nodeName, dbConfig] of Object.entries(config.nodes)) {
  pools[nodeName] = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
}

function normalizeNodeName(rawNodeName) {
  return (rawNodeName || '').trim().toLowerCase();
}

function getPoolForNode(rawNodeName) {
  const nodeName = normalizeNodeName(rawNodeName);
  const pool = pools[nodeName];

  if (!pool) {
    throw new Error(`No pool configured for node '${rawNodeName}'.`);
  }

  return { nodeName, pool };
}

function resolveNodeForRequest({ userId, role } = {}) {
  const normalizedUserId = (userId || '').trim().toLowerCase();
  const normalizedRole = (role || '').trim().toLowerCase();

  if (normalizedUserId && config.userNodeMap[normalizedUserId]) {
    return {
      nodeName: config.userNodeMap[normalizedUserId],
      reason: 'user',
      matchedValue: normalizedUserId
    };
  }

  if (normalizedRole && config.roleNodeMap[normalizedRole]) {
    return {
      nodeName: config.roleNodeMap[normalizedRole],
      reason: 'role',
      matchedValue: normalizedRole
    };
  }

  return {
    nodeName: config.fallbackNode,
    reason: 'fallback',
    matchedValue: config.fallbackNode
  };
}

async function closeAllPools() {
  await Promise.all(Object.values(pools).map((pool) => pool.end()));
}

module.exports = {
  pools,
  normalizeNodeName,
  getPoolForNode,
  resolveNodeForRequest,
  closeAllPools
};
