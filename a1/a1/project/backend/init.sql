-- Connect to default 'postgres' database as superuser first, then run:

-- 1. Create the user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '23510081') THEN
    CREATE ROLE "23510081" WITH LOGIN PASSWORD 'suru';
  END IF;
END
$$;

-- 2. Create the database (run this outside a transaction block in psql)
-- CREATE DATABASE "DB23510009" OWNER "23510009";

-- 3. After switching to DB23510009, create tables:

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  position VARCHAR(100),
  salary NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  dept_name VARCHAR(100) NOT NULL,
  location VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS students (
  prn SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  branch VARCHAR(50),
  year INT
);

-- 4. Insert sample data

INSERT INTO employees (name, position, salary) VALUES
  ('Rahul Sharma', 'Developer', 55000),
  ('Priya Patel', 'Designer', 48000),
  ('Amit Kumar', 'Manager', 72000)
ON CONFLICT DO NOTHING;

INSERT INTO departments (dept_name, location) VALUES
  ('Engineering', 'Pune'),
  ('Design', 'Mumbai'),
  ('HR', 'Bangalore')
ON CONFLICT DO NOTHING;

INSERT INTO students (name, branch, year) VALUES
  ('Saurabh Patil', 'Computer Engineering', 3),
  ('Neha Deshmukh', 'IT', 3),
  ('Rohan Joshi', 'Computer Engineering', 2)
ON CONFLICT DO NOTHING;

-- 5. Grant privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "23510009";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "23510009";
