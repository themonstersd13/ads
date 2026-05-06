-- Run on NODE 3 only.

CREATE SUBSCRIPTION node3_from_node1
CONNECTION 'host=192.168.1.101 port=5432 dbname=lab_sync user=postgres password=postgres'
PUBLICATION node1_pub
WITH (create_slot = true, enabled = true, copy_data = true);

CREATE SUBSCRIPTION node3_from_node2
CONNECTION 'host=192.168.1.102 port=5432 dbname=lab_sync user=postgres password=postgres'
PUBLICATION node2_pub
WITH (create_slot = true, enabled = true, copy_data = true);
