-- Trigger for supplier operations
CREATE OR REPLACE FUNCTION supplier_operation_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM handle_supplier_transaction(NEW.store_id, NEW.id, 'create', NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM handle_supplier_transaction(NEW.store_id, NEW.id, 'update', NEW.updated_by);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM handle_supplier_transaction(OLD.store_id, OLD.id, 'delete', OLD.updated_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplier_operation_trigger
AFTER INSERT OR UPDATE OR DELETE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION supplier_operation_trigger();

-- Trigger for purchase operations
CREATE OR REPLACE FUNCTION purchase_operation_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM handle_purchase_transaction(NEW.store_id, NEW.id, 'created', NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM handle_purchase_transaction(NEW.store_id, NEW.id, 'updated', NEW.updated_by);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM handle_purchase_transaction(OLD.store_id, OLD.id, 'deleted', OLD.updated_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_operation_trigger
AFTER INSERT OR UPDATE OR DELETE ON purchases
FOR EACH ROW
EXECUTE FUNCTION purchase_operation_trigger();

-- Trigger for sale operations
CREATE OR REPLACE FUNCTION sale_operation_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM handle_sale_transaction(NEW.store_id, NEW.id, 'created', NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM handle_sale_transaction(NEW.store_id, NEW.id, 'updated', NEW.updated_by);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM handle_sale_transaction(OLD.store_id, OLD.id, 'deleted', OLD.updated_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_operation_trigger
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW
EXECUTE FUNCTION sale_operation_trigger();

-- Trigger for purchase items
CREATE OR REPLACE FUNCTION purchase_item_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM handle_product_quantity_change(
            (SELECT store_id FROM purchases WHERE id = NEW.purchase_id),
            NEW.product_id,
            NEW.quantity,
            NEW.unit_price,
            'purchase_item_created',
            (SELECT created_by FROM purchases WHERE id = NEW.purchase_id),
            NEW.purchase_id,
            'Purchase item created'
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM handle_product_quantity_change(
            (SELECT store_id FROM purchases WHERE id = NEW.purchase_id),
            NEW.product_id,
            NEW.quantity - OLD.quantity,
            NEW.unit_price,
            'purchase_item_updated',
            (SELECT updated_by FROM purchases WHERE id = NEW.purchase_id),
            NEW.purchase_id,
            'Purchase item updated'
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM handle_product_quantity_change(
            (SELECT store_id FROM purchases WHERE id = OLD.purchase_id),
            OLD.product_id,
            -OLD.quantity,
            OLD.unit_price,
            'purchase_item_deleted',
            (SELECT updated_by FROM purchases WHERE id = OLD.purchase_id),
            OLD.purchase_id,
            'Purchase item deleted'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_item_trigger
AFTER INSERT OR UPDATE OR DELETE ON purchase_items
FOR EACH ROW
EXECUTE FUNCTION purchase_item_trigger();

-- Trigger for sale items
CREATE OR REPLACE FUNCTION sale_item_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM handle_product_quantity_change(
            (SELECT store_id FROM sales WHERE id = NEW.sales_id),
            NEW.product_id,
            -NEW.quantity,
            NEW.unit_price,
            'sale_item_created',
            (SELECT created_by FROM sales WHERE id = NEW.sales_id),
            NEW.sales_id,
            'Sale item created'
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM handle_product_quantity_change(
            (SELECT store_id FROM sales WHERE id = NEW.sales_id),
            NEW.product_id,
            OLD.quantity - NEW.quantity,
            NEW.unit_price,
            'sale_item_updated',
            (SELECT updated_by FROM sales WHERE id = NEW.sales_id),
            NEW.sales_id,
            'Sale item updated'
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM handle_product_quantity_change(
            (SELECT store_id FROM sales WHERE id = OLD.sales_id),
            OLD.product_id,
            OLD.quantity,
            OLD.unit_price,
            'sale_item_deleted',
            (SELECT updated_by FROM sales WHERE id = OLD.sales_id),
            OLD.sales_id,
            'Sale item deleted'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_item_trigger
AFTER INSERT OR UPDATE OR DELETE ON sales_items
FOR EACH ROW
EXECUTE FUNCTION sale_item_trigger(); 