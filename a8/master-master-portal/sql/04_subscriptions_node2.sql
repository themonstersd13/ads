-- Run on NODE 2 only.

CREATE SUBSCRIPTION node2_from_node1
CONNECTION 'host=192.168.1.101 port=5432 dbname=lab_sync user=postgres password=postgres'
PUBLICATION node1_pub
WITH (create_slot = true, enabled = true, copy_data = true);

CREATE SUBSCRIPTION node2_from_node3
CONNECTION 'host=192.168.1.103 port=5432 dbname=lab_sync user=postgres password=postgres'
PUBLICATION node3_pub
WITH (create_slot = true, enabled = true, copy_data = true);
