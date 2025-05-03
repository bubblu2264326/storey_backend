-- Low stock view
CREATE OR REPLACE VIEW low_stock_view AS
SELECT 
    p.id,
    p.name,
    p.barcode,
    p.quantity,
    p.unit_price,
    s.name as store_name,
    s.id as store_id
FROM products p
JOIN store s ON p.store_id = s.id
WHERE p.quantity < 10;

-- Sales summary view
CREATE OR REPLACE VIEW sales_summary_view AS
SELECT 
    s.id as store_id,
    st.name as store_name,
    DATE(s.created_at) as sale_date,
    p.id as product_id,
    p.name as product_name,
    SUM(si.quantity) as total_quantity,
    SUM(si.quantity * si.unit_price) as total_amount
FROM sales s
JOIN sales_items si ON s.id = si.sales_id
JOIN products p ON si.product_id = p.id
JOIN store st ON s.store_id = st.id
GROUP BY s.id, st.name, DATE(s.created_at), p.id, p.name;

-- Inventory valuation view
CREATE OR REPLACE VIEW inventory_valuation_view AS
SELECT 
    p.store_id,
    s.name as store_name,
    p.id as product_id,
    p.name as product_name,
    p.quantity,
    p.unit_price,
    (p.quantity * p.unit_price) as total_value
FROM products p
JOIN store s ON p.store_id = s.id;

-- Product reviews summary view
CREATE OR REPLACE VIEW product_reviews_summary_view AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.store_id,
    s.name as store_name,
    COUNT(pr.id) as total_reviews,
    AVG(pr.rating) as average_rating,
    MIN(pr.rating) as min_rating,
    MAX(pr.rating) as max_rating
FROM products p
LEFT JOIN product_reviews pr ON p.id = pr.product_id
JOIN store s ON p.store_id = s.id
GROUP BY p.id, p.name, p.store_id, s.name; 