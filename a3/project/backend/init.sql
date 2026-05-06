CREATE DATABASE student_mis;

\c student_mis

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(50) NOT NULL,
  role_id INT REFERENCES roles(id)
);

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  roll_no VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  dept_id INT REFERENCES departments(id),
  year INT
);

CREATE TABLE instructors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  dept_id INT REFERENCES departments(id)
);

CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(100) NOT NULL,
  dept_id INT REFERENCES departments(id)
);

CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES students(id),
  course_id INT REFERENCES courses(id),
  semester VARCHAR(20),
  grade VARCHAR(10)
);

INSERT INTO roles (name) VALUES ('admin'), ('staff'), ('student');
INSERT INTO users (username, password, role_id)
VALUES ('admin', 'admin', 1);
