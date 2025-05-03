-- Procedure to accept user request to join store
CREATE OR REPLACE PROCEDURE accept_user_request(
    p_user_id INTEGER,
    p_store_id INTEGER,
    p_role TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User does not exist';
    END IF;

    -- Check if store exists
    IF NOT EXISTS (SELECT 1 FROM store WHERE id = p_store_id) THEN
        RAISE EXCEPTION 'Store does not exist';
    END IF;

    -- Check if role is valid
    IF p_role NOT IN ('admin', 'manager', 'staff') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;

    -- Insert user into store
    INSERT INTO user_store (user_id, store_id, role)
    VALUES (p_user_id, p_store_id, p_role);

    COMMIT;
END;
$$;

-- Procedure to generate sales report
CREATE OR REPLACE PROCEDURE generate_sales_report(
    p_store_id INTEGER,
    p_start_date DATE,
    p_end_date DATE,
    INOUT result REFCURSOR
)
LANGUAGE plpgsql
AS $$
BEGIN
    OPEN result FOR
    SELECT 
        DATE(s.created_at) as sale_date,
        p.name as product_name,
        SUM(si.quantity) as total_quantity,
        SUM(si.quantity * si.unit_price) as total_amount
    FROM sales s
    JOIN sales_items si ON s.id = si.sales_id
    JOIN products p ON si.product_id = p.id
    WHERE s.store_id = p_store_id
    AND DATE(s.created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(s.created_at), p.name
    ORDER BY DATE(s.created_at) DESC;
END;
$$;

-- Procedure to generate inventory report
CREATE OR REPLACE PROCEDURE generate_inventory_report(
    p_store_id INTEGER,
    INOUT result REFCURSOR
)
LANGUAGE plpgsql
AS $$
BEGIN
    OPEN result FOR
    SELECT 
        p.name as product_name,
        p.quantity,
        p.unit_price,
        (p.quantity * p.unit_price) as total_value,
        CASE 
            WHEN p.quantity < 10 THEN 'Low Stock'
            WHEN p.quantity = 0 THEN 'Out of Stock'
            ELSE 'In Stock'
        END as stock_status
    FROM products p
    WHERE p.store_id = p_store_id
    ORDER BY p.name;
END;
$$;

-- Procedure to update user role
CREATE OR REPLACE PROCEDURE update_user_role(
    p_user_id INTEGER,
    p_store_id INTEGER,
    p_new_role TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user exists in store
    IF NOT EXISTS (
        SELECT 1 
        FROM user_store 
        WHERE user_id = p_user_id 
        AND store_id = p_store_id
    ) THEN
        RAISE EXCEPTION 'User is not associated with this store';
    END IF;

    -- Check if role is valid
    IF p_new_role NOT IN ('admin', 'manager', 'staff') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;

    -- Update role
    UPDATE user_store
    SET role = p_new_role
    WHERE user_id = p_user_id
    AND store_id = p_store_id;

    COMMIT;
END;
$$; 