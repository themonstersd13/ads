const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const {
  pools,
  normalizeNodeName,
  getPoolForNode,
  resolveNodeForRequest,
  closeAllPools
} = require('./db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function getRequestMeta(req) {
  return {
    userId: (req.header('x-user-id') || req.query.userId || (req.body && req.body.userId) || '').trim(),
    role: (req.header('x-user-role') || req.query.role || (req.body && req.body.role) || '').trim(),
    readNode: normalizeNodeName(req.header('x-read-node') || req.query.readNode || '')
  };
}

function listAssignmentsByNode(map) {
  return Object.keys(config.nodes).reduce((acc, nodeName) => {
    acc[nodeName] = Object.entries(map)
      .filter(([, assignedNode]) => assignedNode === nodeName)
      .map(([value]) => value)
      .sort();
    return acc;
  }, {});
}

function resolveWriteTarget(meta) {
  const route = resolveNodeForRequest(meta);
  return {
    userId: meta.userId,
    role: meta.role,
    readNode: meta.readNode || '',
    routeReason: route.reason,
    matchedValue: route.matchedValue,
    writeNode: route.nodeName,
    ...getPoolForNode(route.nodeName)
  };
}

function resolveReadTarget(meta, writeTarget) {
  if (!meta.readNode || meta.readNode === 'auto') {
    return {
      readNode: writeTarget.nodeName,
      pool: writeTarget.pool
    };
  }

  const target = getPoolForNode(meta.readNode);
  return {
    readNode: target.nodeName,
    pool: target.pool
  };
}

async function getNodeHealth(nodeName, pool) {
  try {
    const result = await pool.query(
      `SELECT
         inet_server_addr() AS host,
         inet_server_port() AS port,
         current_database() AS database_name,
         COUNT(*)::int AS record_count
       FROM student_records`
    );

    return {
      nodeName,
      ok: true,
      host: result.rows[0].host,
      port: result.rows[0].port,
      database: result.rows[0].database_name,
      recordCount: result.rows[0].record_count
    };
  } catch (error) {
    return {
      nodeName,
      ok: false,
      error: error.message
    };
  }
}

app.get('/api/health', async (req, res) => {
  const checks = await Promise.all(
    Object.entries(pools).map(([nodeName, pool]) => getNodeHealth(nodeName, pool))
  );

  res.json({
    ok: checks.every((c) => c.ok),
    checks
  });
});

app.get('/api/cluster', async (req, res) => {
  const checks = await Promise.all(
    Object.entries(pools).map(([nodeName, pool]) => getNodeHealth(nodeName, pool))
  );

  res.json({
    fallbackNode: config.fallbackNode,
    assignments: {
      roles: config.roleNodeMap,
      users: config.userNodeMap,
      rolesByNode: listAssignmentsByNode(config.roleNodeMap),
      usersByNode: listAssignmentsByNode(config.userNodeMap)
    },
    nodes: checks
  });
});

app.get('/api/routing', (req, res) => {
  try {
    const meta = getRequestMeta(req);
    const target = resolveWriteTarget(meta);
    const readTarget = resolveReadTarget(meta, target);

    res.json({
      userId: meta.userId,
      role: meta.role,
      routedNode: target.nodeName,
      writeNode: target.nodeName,
      readNode: readTarget.readNode,
      routeReason: target.routeReason,
      matchedValue: target.matchedValue
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/students', async (req, res) => {
  const meta = getRequestMeta(req);
  const writeTarget = resolveWriteTarget(meta);
  const readTarget = resolveReadTarget(meta, writeTarget);

  try {
    const result = await readTarget.pool.query(
      `SELECT
         id,
         owner_user,
         owner_role,
         last_write_node,
         name,
         email,
         updated_at
       FROM student_records
       ORDER BY updated_at DESC
       LIMIT 200`
    );

    res.json({
      routedNode: writeTarget.nodeName,
      writeNode: writeTarget.nodeName,
      readNode: readTarget.readNode,
      routeReason: writeTarget.routeReason,
      matchedValue: writeTarget.matchedValue,
      rows: result.rows
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      routedNode: writeTarget.nodeName,
      writeNode: writeTarget.nodeName,
      readNode: readTarget.readNode
    });
  }
});

app.post('/api/students', async (req, res) => {
  const meta = getRequestMeta(req);
  const { nodeName, pool, routeReason, matchedValue } = resolveWriteTarget(meta);
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO student_records (
         owner_user,
         owner_role,
         last_write_node,
         name,
         email
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, owner_user, owner_role, last_write_node, name, email, updated_at`,
      [meta.userId || 'anonymous', meta.role || 'guest', nodeName, name, email]
    );

    return res.status(201).json({
      routedNode: nodeName,
      writeNode: nodeName,
      routeReason,
      matchedValue,
      row: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, routedNode: nodeName });
  }
});

app.put('/api/students/:id', async (req, res) => {
  const meta = getRequestMeta(req);
  const { nodeName, pool, routeReason, matchedValue } = resolveWriteTarget(meta);
  const { id } = req.params;
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  try {
    const result = await pool.query(
      `UPDATE student_records
       SET name = $1,
           email = $2,
           last_write_node = $3,
           updated_at = now()
       WHERE id = $4
       RETURNING id, owner_user, owner_role, last_write_node, name, email, updated_at`,
      [name, email, nodeName, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found', routedNode: nodeName });
    }

    return res.json({
      routedNode: nodeName,
      writeNode: nodeName,
      routeReason,
      matchedValue,
      row: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, routedNode: nodeName });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  const meta = getRequestMeta(req);
  const { nodeName, pool, routeReason, matchedValue } = resolveWriteTarget(meta);
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM student_records WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found', routedNode: nodeName });
    }

    return res.json({
      routedNode: nodeName,
      writeNode: nodeName,
      routeReason,
      matchedValue,
      deletedId: result.rows[0].id
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, routedNode: nodeName });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const server = app.listen(config.port, config.host, () => {
  console.log(`Master-master portal listening at http://${config.host}:${config.port}`);
});

async function shutdown() {
  server.close(async () => {
    await closeAllPools();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
