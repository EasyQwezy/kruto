-- Создание таблицы заказов
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    delivery_address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Создание таблицы товаров в заказе
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Создание представления для деталей заказа
CREATE OR REPLACE VIEW order_details AS
SELECT 
    o.id as order_id,
    o.user_id,
    o.status,
    o.total_amount,
    o.payment_method,
    o.delivery_address,
    o.phone,
    o.comment,
    o.created_at,
    oi.product_id,
    p.name as product_name,
    p.image_url,
    oi.quantity,
    oi.price
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id;

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Триггер для автоматического обновления total в заказе
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET total_amount = total_amount + delivery_cost
    WHERE id = NEW.order_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_total_trigger
AFTER INSERT OR UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_total();

-- Триггер для проверки статуса заказа при отмене
CREATE OR REPLACE FUNCTION check_order_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'pending' THEN
        RAISE EXCEPTION 'Можно отменить только заказы в статусе "Ожидает подтверждения"';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_order_cancellation_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION check_order_cancellation();

-- Функция для создания нового заказа
CREATE OR REPLACE FUNCTION create_order(
    p_user_id INTEGER,
    p_payment_method VARCHAR(20),
    p_delivery_address TEXT,
    p_phone VARCHAR(20),
    p_subtotal DECIMAL(10,2),
    p_delivery_cost DECIMAL(10,2),
    p_comment TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_order_id INTEGER;
BEGIN
    INSERT INTO orders (
        user_id,
        payment_method,
        delivery_address,
        phone,
        total_amount,
        delivery_cost,
        comment
    ) VALUES (
        p_user_id,
        p_payment_method,
        p_delivery_address,
        p_phone,
        p_subtotal,
        p_delivery_cost,
        p_comment
    ) RETURNING id INTO v_order_id;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для добавления товара в заказ
CREATE OR REPLACE FUNCTION add_order_item(
    p_order_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER,
    p_price DECIMAL(10,2)
) RETURNS INTEGER AS $$
DECLARE
    v_product_name VARCHAR(255);
    v_product_image VARCHAR(255);
    v_product_description TEXT;
    v_item_id INTEGER;
BEGIN
    -- Получаем информацию о продукте
    SELECT name, image, description
    INTO v_product_name, v_product_image, v_product_description
    FROM products
    WHERE id = p_product_id;
    
    -- Добавляем товар в заказ
    INSERT INTO order_items (
        order_id,
        product_id,
        quantity,
        price
    ) VALUES (
        p_order_id,
        p_product_id,
        p_quantity,
        p_price
    ) RETURNING id INTO v_item_id;
    
    RETURN v_item_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для отмены заказа
CREATE OR REPLACE FUNCTION cancel_order(p_order_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE orders
    SET status = 'cancelled'
    WHERE id = p_order_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения заказов пользователя
CREATE OR REPLACE FUNCTION get_user_orders(p_user_id INTEGER)
RETURNS SETOF order_details AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM order_details
    WHERE user_id = p_user_id
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql; 