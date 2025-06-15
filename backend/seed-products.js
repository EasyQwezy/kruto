const db = require('./db');

async function seedProducts() {
    try {
        // Начинаем транзакцию
        await db.query('START TRANSACTION');

        // Добавляем тестовые товары
        const products = [
            {
                name: 'Свежие яблоки',
                price: 150.00,
                description: 'Свежие яблоки из местного сада. Сладкие и сочные.',
                show_on_homepage: true,
                images: JSON.stringify(['/uploads/products/apples.jpg'])
            },
            {
                name: 'Органические помидоры',
                price: 200.00,
                description: 'Органические помидоры, выращенные без химикатов.',
                show_on_homepage: true,
                images: JSON.stringify(['/uploads/products/tomatoes.jpg'])
            },
            {
                name: 'Свежая зелень',
                price: 100.00,
                description: 'Свежая зелень: укроп, петрушка, базилик.',
                show_on_homepage: true,
                images: JSON.stringify(['/uploads/products/greens.jpg'])
            }
        ];

        for (const product of products) {
            await db.query(
                'INSERT INTO products (name, price, description, show_on_homepage, images) VALUES (?, ?, ?, ?, ?)',
                [product.name, product.price, product.description, product.show_on_homepage, product.images]
            );
        }

        // Подтверждаем транзакцию
        await db.query('COMMIT');
        console.log('Тестовые товары успешно добавлены');
    } catch (error) {
        // В случае ошибки откатываем транзакцию
        await db.query('ROLLBACK');
        console.error('Ошибка при добавлении тестовых товаров:', error);
    } finally {
        process.exit();
    }
}

// Запускаем скрипт
seedProducts(); 