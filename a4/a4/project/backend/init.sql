CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('teacher', 'student'))
);

CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    image_url VARCHAR(255),
    option_a VARCHAR(255) NOT NULL,
    option_b VARCHAR(255) NOT NULL,
    option_c VARCHAR(255) NOT NULL,
    option_d VARCHAR(255) NOT NULL,
    correct_option VARCHAR(1) NOT NULL
);

CREATE TABLE exams (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    time_limit INTEGER NOT NULL -- in minutes
);

CREATE TABLE exam_questions (
    exam_id INTEGER REFERENCES exams(id),
    question_id INTEGER REFERENCES questions(id),
    PRIMARY KEY (exam_id, question_id)
);

CREATE TABLE student_exams (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id),
    exam_id INTEGER REFERENCES exams(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    score NUMERIC(5,2),
    status VARCHAR(50) DEFAULT 'not started' -- not started, ongoing, completed, terminated
);
