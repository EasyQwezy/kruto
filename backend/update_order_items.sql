-- Создаем временную таблицу с актуальной структурой
CREATE TABLE order_items_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Копируем данные из старой таблицы
INSERT INTO order_items_new (id, order_id, product_id, quantity, price, created_at)
SELECT id, order_id, product_id, quantity, price, created_at
FROM order_items;

-- Удаляем старую таблицу
DROP TABLE order_items;

-- Переименовываем новую таблицу
RENAME TABLE order_items_new TO order_items;

-- Создаем индексы
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id); 