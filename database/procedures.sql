-- Procedure to record inventory transactions
CREATE OR REPLACE FUNCTION record_inventory_transaction(
    p_store_id INTEGER,
    p_type VARCHAR(50),
    p_created_by INTEGER,
    p_notes TEXT,
    p_product_id INTEGER DEFAULT NULL,
    p_quantity INTEGER DEFAULT NULL,
    p_unit_price DECIMAL(10,2) DEFAULT NULL,
    p_reference_id INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO inventory_transactions (
        store_id,
        product_id,
        type,
        quantity,
        unit_price,
        created_by,
        reference_id,
        notes,
        created_at
    ) VALUES (
        p_store_id,
        p_product_id,
        p_type,
        p_quantity,
        p_unit_price,
        p_created_by,
        p_reference_id,
        p_notes,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Procedure to handle supplier-related transactions
CREATE OR REPLACE FUNCTION handle_supplier_transaction(
    p_store_id INTEGER,
    p_supplier_id INTEGER,
    p_action VARCHAR(20),
    p_user_id INTEGER
) RETURNS VOID AS $$
DECLARE
    v_supplier_name VARCHAR(100);
BEGIN
    -- Get supplier name
    SELECT name INTO v_supplier_name
    FROM suppliers
    WHERE id = p_supplier_id AND store_id = p_store_id;

    IF v_supplier_name IS NULL THEN
        RAISE EXCEPTION 'Supplier not found';
    END IF;

    -- Record transaction based on action
    CASE p_action
        WHEN 'create' THEN
            PERFORM record_inventory_transaction(
                p_store_id,
                'supplier_created',
                p_user_id,
                'Supplier ' || v_supplier_name || ' created'
            );
        WHEN 'update' THEN
            PERFORM record_inventory_transaction(
                p_store_id,
                'supplier_updated',
                p_user_id,
                'Supplier ' || v_supplier_name || ' updated'
            );
        WHEN 'delete' THEN
            PERFORM record_inventory_transaction(
                p_store_id,
                'supplier_deleted',
                p_user_id,
                'Supplier ' || v_supplier_name || ' deleted'
            );
        ELSE
            RAISE EXCEPTION 'Invalid action: %', p_action;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Procedure to handle product quantity changes
CREATE OR REPLACE FUNCTION handle_product_quantity_change(
    p_store_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER,
    p_unit_price DECIMAL(10,2),
    p_type VARCHAR(50),
    p_user_id INTEGER,
    p_reference_id INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_product_name VARCHAR(100);
BEGIN
    -- Get product name
    SELECT name INTO v_product_name
    FROM products
    WHERE id = p_product_id AND store_id = p_store_id;

    IF v_product_name IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    -- Record the transaction
    PERFORM record_inventory_transaction(
        p_store_id,
        p_type,
        p_user_id,
        COALESCE(p_notes, 'Product ' || v_product_name || ' quantity changed by ' || p_quantity),
        p_product_id,
        p_quantity,
        p_unit_price,
        p_reference_id
    );
END;
$$ LANGUAGE plpgsql;

-- Procedure to handle purchase transactions
CREATE OR REPLACE FUNCTION handle_purchase_transaction(
    p_store_id INTEGER,
    p_purchase_id INTEGER,
    p_action VARCHAR(20),
    p_user_id INTEGER
) RETURNS VOID AS $$
DECLARE
    v_supplier_name VARCHAR(100);
    v_purchase_items RECORD;
BEGIN
    -- Get supplier name
    SELECT s.name INTO v_supplier_name
    FROM purchases p
    JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id = p_purchase_id AND p.store_id = p_store_id;

    IF v_supplier_name IS NULL THEN
        RAISE EXCEPTION 'Purchase not found';
    END IF;

    -- Record main purchase transaction
    PERFORM record_inventory_transaction(
        p_store_id,
        'purchase_' || p_action,
        p_user_id,
        'Purchase from ' || v_supplier_name || ' ' || p_action
    );

    -- Record individual product transactions
    FOR v_purchase_items IN
        SELECT pi.product_id, pi.quantity, pi.unit_price
        FROM purchase_items pi
        WHERE pi.purchase_id = p_purchase_id
    LOOP
        PERFORM handle_product_quantity_change(
            p_store_id,
            v_purchase_items.product_id,
            v_purchase_items.quantity,
            v_purchase_items.unit_price,
            'purchase_' || p_action,
            p_user_id,
            p_purchase_id,
            'Purchase item from ' || v_supplier_name
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Procedure to handle sale transactions
CREATE OR REPLACE FUNCTION handle_sale_transaction(
    p_store_id INTEGER,
    p_sale_id INTEGER,
    p_action VARCHAR(20),
    p_user_id INTEGER
) RETURNS VOID AS $$
DECLARE
    v_sale_items RECORD;
BEGIN
    -- Record main sale transaction
    PERFORM record_inventory_transaction(
        p_store_id,
        'sale_' || p_action,
        p_user_id,
        'Sale ' || p_action
    );

    -- Record individual product transactions
    FOR v_sale_items IN
        SELECT si.product_id, si.quantity, si.unit_price
        FROM sales_items si
        WHERE si.sales_id = p_sale_id
    LOOP
        PERFORM handle_product_quantity_change(
            p_store_id,
            v_sale_items.product_id,
            -v_sale_items.quantity, -- Negative quantity for sales
            v_sale_items.unit_price,
            'sale_' || p_action,
            p_user_id,
            p_sale_id,
            'Sale item'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql; 