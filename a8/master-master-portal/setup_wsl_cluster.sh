#!/usr/bin/env bash
set -euo pipefail

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name"
    exit 1
  fi
}

require_command pg_createcluster
require_command pg_ctlcluster
require_command pg_lsclusters
require_command runuser

create_cluster_if_missing() {
  local name="$1"
  local port="$2"
  if ! pg_lsclusters | awk 'NR>1 {print $2}' | grep -qx "$name"; then
    pg_createcluster 16 "$name" -p "$port"
  fi
}

ensure_postgres_setting() {
  local conf_file="$1"
  local key="$2"
  local value="$3"
  if grep -q "^${key}[[:space:]]*=" "$conf_file"; then
    sed -i "s#^${key}[[:space:]]*=.*#${key} = ${value}#" "$conf_file"
  else
    echo "${key} = ${value}" >> "$conf_file"
  fi
}

ensure_hba_line() {
  local hba_file="$1"
  local line="$2"
  grep -qxF "$line" "$hba_file" || echo "$line" >> "$hba_file"
}

ensure_database() {
  local port="$1"
  local db_name="$2"
  if ! runuser -u postgres -- psql -p "$port" -tAc "SELECT 1 FROM pg_database WHERE datname='${db_name}'" | grep -q 1; then
    runuser -u postgres -- createdb -p "$port" "$db_name"
  fi
}

ensure_publication() {
  local port="$1"
  local publication_name="$2"
  if ! runuser -u postgres -- psql -p "$port" -d lab_sync -tAc "SELECT 1 FROM pg_publication WHERE pubname='${publication_name}'" | grep -q 1; then
    runuser -u postgres -- psql -p "$port" -d lab_sync -c "CREATE PUBLICATION ${publication_name} FOR TABLE student_records;"
  fi
}

ensure_subscription() {
  local port="$1"
  local subscription_name="$2"
  local publisher_port="$3"
  local publication_name="$4"

  if runuser -u postgres -- psql -p "$port" -d lab_sync -tAc "SELECT 1 FROM pg_subscription WHERE subname='${subscription_name}'" | grep -q 1; then
    return
  fi

  runuser -u postgres -- psql -p "$port" -d lab_sync <<SQL
CREATE SUBSCRIPTION ${subscription_name}
CONNECTION 'host=127.0.0.1 port=${publisher_port} dbname=lab_sync user=postgres password=postgres'
PUBLICATION ${publication_name}
WITH (create_slot = true, enabled = true, copy_data = false);
SQL
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCRIPT_DIR}/sql/01_schema.sql"

create_cluster_if_missing node1 5433
create_cluster_if_missing node2 5434
create_cluster_if_missing node3 5435

for node_name in node1 node2 node3; do
  conf_file="/etc/postgresql/16/${node_name}/postgresql.conf"
  hba_file="/etc/postgresql/16/${node_name}/pg_hba.conf"

  ensure_postgres_setting "$conf_file" "listen_addresses" "'*'"
  ensure_postgres_setting "$conf_file" "wal_level" "logical"
  ensure_postgres_setting "$conf_file" "max_wal_senders" "20"
  ensure_postgres_setting "$conf_file" "max_replication_slots" "20"

  ensure_hba_line "$hba_file" "host all all 127.0.0.1/32 md5"
  ensure_hba_line "$hba_file" "host all all ::1/128 md5"
  ensure_hba_line "$hba_file" "host replication all 127.0.0.1/32 md5"
  ensure_hba_line "$hba_file" "host replication all ::1/128 md5"
done

for node_name in node1 node2 node3; do
  pg_ctlcluster 16 "$node_name" restart
done

for port in 5433 5434 5435; do
  runuser -u postgres -- psql -p "$port" -c "ALTER USER postgres WITH PASSWORD 'postgres';"
  ensure_database "$port" "lab_sync"
  runuser -u postgres -- psql -p "$port" -d lab_sync -f "$SCHEMA_FILE"
done

ensure_publication 5433 node1_pub
ensure_publication 5434 node2_pub
ensure_publication 5435 node3_pub

ensure_subscription 5433 node1_from_node2 5434 node2_pub
ensure_subscription 5433 node1_from_node3 5435 node3_pub
ensure_subscription 5434 node2_from_node1 5433 node1_pub
ensure_subscription 5434 node2_from_node3 5435 node3_pub
ensure_subscription 5435 node3_from_node1 5433 node1_pub
ensure_subscription 5435 node3_from_node2 5434 node2_pub

echo
echo "WSL master-master cluster is ready."
echo "node1 -> localhost:5433"
echo "node2 -> localhost:5434"
echo "node3 -> localhost:5435"
echo
runuser -u postgres -- psql -p 5433 -d lab_sync -c "SELECT subname, status FROM pg_stat_subscription;"
