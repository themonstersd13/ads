# PostgreSQL Replication Implementation (Assignment 8)

This document explains how replication was achieved for Assignment 3 and Assignment 4 in this workspace.

## 1. Objective

We implemented a distributed PostgreSQL backend with **3 nodes** and connected both portals to it:
- Node 1: Primary (read/write) on port 5433
- Node 2: Replica (read) on port 5434
- Node 3: Replica (read) on port 5435

Both backends (Assignment 3 and Assignment 4) are configured to use this cluster.

## 2. Why WSL-based setup was used

A Docker image pull issue (TLS protocol mismatch to Docker Hub) blocked container startup on this machine, so replication was implemented directly inside WSL Ubuntu using PostgreSQL native cluster tools.

## 3. Replication Topology

- PostgreSQL version: 16 (Ubuntu package)
- Cluster names: node1, node2, node3
- Primary server: node1
- Streaming replicas: node2 and node3
- Replication mode: asynchronous streaming

## 4. How the 3 nodes were created

Implemented in:
- `23510009_Assignment_8/distributed-postgres/setup_wsl_pg_cluster.sh`

Key actions performed by that script:
1. Create clusters if missing:
   - `pg_createcluster 16 node1 -p 5433`
   - `pg_createcluster 16 node2 -p 5434`
   - `pg_createcluster 16 node3 -p 5435`
2. Enable remote listening on all nodes:
   - `listen_addresses = '*'`
3. Configure primary (`node1`) for WAL replication:
   - `wal_level = replica`
   - `max_wal_senders = 10`
   - `max_replication_slots = 10`
4. Add replication/access rules in `pg_hba.conf`:
   - `host replication replicator 127.0.0.1/32 md5`
   - `host all all 0.0.0.0/0 md5`
5. Create replication role:
   - `replicator` with `REPLICATION LOGIN`
6. Re-clone node2 and node3 using `pg_basebackup` from node1 with `-R` to auto-configure standby.
7. Start replicas and verify with:
   - `SELECT client_addr, state, sync_state FROM pg_stat_replication;`

## 5. Database initialization for both assignments

Implemented in:
- `23510009_Assignment_8/distributed-postgres/init_assignment_dbs_wsl.sh`

This script does:
1. Creates databases on primary if missing:
   - `student_mis` (Assignment 3)
   - `exam_system` (Assignment 4)
2. Runs Assignment 3 SQL initialization:
   - `23510009_Assignment_3/23510009_Assignment_3/project/backend/init.sql`
3. Runs Assignment 4 schema:
   - `23510009_Assignment_4/codes/backend/database/schema.sql`
4. Validates replication reads from replicas:
   - Query `student_mis` on 5434
   - Query `exam_system` on 5435

## 6. Application integration (Assignment 3 and 4)

### Assignment 3 backend
- File: `23510009_Assignment_3/23510009_Assignment_3/project/backend/server.js`
- Reads DB connection from PG env vars (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`).
- Added endpoints to prove connected DB node:
  - `GET /api/health` includes node metadata
  - `GET /api/node` returns node role (`primary` or `replica`), server port, etc.

### Assignment 4 backend
- Files:
  - `23510009_Assignment_4/codes/backend/src/config/database.js`
  - `23510009_Assignment_4/codes/backend/src/server.js`
- Reads DB connection from DB env vars (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
- Added node metadata API:
  - `GET /api/health` includes node metadata
  - `GET /api/node` returns node role (`primary` or `replica`), server port, etc.

## 7. One-command startup automation

Main orchestrator:
- `23510009_Assignment_8/start_all.ps1`

What it does:
1. Stops old node/angular processes.
2. Ensures PostgreSQL is installed in WSL.
3. Runs replication setup script.
4. Runs DB initialization script.
5. Installs npm dependencies.
6. Seeds Assignment 4 data/users (`npm run db:seed`).
7. Starts:
   - Assignment 3 backend on 3000
   - Assignment 3 frontend on 4200
   - Assignment 4 backend on 3001
   - Assignment 4 frontend on 4201
8. Waits for API health readiness.

Stop script:
- `23510009_Assignment_8/stop_all.ps1`

## 8. Verification procedure used

### A. Cluster health verification
- `pg_lsclusters`
- `SELECT client_addr, state, sync_state FROM pg_stat_replication;`

Expected result:
- node1 is online primary
- node2 and node3 are online,recovery
- 2 streaming replica rows visible from primary

### B. API node verification
- Assignment 3: `http://localhost:3000/api/node`
- Assignment 4: `http://localhost:3001/api/node`

Expected fields:
- `role`: `primary` or `replica`
- `serverPort`: 5433/5434/5435
- `database`: target DB name

### C. Cross-node data propagation demo
1. Write via primary-connected backend.
2. Read via replica-connected backend (or direct replica SQL).
3. Confirm inserted row is visible on replica.

This demonstrates replication is active and both portals can use the distributed DB setup.

## 9. Default login credentials

### Assignment 3
- `admin / admin123`
- `staff / staff123`
- `stud / stud123`

### Assignment 4
- `admin@exam.com / admin123`
- `teacher@exam.com / password123`
- `ta1@exam.com / password123`
- `student1@exam.com / password123`

## 10. Conclusion

Replication was achieved using PostgreSQL native streaming replication in WSL with 3 nodes. Assignment 3 and Assignment 4 were both integrated with this setup, and replication was validated using health/node APIs and cross-node data visibility checks.

---

## 11. Master-Master Alternative (3 Physical Machines)

If faculty requires **master-master** (multi-write) instead of primary-replica, use the standalone setup here:

- `23510009_Assignment_8/master-master-portal/README.md`

This alternative:

1. Uses PostgreSQL **logical replication** with a full-mesh subscription model across 3 real lab machines.
2. Removes dependency on Assignment 3/4 portals.
3. Provides one simple IPv4-accessible GUI + API.
4. Routes each request to a node based on user ID mapping, while changes replicate to all nodes.
