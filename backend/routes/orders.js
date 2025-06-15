const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Middleware для логирования запросов
const requestLogger = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    next();
};

router.use(requestLogger);

// Получение списка заказов пользователя
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [orders] = await db.query(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json({
            success: true,
            data: {
                orders: orders,
                pagination: {
                    total: orders.length,
                    per_page: 10,
                    current_page: 1,
                    total_pages: Math.ceil(orders.length / 10)
                }
            }
        });
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении заказов',
            details: error.message
        });
    }
});

// Получение деталей заказа
router.get('/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const [orderDetails] = await db.query(
            'SELECT * FROM order_details WHERE order_id = ?',
            [orderId]
        );
        res.json({
            success: true,
            data: {
                order: orderDetails
            }
        });
    } catch (error) {
        console.error('Ошибка при получении деталей заказа:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении деталей заказа',
            details: error.message
        });
    }
});

// Получение истории заказов пользователя с пагинацией
router.get('/history', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Не указан ID пользователя'
            });
        }

        // Получаем общее количество заказов
        const [[countResult]] = await db.query(
            'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
            [userId]
        );

        // Получаем заказы с информацией о товарах и оплате
        const [orders] = await db.query(`
            SELECT 
                o.*,
                DATE_FORMAT(o.created_at, '%d.%m.%Y %H:%i') as formatted_date,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', oi.id,
                        'product_id', oi.product_id,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'product', JSON_OBJECT(
                            'id', p.id,
                            'name', p.name,
                            'image', p.image,
                            'price', p.price
                        )
                    )
                ) as items,
                (
                    SELECT JSON_OBJECT(
                        'method', pm.method,
                        'amount', pm.amount,
                        'status', pm.status,
                        'transaction_id', pm.transaction_id
                    )
                    FROM payments pm
                    WHERE pm.order_id = o.id
                    LIMIT 1
                ) as payment
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);

        // Обрабатываем результаты
        const processedOrders = orders.map(order => {
            // Если items равен null (нет товаров), заменяем на пустой массив
            const items = order.items === null ? [] : JSON.parse(order.items);
            // Если payment равен null, заменяем на null
            const payment = order.payment === null ? null : JSON.parse(order.payment);
            
            return {
                ...order,
                items,
                payment,
                formatted_date: order.formatted_date
            };
        });

        res.json({
            success: true,
            data: {
                orders: processedOrders,
                pagination: {
                    page,
                    limit,
                    total: countResult.total,
                    totalPages: Math.ceil(countResult.total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при загрузке истории заказов'
        });
    }
});

// Создание нового заказа
router.post('/', async (req, res) => {
    console.log('Received order data:', JSON.stringify(req.body, null, 2));
    
    const { user_id, total, items } = req.body;

    // Валидация входных данных
    if (!user_id || !total || !items || !Array.isArray(items) || items.length === 0) {
        console.error('Invalid order data:', { user_id, total, items });
        return res.status(400).json({
            success: false,
            message: 'Неверные данные заказа. Требуются: user_id, total и массив items'
        });
    }

    // Начинаем транзакцию
    let connection;
    try {
        console.log('Getting database connection...');
        connection = await db.getConnection();
        console.log('Starting transaction...');
        await connection.beginTransaction();

        // Создаем заказ
        console.log('Creating order with data:', { user_id, total });
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
            [user_id, total, 'pending']
        );

        const orderId = orderResult.insertId;
        console.log('Created order with ID:', orderId);

        // Добавляем товары в заказ
        console.log('Adding items to order:', items);
        for (const item of items) {
            console.log('Processing item:', item);
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
        }

        // Подтверждаем транзакцию
        console.log('Committing transaction...');
        await connection.commit();
        console.log('Order created successfully');

        res.json({
            success: true,
            message: 'Заказ успешно создан',
            order_id: orderId
        });

    } catch (error) {
        // Откатываем транзакцию в случае ошибки
        if (connection) {
            console.log('Rolling back transaction due to error...');
            await connection.rollback();
        }
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании заказа: ' + error.message
        });
    } finally {
        if (connection) {
            console.log('Releasing database connection...');
            connection.release();
        }
    }
});

// Отмена заказа
router.put('/:orderId/cancel', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { orderId } = req.params;
        
        await connection.beginTransaction();
        
        // Проверяем статус заказа
        const [orderResult] = await connection.query(
            'SELECT status FROM orders WHERE id = ?',
            [orderId]
        );

        if (orderResult.length === 0) {
            throw new Error('Заказ не найден');
        }

        if (orderResult[0].status !== 'pending') {
            throw new Error('Можно отменить только ожидающий заказ');
        }

        // Отменяем заказ
        await connection.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            ['cancelled', orderId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Заказ успешно отменен'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Ошибка при отмене заказа:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Ошибка при отмене заказа'
        });
    } finally {
        connection.release();
    }
});

module.exports = router; 