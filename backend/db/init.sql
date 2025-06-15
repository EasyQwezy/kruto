-- Создание базы данных
CREATE DATABASE IF NOT EXISTS shop;
USE shop;

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы продуктов
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы изображений продуктов
CREATE TABLE IF NOT EXISTS product_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Создание таблицы заказов
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    delivery_address TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Создание таблицы товаров в заказе
CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Вставка тестовых данных
INSERT INTO users (id, username, email, password) VALUES
(4, 'test_user', 'test@example.com', 'password123');

INSERT INTO products (id, name, description, price) VALUES
(1, 'Тестовый продукт 1', 'Описание продукта 1', 100.00),
(2, 'Тестовый продукт 2', 'Описание продукта 2', 200.00);

INSERT INTO product_images (product_id, image_url) VALUES
(1, '/images/product1.jpg'),
(2, '/images/product2.jpg');

INSERT INTO orders (id, user_id, total, status, delivery_address, phone) VALUES
(1, 4, 300.00, 'pending', 'ул. Тестовая, 1', '+7 (999) 123-45-67');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 100.00),
(1, 2, 1, 200.00); 