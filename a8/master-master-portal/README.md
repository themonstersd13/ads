# Assignment 8: 3-Node Master-Master Distributed PostgreSQL Portal

This folder now gives you a complete demo for your faculty requirement:

- 3 database nodes
- master-master style multi-write setup
- changes written on one node visible from the other nodes
- simple GUI for CRUD access
- role-based assignment to different nodes

For a dedicated **3 lab PC deployment guide with exact IP placeholders**, see:

- [LAB_PC_SETUP.md](e:/PROGRAMING/ADS/23510009_Assignment_8/master-master-portal/LAB_PC_SETUP.md)

## Architecture

- `node1` handles `admin` role by default
- `node2` handles `teacher` role by default
- `node3` handles `student` role by default
- explicit user mapping can override role mapping
- every node publishes its own changes
- every node subscribes to the other two nodes
- UUID primary keys are used to avoid ID collision in multi-write mode

## What The Portal Shows

- `Create / Update / Delete` student records
- routed write node
- selected read node
- routing rule used: user, role, or fallback
- health of all 3 nodes
- records visible on each node after replication

## Folder Structure

- `backend/` - Node.js API + browser GUI
- `sql/` - schema and manual subscription SQL
- `setup_wsl_cluster.sh` - creates a 3-node master-master cluster inside WSL PostgreSQL
- `setup_wsl_cluster.ps1` - PowerShell wrapper to launch the WSL setup
- `stop_wsl_cluster.ps1` - stops the WSL PostgreSQL clusters
- `docker-compose.yml` - local 3-node PostgreSQL cluster
- `setup_local_cluster.ps1` - starts local cluster and wires publications/subscriptions
- `stop_local_cluster.ps1` - stops local cluster

## Quick Demo On One Laptop Using WSL

This is now the recommended path if you want to avoid Docker image issues.

### 1. Make sure WSL PostgreSQL is available

Inside your Ubuntu WSL distro you should have PostgreSQL 16 tools such as:

- `pg_createcluster`
- `pg_ctlcluster`
- `psql`

If not installed yet:

```bash
sudo apt update
sudo apt install postgresql-16 postgresql-client-16 postgresql-common
```

### 2. Start the WSL 3-node cluster

From PowerShell:

```powershell
cd e:\PROGRAMING\ADS\23510009_Assignment_8\master-master-portal
.\setup_wsl_cluster.ps1
```

This creates 3 PostgreSQL clusters inside WSL and exposes them on:

- `node1` on `localhost:5433`
- `node2` on `localhost:5434`
- `node3` on `localhost:5435`

### 3. Configure the portal

Copy:

- `backend\.env.wsl.example` -> `backend\.env`

### 4. Start the GUI/API

```powershell
cd e:\PROGRAMING\ADS\23510009_Assignment_8
.\start_master_master_portal.ps1
```

Open:

```text
http://localhost:8080
```

### 5. Stop the WSL cluster later

```powershell
cd e:\PROGRAMING\ADS\23510009_Assignment_8\master-master-portal
.\stop_wsl_cluster.ps1
```

## Faculty Demo Flow

1. Select role `admin`, keep read node `auto`, create a row.
2. The row is written to `node1`.
3. Change read node to `node2` and press `Refresh`.
4. Show that the same row appears on `node2`.
5. Change read node to `node3` and show the same row there too.
6. Repeat using role `teacher` or `student` to show different routed write nodes.

## Role-Based Assignment

Default mapping inside `backend\.env.wsl.example`:

- `admin -> node1`
- `teacher -> node2`
- `student -> node3`

User overrides:

- `alice -> node1`
- `bob -> node2`
- `charlie -> node3`

Routing priority:

1. exact user mapping
2. role mapping
3. fallback node

## Manual 3-Machine Lab Setup

If your teacher wants this on separate machines instead of one laptop:

### Machine plan

- Machine 1: PostgreSQL + publication `node1_pub`
- Machine 2: PostgreSQL + publication `node2_pub`
- Machine 3: PostgreSQL + publication `node3_pub`
- GUI/API can run on any one machine

### PostgreSQL settings on each machine

In `postgresql.conf`:

- `listen_addresses = '*'`
- `wal_level = logical`
- `max_wal_senders = 20`
- `max_replication_slots = 20`

In `pg_hba.conf`:

- `host all all 192.168.1.0/24 md5`
- `host replication all 192.168.1.0/24 md5`

Restart PostgreSQL after editing those files.

### Schema and replication

Run on each machine:

1. `CREATE DATABASE lab_sync;`
2. execute `sql\01_schema.sql`
3. create one publication:
   - machine 1: `CREATE PUBLICATION node1_pub FOR TABLE student_records;`
   - machine 2: `CREATE PUBLICATION node2_pub FOR TABLE student_records;`
   - machine 3: `CREATE PUBLICATION node3_pub FOR TABLE student_records;`

Then create subscriptions:

- machine 1 uses `sql\03_subscriptions_node1.sql`
- machine 2 uses `sql\04_subscriptions_node2.sql`
- machine 3 uses `sql\05_subscriptions_node3.sql`

Update IPs, usernames, and passwords inside those SQL files first.

### Portal config for real machines

Copy `backend\.env.example` to `backend\.env` and replace:

- `NODE1_HOST`
- `NODE2_HOST`
- `NODE3_HOST`
- database credentials
- role/user mappings if your faculty wants different assignment rules

## Optional Docker Path

If you prefer Docker instead of WSL, you can still use:

- `docker-compose.yml`
- `setup_local_cluster.ps1`
- `backend\.env.local.example`

## Verification Queries

Check subscriptions on a node:

```sql
SELECT subname, status FROM pg_stat_subscription;
```

Check records on any node:

```sql
SELECT id, owner_user, owner_role, last_write_node, name, email, updated_at
FROM student_records
ORDER BY updated_at DESC;
```

## Important Note

This setup is good for an academic demo of distributed multi-write replication. For reliability in viva, avoid simultaneous edits to the same row from different nodes at the same moment because conflict handling in logical replication can become hard to explain live.
