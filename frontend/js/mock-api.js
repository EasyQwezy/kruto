// Mock данные для тестирования
const mockOrders = [
    {
        id: 1,
        user_id: 4,
        created_at: '2024-03-15T10:30:00',
        status: 'pending',
        payment_method: 'card',
        delivery_address: 'ул. Примерная, 123',
        phone: '+7 (999) 123-45-67',
        subtotal: 2500,
        delivery_cost: 300,
        total: 2800,
        items: [
            {
                product_id: 1,
                product_name: 'Органические яблоки',
                product_image: 'images/placeholder.jpg',
                quantity: 2,
                price: 1250,
                description: 'Свежие органические яблоки из экологически чистого сада'
            }
        ]
    },
    {
        id: 2,
        user_id: 4,
        created_at: '2024-03-14T15:45:00',
        status: 'delivered',
        payment_method: 'cash',
        delivery_address: 'ул. Примерная, 123',
        phone: '+7 (999) 123-45-67',
        subtotal: 3500,
        delivery_cost: 300,
        total: 3800,
        items: [
            {
                product_id: 2,
                product_name: 'Свежие овощи',
                product_image: 'images/placeholder.jpg',
                quantity: 1,
                price: 3500,
                description: 'Набор свежих сезонных овощей'
            }
        ]
    },
    {
        id: 3,
        user_id: 4,
        created_at: '2024-03-13T09:15:00',
        status: 'processing',
        payment_method: 'card',
        delivery_address: 'ул. Примерная, 123',
        phone: '+7 (999) 123-45-67',
        subtotal: 4500,
        delivery_cost: 300,
        total: 4800,
        items: [
            {
                product_id: 3,
                product_name: 'Фруктовый набор',
                product_image: 'images/placeholder.jpg',
                quantity: 1,
                price: 2500,
                description: 'Свежие фрукты в подарочной упаковке'
            },
            {
                product_id: 4,
                product_name: 'Органический мед',
                product_image: 'images/placeholder.jpg',
                quantity: 1,
                price: 2000,
                description: 'Натуральный мед с пасеки'
            }
        ]
    }
];

// Mock API для работы с заказами
export const mockApi = {
    // Получение списка заказов
    async getOrders(userId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(mockOrders.filter(order => order.user_id === userId));
            }, 500); // Имитация задержки сети
        });
    },

    // Получение деталей заказа
    async getOrderDetails(orderId) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const order = mockOrders.find(o => o.id === orderId);
                if (order) {
                    resolve(order);
                } else {
                    reject(new Error('Заказ не найден'));
                }
            }, 500);
        });
    },

    // Отмена заказа
    async cancelOrder(orderId) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const order = mockOrders.find(o => o.id === orderId);
                if (order && order.status === 'pending') {
                    order.status = 'cancelled';
                    resolve(order);
                } else {
                    reject(new Error('Заказ не может быть отменен'));
                }
            }, 500);
        });
    }
}; 