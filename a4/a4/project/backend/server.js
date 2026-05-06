const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mcq_exam_db',
    password: 'suru', // Replace with your PostgreSQL password
    port: 5432,
});

// User Management
app.post('/api/register', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
            [username, password, role]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Question Bank
app.post('/api/questions', async (req, res) => {
    const { question_text, image_url, option_a, option_b, option_c, option_d, correct_option } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO questions (question_text, image_url, option_a, option_b, option_c, option_d, correct_option) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [question_text, image_url, option_a, option_b, option_c, option_d, correct_option]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/questions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM questions');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Exam Management
app.post('/api/exams', async (req, res) => {
    const { title, time_limit, questions } = req.body;
    try {
        const examResult = await pool.query('INSERT INTO exams (title, time_limit) VALUES ($1, $2) RETURNING *', [title, time_limit]);
        const examId = examResult.rows[0].id;
        for (const questionId of questions) {
            await pool.query('INSERT INTO exam_questions (exam_id, question_id) VALUES ($1, $2)', [examId, questionId]);
        }
        res.status(201).json(examResult.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/exams', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exams');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/exams/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const examResult = await pool.query('SELECT * FROM exams WHERE id = $1', [id]);
        const questionsResult = await pool.query('SELECT q.* FROM questions q JOIN exam_questions eq ON q.id = eq.question_id WHERE eq.exam_id = $1', [id]);
        res.json({ ...examResult.rows[0], questions: questionsResult.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Exam Administration
app.post('/api/student-exams/start', async (req, res) => {
    const { student_id, exam_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO student_exams (student_id, exam_id, start_time, status) VALUES ($1, $2, NOW(), $3) RETURNING *',
            [student_id, exam_id, 'ongoing']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/student-exams/submit', async (req, res) => {
    const { student_exam_id, answers } = req.body; // answers is an object like { question_id: 'a', ... }
    try {
        const studentExamResult = await pool.query('SELECT * FROM student_exams WHERE id = $1', [student_exam_id]);
        const examId = studentExamResult.rows[0].exam_id;

        const questionsResult = await pool.query('SELECT q.id, q.correct_option FROM questions q JOIN exam_questions eq ON q.id = eq.question_id WHERE eq.exam_id = $1', [examId]);
        
        let score = 0;
        for (const question of questionsResult.rows) {
            const answer = answers && answers[question.id] ? String(answers[question.id]).trim().toLowerCase() : '';
            const correct = question.correct_option ? String(question.correct_option).trim().toLowerCase() : '';
            if (answer && correct && answer === correct) {
                score++;
            }
        }

        const totalQuestions = questionsResult.rows.length;
        const finalScore = totalQuestions > 0 ? Math.round((score / totalQuestions) * 10000) / 100 : 0;

        const result = await pool.query(
            'UPDATE student_exams SET end_time = NOW(), score = $1, status = $2 WHERE id = $3 RETURNING *',
            [finalScore, 'completed', student_exam_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Dashboard & Reports
app.get('/api/dashboard', async (req, res) => {
    try {
        const result = await pool.query('SELECT u.username, e.title, se.status, se.score, se.start_time, se.end_time FROM student_exams se JOIN users u ON se.student_id = u.id JOIN exams e ON se.exam_id = e.id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
