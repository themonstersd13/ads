#!/usr/bin/env bash
set -euo pipefail

for node_name in node1 node2 node3; do
  pg_ctlcluster 16 "$node_name" stop || true
done

echo "WSL PostgreSQL clusters stopped."
