# Assignment 9 - MongoDB + CassandraDB CRUD (Angular 19)

This project demonstrates CRUD operations from an Angular 19 web form against both:
- MongoDB
- CassandraDB

Database namespace/keyspace created by PRN: `23510009`.

## Project Structure

- `backend/` - Express API for MongoDB and Cassandra CRUD
- `frontend/app/` - Angular 19 frontend form + table
- `wsl/` - WSL scripts to install/start/stop MongoDB and Cassandra
- `start_all.ps1` - One-command startup automation
- `stop_all.ps1` - One-command stop automation

## One Command Start (Windows PowerShell)

```powershell
cd e:\PROGRAMING\ADS\23510009_Assignment_9
.\start_all.ps1
```

## One Command Stop

```powershell
cd e:\PROGRAMING\ADS\23510009_Assignment_9
.\stop_all.ps1
```

## URLs

- Frontend: `http://localhost:4300`
- Backend health: `http://localhost:3100/api/health`
- MongoDB CRUD endpoint: `http://localhost:3100/api/students/mongo`
- Cassandra CRUD endpoint: `http://localhost:3100/api/students/cassandra`

## Notes

- MongoDB data is stored in WSL at `/var/lib/assignment9/mongo`.
- Cassandra runs in WSL using Apache Cassandra binary distribution.
- Backend creates Mongo database and Cassandra keyspace/table automatically on startup.
