-- Изменение полей в таблице orders
ALTER TABLE orders
MODIFY COLUMN total DECIMAL(10, 2) NOT NULL,
MODIFY COLUMN delivery_address TEXT NULL,
MODIFY COLUMN phone VARCHAR(20) NULL,
ADD COLUMN payment_method VARCHAR(20) NULL AFTER status;

-- Обновление таблицы order_items
ALTER TABLE order_items
DROP COLUMN IF EXISTS product_name,
DROP COLUMN IF EXISTS product_image,
DROP COLUMN IF EXISTS description;

-- Добавление индексов для оптимизации запросов
ALTER TABLE orders
ADD INDEX idx_user_id (user_id),
ADD INDEX idx_created_at (created_at);

ALTER TABLE order_items
ADD INDEX idx_order_id (order_id),
ADD INDEX idx_product_id (product_id); 