const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

function parseIntOrDefault(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseNodeMap(raw) {
  if (!raw) {
    return {};
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const [user, node] = entry.split(':').map((part) => (part || '').trim());
      if (user && node) {
        acc[user.toLowerCase()] = node.toLowerCase();
      }
      return acc;
    }, {});
}

const config = {
  host: process.env.HOST || '0.0.0.0',
  port: parseIntOrDefault(process.env.PORT, 8080),
  fallbackNode: (process.env.FALLBACK_NODE || 'node1').toLowerCase(),
  userNodeMap: parseNodeMap(process.env.USER_NODE_MAP),
  roleNodeMap: parseNodeMap(process.env.ROLE_NODE_MAP),
  nodes: {
    node1: {
      host: process.env.NODE1_HOST,
      port: parseIntOrDefault(process.env.NODE1_PORT, 5432),
      database: process.env.NODE1_DATABASE,
      user: process.env.NODE1_USER,
      password: process.env.NODE1_PASSWORD
    },
    node2: {
      host: process.env.NODE2_HOST,
      port: parseIntOrDefault(process.env.NODE2_PORT, 5432),
      database: process.env.NODE2_DATABASE,
      user: process.env.NODE2_USER,
      password: process.env.NODE2_PASSWORD
    },
    node3: {
      host: process.env.NODE3_HOST,
      port: parseIntOrDefault(process.env.NODE3_PORT, 5432),
      database: process.env.NODE3_DATABASE,
      user: process.env.NODE3_USER,
      password: process.env.NODE3_PASSWORD
    }
  }
};

module.exports = config;
