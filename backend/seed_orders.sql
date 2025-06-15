-- Добавление тестовых заказов
INSERT INTO orders (user_id, created_at, status, payment_method, delivery_address, phone, subtotal, delivery_cost, total, comment)
VALUES 
    (4, NOW() - INTERVAL '2 days', 'delivered', 'card', 'ул. Примерная, 123', '+7 (999) 123-45-67', 2500, 300, 2800, 'Доставить до 18:00'),
    (4, NOW() - INTERVAL '1 day', 'processing', 'cash', 'ул. Примерная, 123', '+7 (999) 123-45-67', 3500, 300, 3800, NULL),
    (4, NOW(), 'pending', 'card', 'ул. Примерная, 123', '+7 (999) 123-45-67', 4500, 300, 4800, 'Позвонить перед доставкой');

-- Добавление товаров в заказы
INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, price, description)
VALUES 
    -- Товары для первого заказа
    (1, 1, 'Органические яблоки', 'images/placeholder.jpg', 2, 1250, 'Свежие органические яблоки из экологически чистого сада'),
    
    -- Товары для второго заказа
    (2, 2, 'Свежие овощи', 'images/placeholder.jpg', 1, 3500, 'Набор свежих сезонных овощей'),
    
    -- Товары для третьего заказа
    (3, 3, 'Фруктовый набор', 'images/placeholder.jpg', 1, 2500, 'Свежие фрукты в подарочной упаковке'),
    (3, 4, 'Органический мед', 'images/placeholder.jpg', 1, 2000, 'Натуральный мед с пасеки'); 