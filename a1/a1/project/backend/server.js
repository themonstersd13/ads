const express = require('express');
const { Pool, Client } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_HOST = '10.40.3.3';
const DB_USER = '23510009';
const DB_NAME = 'DB23510009';
const DB_PASS = 'suru';
const DB_PORT = 5432;

let pool;

// Auto-initialize: create user, database, tables if they don't exist
async function initDatabase() {
  // Step 1: Connect as postgres to create user + database
  const adminClient = new Client({
    user: 'postgres', password: DB_PASS, host: DB_HOST, port: DB_PORT, database: 'postgres'
  });
  try {
    await adminClient.connect();
    console.log('Connected as postgres admin.');

    // Create user if not exists
    const userCheck = await adminClient.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [DB_USER]);
    if (userCheck.rowCount === 0) {
      await adminClient.query(`CREATE ROLE "${DB_USER}" WITH LOGIN PASSWORD '${DB_PASS}'`);
      console.log(`User "${DB_USER}" created.`);
    }

    // Create database if not exists
    const dbCheck = await adminClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]);
    if (dbCheck.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}"`);
      console.log(`Database "${DB_NAME}" created.`);
    }
  } catch (err) {
    console.error('Admin init error (non-fatal):', err.message);
  } finally {
    await adminClient.end();
  }

  // Step 2: Connect to the target DB and create tables
  const setupClient = new Client({
    user: 'postgres', password: DB_PASS, host: DB_HOST, port: DB_PORT, database: DB_NAME
  });
  try {
    await setupClient.connect();
    const sqlFile = path.join(__dirname, 'init.sql');
    if (fs.existsSync(sqlFile)) {
      const sql = fs.readFileSync(sqlFile, 'utf-8');
      await setupClient.query(sql);
      console.log('Database tables initialized from init.sql');
    }
  } catch (err) {
    console.error('Table init error (non-fatal):', err.message);
  } finally {
    await setupClient.end();
  }

  // Step 3: Create the app pool with the app user
  pool = new Pool({
    user: DB_USER, password: DB_PASS, host: DB_HOST, port: DB_PORT, database: DB_NAME
  });
  console.log(`App pool ready → ${DB_USER}@${DB_HOST}/${DB_NAME}`);
}

// Get all public tables
app.get('/tables', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// Get column info for a table
app.get('/columns/:tableName', async (req, res) => {
  const { tableName } = req.params;
  try {
    const result = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`, [tableName]
    );
    // Get primary key columns
    const pkResult = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_schema = 'public' AND tc.table_name = $1
         AND tc.constraint_type = 'PRIMARY KEY'`, [tableName]
    );
    const pkColumns = pkResult.rows.map(r => r.column_name);
    const columns = result.rows.map(col => ({
      ...col,
      is_primary_key: pkColumns.includes(col.column_name)
    }));
    res.json(columns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Read all rows from a table
app.get('/data/:tableName', async (req, res) => {
  const { tableName } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM "${tableName}"`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create - Insert a new row into any table
app.post('/data/:tableName', async (req, res) => {
  const { tableName } = req.params;
  const data = req.body;
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  try {
    const query = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update - Update a row by primary key column & value
app.put('/data/:tableName', async (req, res) => {
  const { tableName } = req.params;
  const { pkColumn, pkValue, data } = req.body;
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
  try {
    const query = `UPDATE "${tableName}" SET ${setClause} WHERE "${pkColumn}" = $${columns.length + 1} RETURNING *`;
    const result = await pool.query(query, [...values, pkValue]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete - Delete a row by primary key
app.delete('/data/:tableName/:pkColumn/:pkValue', async (req, res) => {
  const { tableName, pkColumn, pkValue } = req.params;
  try {
    await pool.query(`DELETE FROM "${tableName}" WHERE "${pkColumn}" = $1`, [pkValue]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Start server after DB init
initDatabase().then(() => {
  app.listen(3000, () => {
    console.log('Backend server running on http://localhost:3000');
  });
}).catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
