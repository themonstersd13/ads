# Lab PC Setup Guide

This guide is for the architecture you want now:

- **server + GUI stays on one laptop**
- **only PostgreSQL databases run on the 3 lab PCs**
- the server laptop connects to all 3 lab PCs over LAN

The server laptop can be:

- your laptop
- your friend's laptop

## 1. Final Architecture

- `Server Laptop` -> runs Node.js portal and browser GUI
- `Lab PC 1` -> runs PostgreSQL `node1`
- `Lab PC 2` -> runs PostgreSQL `node2`
- `Lab PC 3` -> runs PostgreSQL `node3`

So the **application server is not on any lab PC**.

## 2. Recommended IP Plan

Example LAN plan:

- `Server Laptop` -> `192.168.1.150`
- `Lab PC 1` -> `192.168.1.101` -> `node1`
- `Lab PC 2` -> `192.168.1.102` -> `node2`
- `Lab PC 3` -> `192.168.1.103` -> `node3`

Use your real IPs if they are different.

## 3. Which IP To Use

Use these IPs in the project:

- `NODE1_HOST` -> IP of `Lab PC 1`
- `NODE2_HOST` -> IP of `Lab PC 2`
- `NODE3_HOST` -> IP of `Lab PC 3`

If you keep the portal open only on the server laptop browser, use:

```text
http://localhost:8080
```

If you want to open the portal from some other PC also, use the server laptop IP:

```text
http://192.168.1.150:8080
```

## 4. How To Find IP On Every Machine

On the server laptop and on each lab PC run:

```powershell
ipconfig
```

Use the `IPv4 Address` from the active LAN adapter.

Fill this before setup:

| Machine | Role | IP |
|---|---|---|
| Server Laptop | GUI + API server | `____________` |
| Lab PC 1 | PostgreSQL node1 | `____________` |
| Lab PC 2 | PostgreSQL node2 | `____________` |
| Lab PC 3 | PostgreSQL node3 | `____________` |

## 5. What To Install Where

### On the server laptop

Install:

- Node.js
- npm
- this project folder

### On all 3 lab PCs

Install:

- PostgreSQL 16
- pgAdmin or psql

Node.js is **not required** on the lab PCs.

## 6. PostgreSQL Setup On Each Lab PC

Do the following on **Lab PC 1, Lab PC 2, and Lab PC 3**.

### Edit `postgresql.conf`

Set:

```conf
listen_addresses = '*'
wal_level = logical
max_wal_senders = 20
max_replication_slots = 20
```

### Edit `pg_hba.conf`

Allow LAN access.

If your network is `192.168.1.x`, add:

```conf
host all all 192.168.1.0/24 md5
host replication all 192.168.1.0/24 md5
```

If your network is different, change the subnet.

Then restart PostgreSQL service on each lab PC.

## 7. Create Database On Each Lab PC

On all 3 lab PCs:

```sql
CREATE DATABASE lab_sync;
```

Then run:

- [01_schema.sql](e:/PROGRAMING/ADS/23510009_Assignment_8/master-master-portal/sql/01_schema.sql)

on all 3 nodes.

## 8. Create Publication On Each Lab PC

### On Lab PC 1

```sql
CREATE PUBLICATION node1_pub FOR TABLE student_records;
```

### On Lab PC 2

```sql
CREATE PUBLICATION node2_pub FOR TABLE student_records;
```

### On Lab PC 3

```sql
CREATE PUBLICATION node3_pub FOR TABLE student_records;
```

## 9. Create Subscriptions On Each Lab PC

Before running subscription SQL, update the sample IPs inside these files:

- [03_subscriptions_node1.sql](e:/PROGRAMING/ADS/23510009_Assignment_8/master-master-portal/sql/03_subscriptions_node1.sql)
- [04_subscriptions_node2.sql](e:/PROGRAMING/ADS/23510009_Assignment_8/master-master-portal/sql/04_subscriptions_node2.sql)
- [05_subscriptions_node3.sql](e:/PROGRAMING/ADS/23510009_Assignment_8/master-master-portal/sql/05_subscriptions_node3.sql)

Replace:

- `192.168.1.101` with `Lab PC 1 IP`
- `192.168.1.102` with `Lab PC 2 IP`
- `192.168.1.103` with `Lab PC 3 IP`

Then run:

