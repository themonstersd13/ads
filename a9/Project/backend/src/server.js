require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const {
  initDatabases,
  getMongoCollection,
  mongoDbName
} = require('./db');

const app = express();
const port = Number(process.env.PORT || 3100);

app.use(cors());
app.use(express.json());

function validatePayload(body) {
  if (!body || typeof body !== 'object') {
    return 'Body is required';
  }

  const { name, email, course } = body;
  if (!name || !String(name).trim()) return 'name is required';
  if (!email || !String(email).trim()) return 'email is required';
  if (!course || !String(course).trim()) return 'course is required';
  return null;
}

app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoDbName,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/students', async (_req, res) => {
  try {
    const docs = await getMongoCollection()
      .find({}, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .toArray();
    return res.json(docs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/students', async (req, res) => {
  const validationError = validatePayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const student = {
    id: uuidv4(),
    name: String(req.body.name).trim(),
    email: String(req.body.email).trim(),
    course: String(req.body.course).trim(),
    created_at: new Date()
  };

  try {
    await getMongoCollection().insertOne(student);
    return res.status(201).json(student);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  const id = req.params.id;
  const validationError = validatePayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const updates = {
    name: String(req.body.name).trim(),
    email: String(req.body.email).trim(),
    course: String(req.body.course).trim()
  };

  try {
    const result = await getMongoCollection().findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'student not found' });
    }

    return res.json(result.value);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await getMongoCollection().deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'student not found' });
    }
    return res.json({ deleted: true, id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

(async () => {
  try {
    await initDatabases();
    app.listen(port, () => {
      console.log(`Assignment 9 backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
})();
