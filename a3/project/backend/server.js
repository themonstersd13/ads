const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "suru",
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432", 10),
  database: process.env.PGDATABASE || "student_mis"
});

const tableConfig = {
  roles: { fields: ["name"] },
  users: { fields: ["username", "password", "role_id"] },
  departments: { fields: ["name"] },
  students: { fields: ["roll_no", "name", "dept_id", "year"] },
  instructors: { fields: ["name", "dept_id"] },
  courses: { fields: ["code", "title", "dept_id"] },
  enrollments: { fields: ["student_id", "course_id", "semester", "grade"] }
};

function isValidTable(table) {
  return Object.prototype.hasOwnProperty.call(tableConfig, table);
}

function requireWriteRole(req, res, next) {
  const role = String(req.headers["x-role"] || "").toLowerCase();
  if (role === "admin" || role === "staff") {
    return next();
  }
  return res.status(403).json({ error: "Write access denied" });
}

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const result = await pool.query(
      "SELECT users.id, users.username, roles.name AS role FROM users JOIN roles ON users.role_id = roles.id WHERE users.username = $1 AND users.password = $2",
      [username, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Login failed", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/report/:table", async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  try {
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
    return res.json(result.rows);
  } catch (err) {
    console.error("Report query failed", err);
    return res.status(500).json({ error: "Query failed" });
  }
});

app.get("/api/:table", async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  try {
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
    return res.json(result.rows);
  } catch (err) {
    console.error("List query failed", err);
    return res.status(500).json({ error: "Query failed" });
  }
});

app.get("/api/:table/:id", async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Get by id failed", err);
    return res.status(500).json({ error: "Query failed" });
  }
});

app.post("/api/:table", requireWriteRole, async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  const fields = tableConfig[table].fields;
  const values = fields.map((f) => req.body[f]);
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");

  try {
    const result = await pool.query(
      `INSERT INTO ${table} (${fields.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Insert failed", err);
    return res.status(500).json({ error: "Insert failed" });
  }
});

app.put("/api/:table/:id", requireWriteRole, async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  const fields = tableConfig[table].fields;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
  const values = fields.map((f) => req.body[f]);
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE ${table} SET ${sets} WHERE id = $${fields.length + 1} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Update failed", err);
    return res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/:table/:id", requireWriteRole, async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  try {
    const result = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete failed", err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