- on `Lab PC 1` -> `03_subscriptions_node1.sql`
- on `Lab PC 2` -> `04_subscriptions_node2.sql`
- on `Lab PC 3` -> `05_subscriptions_node3.sql`

## 10. Configure `.env` On The Server Laptop

Open:

- [backend/.env](e:/PROGRAMING/ADS/23510009_Assignment_8/master-master-portal/backend/.env)

For this setup, the `.env` on the server laptop should look like:

```env
PORT=8080
HOST=0.0.0.0

USER_NODE_MAP=alice:node1,bob:node2,charlie:node3
ROLE_NODE_MAP=admin:node1,teacher:node2,student:node3
FALLBACK_NODE=node1

NODE1_HOST=192.168.1.101
NODE1_PORT=5432
NODE1_DATABASE=lab_sync
NODE1_USER=postgres
NODE1_PASSWORD=postgres

NODE2_HOST=192.168.1.102
NODE2_PORT=5432
NODE2_DATABASE=lab_sync
NODE2_USER=postgres
NODE2_PASSWORD=postgres

NODE3_HOST=192.168.1.103
NODE3_PORT=5432
NODE3_DATABASE=lab_sync
NODE3_USER=postgres
NODE3_PASSWORD=postgres
```

Important:

- these `NODE*_HOST` values are the **lab PC IPs**
- they are **not** the server laptop IP

## 11. Start Portal On The Server Laptop

From the server laptop:

```powershell
cd E:\PROGRAMING\ADS\23510009_Assignment_8
.\start_master_master_portal.ps1
```

Then open on the server laptop browser:

```text
http://localhost:8080
```

If needed from another PC on the LAN:

```text
http://<SERVER_LAPTOP_IP>:8080
```

Example:

```text
http://192.168.1.150:8080
```

## 12. What To Do On Other Lab PCs

### Lab PC 1

Do only database work:

1. install PostgreSQL
2. allow LAN access in PostgreSQL config
3. create `lab_sync`
4. run schema SQL
5. create `node1_pub`
6. run `03_subscriptions_node1.sql`

### Lab PC 2

Do only database work:

1. install PostgreSQL
2. allow LAN access in PostgreSQL config
3. create `lab_sync`
4. run schema SQL
5. create `node2_pub`
6. run `04_subscriptions_node2.sql`

### Lab PC 3

Do only database work:

1. install PostgreSQL
2. allow LAN access in PostgreSQL config
3. create `lab_sync`
4. run schema SQL
5. create `node3_pub`
6. run `05_subscriptions_node3.sql`

No lab PC needs the Node.js portal.

## 13. Verification Before Demo

From the server laptop, first check you can reach all DB PCs:

```powershell
ping 192.168.1.101
ping 192.168.1.102
ping 192.168.1.103
```

Then verify subscriptions on each DB node:

```sql
SELECT subname, status FROM pg_stat_subscription;
```

Check the replicated table:

```sql
SELECT id, owner_user, owner_role, last_write_node, name, email, updated_at
FROM student_records
ORDER BY updated_at DESC;
```

## 14. Quick Faculty Demo Flow

1. Start the portal on the server laptop.
2. Open `http://localhost:8080` on the server laptop.
3. Choose role `admin` and create one row.
4. Show it writes to `node1`.
5. Change read node to `node2` and refresh.
6. Show the same row on `node2`.
7. Change read node to `node3` and refresh.
8. Show the same row on `node3`.
9. Repeat with `teacher` to show routing to `node2`.
10. Repeat with `student` to show routing to `node3`.

## 15. Final Checklist

- server laptop and all 3 lab PCs are on same LAN
- server laptop can ping all 3 lab PCs
- PostgreSQL is installed on all 3 lab PCs
- `listen_addresses='*'` is set
- `pg_hba.conf` allows LAN access
- `lab_sync` exists on all 3 lab PCs
- schema exists on all 3 lab PCs
- publications exist on all 3 lab PCs
- subscriptions exist on all 3 lab PCs
- server laptop `.env` uses the 3 lab PC IPs
- portal opens on the server laptop at `http://localhost:8080`

## 16. Example Final Values

Example final values if you use the sample plan:

- `Server Laptop IP` -> `192.168.1.150`
- `NODE1_HOST` -> `192.168.1.101`
- `NODE2_HOST` -> `192.168.1.102`
- `NODE3_HOST` -> `192.168.1.103`
- laptop browser URL -> `http://localhost:8080`
- other PC browser URL -> `http://192.168.1.150:8080`
