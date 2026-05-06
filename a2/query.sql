CREATE TABLE test_table ( 
    RecordNumber NUMERIC(3), 
    CurrentDate DATE 
);

CREATE OR REPLACE PROCEDURE insert_test_records() 
LANGUAGE plpgsql 
AS $$ 
BEGIN 
    FOR i IN 1..50 LOOP 
        INSERT INTO test_table 
        VALUES (i, CURRENT_DATE); 
    END LOOP; 
END; 
$$;

CALL insert_test_records(); 
 
SELECT * FROM test_table;

CREATE TABLE products ( 
    ProductID NUMERIC(4), 
    category CHAR(3), 
    detail VARCHAR(30), 
    price NUMERIC(10,2), 
    stock NUMERIC(5) 
);

INSERT INTO products VALUES 
(101, 'ELC', 'Electric Kettle', 1500, 20), 
(102, 'ELC', 'Iron Box', 2200, 15), 
(103, 'FUR', 'Office Chair', 4500, 10), 
(104, 'FUR', 'Study Table', 8000, 5), 
(105, 'ELC', 'Mixer Grinder', 3500, 8);

CREATE OR REPLACE PROCEDURE update_price(X NUMERIC, Y CHAR) 
LANGUAGE plpgsql 
AS $$ 
BEGIN 
    UPDATE products 
    SET price = price + (price * X / 100) 
    WHERE category = Y; 
END; 
$$;

CALL update_price(10, 'ELC');

SELECT * FROM products;

CREATE TYPE name_type AS ( 
    name VARCHAR(50) 
);

CREATE OR REPLACE FUNCTION countNoOfWords(n VARCHAR) 
RETURNS INTEGER 
LANGUAGE plpgsql 
AS $$ 
BEGIN 
    RETURN array_length(string_to_array(trim(n), ' '), 1); 
END; 
$$;

CREATE TABLE name_table OF name_type;

INSERT INTO name_table VALUES
('Saurabh Doiphode'),
('Advanced Database System'),
('PostgreSQL Object Relational Model');

SELECT name, countNoOfWords(name) AS Word_Count 
FROM name_table;

CREATE TYPE address_type AS ( 
    address VARCHAR(100), 
    city VARCHAR(30), 
    state VARCHAR(30), 
    pincode VARCHAR(10) 
);

CREATE TABLE address_table OF address_type;

INSERT INTO address_table VALUES 
('MG Road Pune', 'Pune', 'Maharashtra', '411001'), 
('Station Road Mumbai', 'Mumbai', 'Maharashtra', '400001'), 
('Ring Road Delhi', 'Delhi', 'Delhi', '110001');

CREATE OR REPLACE FUNCTION extract_address(keyword VARCHAR) 
RETURNS TABLE(result_address VARCHAR) 
LANGUAGE plpgsql 
AS $$ 
BEGIN 
    RETURN QUERY 
    SELECT a.address 
    FROM address_table a 
    WHERE a.address ILIKE '%' || keyword || '%'; 
END; 
$$;

SELECT * FROM extract_address('Road');

CREATE OR REPLACE FUNCTION count_words_field( 
    field_name TEXT, 
    addr address_type 
) 
RETURNS INTEGER 
LANGUAGE plpgsql 
AS $$ 
DECLARE 
    value TEXT; 
BEGIN 
    IF field_name = 'address' THEN 
        value := addr.address; 
    ELSIF field_name = 'city' THEN 
        value := addr.city; 
    ELSIF field_name = 'state' THEN 
        value := addr.state; 
    ELSIF field_name = 'pincode' THEN 
        value := addr.pincode; 
    END IF; 
 
    RETURN array_length(string_to_array(trim(value), ' '), 1); 
END; 
$$;

SELECT address, 
count_words_field('address', address_table) AS word_count 
FROM address_table;

CREATE TYPE course_Type AS ( 
    course_id VARCHAR(10), 
    description VARCHAR(50) 
);

CREATE TABLE course_table OF course_Type; 

INSERT INTO course_table VALUES 
('CS101', 'Database Management Systems'), 
('CS202', 'Advanced Database Systems'), 
('CS303', 'Artificial Intelligence');

SELECT * FROM course_table;