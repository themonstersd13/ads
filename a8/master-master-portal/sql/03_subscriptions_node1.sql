-- Run on NODE 1 only.
-- Replace host/user/password with real values.

CREATE SUBSCRIPTION node1_from_node2
CONNECTION 'host=10.40.3.3 port=5432 dbname=lab_sync user=postgres password=postgres'
PUBLICATION node2_pub
WITH (create_slot = true, enabled = true, copy_data = true);

CREATE SUBSCRIPTION node1_from_node3
CONNECTION 'host=10.40.3.3 port=5432 dbname=lab_sync user=postgres password=postgres'
PUBLICATION node3_pub
WITH (create_slot = true, enabled = true, copy_data = true);
