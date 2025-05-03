-- Add image_url to products table
ALTER TABLE products
ADD COLUMN image_url TEXT;

-- Add logo_url to store table
ALTER TABLE store
ADD COLUMN logo_url TEXT;

-- Create product_reviews table
CREATE TABLE product_reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add payment method and status to sales table
ALTER TABLE sales
ADD COLUMN payment_method VARCHAR(50),
ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN tax DECIMAL(10,2) DEFAULT 0;

-- Add status to products table
ALTER TABLE products
ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Add last_updated_at to relevant tables
ALTER TABLE products
ADD COLUMN last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE sales
ADD COLUMN last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE purchases
ADD COLUMN last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES store(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add category_id to products table
ALTER TABLE products
ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL; 