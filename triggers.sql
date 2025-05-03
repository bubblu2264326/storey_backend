-- Trigger for sales_items insert
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease product quantity
    UPDATE products
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id;

    -- Log to inventory_transactions
    INSERT INTO inventory_transactions (
        store_id,
        product_id,
        type,
        quantity,
        unit_price,
        created_by,
        reference_id,
        notes
    )
    SELECT 
        s.store_id,
        NEW.product_id,
        'sale',
        -NEW.quantity,
        NEW.unit_price,
        s.created_by,
        NEW.sales_id,
        'Sale transaction'
    FROM sales s
    WHERE s.id = NEW.sales_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_items_insert_trigger
AFTER INSERT ON sales_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_sale();

-- Trigger for purchase_items insert
CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    -- Increase product quantity
    UPDATE products
    SET quantity = quantity + NEW.quantity
    WHERE id = NEW.product_id;

    -- Log to inventory_transactions
    INSERT INTO inventory_transactions (
        store_id,
        product_id,
        type,
        quantity,
        unit_price,
        created_by,
        reference_id,
        notes
    )
    SELECT 
        p.store_id,
        NEW.product_id,
        'purchase',
        NEW.quantity,
        NEW.unit_cost,
        p.created_by,
        NEW.purchase_id,
        'Purchase transaction'
    FROM purchases p
    WHERE p.id = NEW.purchase_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_items_insert_trigger
AFTER INSERT ON purchase_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_purchase();

-- Trigger for sales_items delete (reversal)
CREATE OR REPLACE FUNCTION reverse_stock_on_sale_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Increase product quantity
    UPDATE products
    SET quantity = quantity + OLD.quantity
    WHERE id = OLD.product_id;

    -- Log reversal to inventory_transactions
    INSERT INTO inventory_transactions (
        store_id,
        product_id,
        type,
        quantity,
        unit_price,
        created_by,
        reference_id,
        notes
    )
    SELECT 
        s.store_id,
        OLD.product_id,
        'sale_reversal',
        OLD.quantity,
        OLD.unit_price,
        s.created_by,
        OLD.sales_id,
        'Sale reversal transaction'
    FROM sales s
    WHERE s.id = OLD.sales_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_items_delete_trigger
AFTER DELETE ON sales_items
FOR EACH ROW
EXECUTE FUNCTION reverse_stock_on_sale_delete();

-- Trigger for purchase_items delete (reversal)
CREATE OR REPLACE FUNCTION reverse_stock_on_purchase_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease product quantity
    UPDATE products
    SET quantity = quantity - OLD.quantity
    WHERE id = OLD.product_id;

    -- Log reversal to inventory_transactions
    INSERT INTO inventory_transactions (
        store_id,
        product_id,
        type,
        quantity,
        unit_price,
        created_by,
        reference_id,
        notes
    )
    SELECT 
        p.store_id,
        OLD.product_id,
        'purchase_reversal',
        -OLD.quantity,
        OLD.unit_cost,
        p.created_by,
        OLD.purchase_id,
        'Purchase reversal transaction'
    FROM purchases p
    WHERE p.id = OLD.purchase_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_items_delete_trigger
AFTER DELETE ON purchase_items
FOR EACH ROW
EXECUTE FUNCTION reverse_stock_on_purchase_delete(); 