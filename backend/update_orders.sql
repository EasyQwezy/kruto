-- Проверяем существование таблицы orders
DROP TABLE IF EXISTS orders_new;

-- Создаем новую таблицу orders с правильной структурой
CREATE TABLE orders_new (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Создаем индексы
CREATE INDEX idx_orders_user_id ON orders_new(user_id);
CREATE INDEX idx_orders_status ON orders_new(status);

-- Копируем данные из старой таблицы, если она существует
INSERT INTO orders_new (id, user_id, total, status, created_at)
SELECT id, user_id, total, status, created_at
FROM orders;

-- Удаляем старую таблицу
DROP TABLE IF EXISTS orders;

-- Переименовываем новую таблицу
RENAME TABLE orders_new TO orders;

-- Проверяем структуру таблицы order_items
DROP TABLE IF EXISTS order_items_new;

-- Создаем новую таблицу order_items с правильной структурой
CREATE TABLE order_items_new (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Создаем индексы
CREATE INDEX idx_order_items_order_id ON order_items_new(order_id);
CREATE INDEX idx_order_items_product_id ON order_items_new(product_id);

-- Копируем данные из старой таблицы, если она существует
INSERT INTO order_items_new (id, order_id, product_id, quantity, price, created_at)
SELECT id, order_id, product_id, quantity, price, created_at
FROM order_items;

-- Удаляем старую таблицу
DROP TABLE IF EXISTS order_items;

-- Переименовываем новую таблицу
RENAME TABLE order_items_new TO order_items; 