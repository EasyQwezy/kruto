const db = require('../db');

async function seedTestData() {
    try {
        // Создаем тестового пользователя
        const [userResult] = await db.query(
            'INSERT INTO users (name, email, phone, delivery_address) VALUES (?, ?, ?, ?)',
            ['Test User', 'test@example.com', '+7 (999) 123-45-67', 'Test Address']
        );
        const userId = userResult.insertId;
        console.log('Created test user with ID:', userId);

        // Создаем тестовый продукт
        const [productResult] = await db.query(
            'INSERT INTO products (name, price, description, images) VALUES (?, ?, ?, ?)',
            ['Test Product', 1000.00, 'Test Description', JSON.stringify(['test.jpg'])]
        );
        const productId = productResult.insertId;
        console.log('Created test product with ID:', productId);

        // Создаем тестовый заказ
        const [orderResult] = await db.query(
            'INSERT INTO orders (user_id, total, status, delivery_address, phone) VALUES (?, ?, ?, ?, ?)',
            [userId, 2000.00, 'pending', 'Test Address', '+7 (999) 123-45-67']
        );
        const orderId = orderResult.insertId;
        console.log('Created test order with ID:', orderId);

        // Добавляем товары в заказ
        await db.query(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [orderId, productId, 2, 1000.00]
        );
        console.log('Added items to test order');

        console.log('Test data seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding test data:', error);
        process.exit(1);
    }
}

seedTestData(); 