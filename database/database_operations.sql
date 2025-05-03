-- Views
CREATE VIEW product_inventory_view AS
SELECT 
    p.product_id,
    p.product_name,
    p.price,
    p.quantity,
    s.store_name,
    p.store_id
FROM products p
JOIN stores s ON p.store_id = s.store_id;

-- Triggers
CREATE OR REPLACE FUNCTION update_product_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE products 
        SET quantity = quantity - NEW.quantity
        WHERE product_id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_sale_update
AFTER INSERT ON sales_items
FOR EACH ROW
EXECUTE FUNCTION update_product_quantity();