require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const db = require('./db');
const productsRouter = require('./api/products');
const homepageRouter = require('./routes/homepage');
const authRouter = require('./api/auth');
const fs = require('fs');
const multer = require('multer');
const orderRoutes = require('./routes/orders');

const app = express();
const port = process.env.PORT || 3000;

// Получаем список разрешенных источников из переменной окружения
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:5500').split(',');

// Создаем директорию для загрузок, если она не существует
const uploadDir = path.join(__dirname, 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
console.log('Upload directory:', uploadDir);

// Настройка CORS
app.use(cors({
    origin: function(origin, callback) {
        // Разрешаем запросы без origin (например, от мобильных приложений)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            console.warn(`Origin ${origin} not allowed by CORS`);
            return callback(new Error('Not allowed by CORS'), false);
        }
        return callback(null, true);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-user-id', 'authorization']
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Настройка статических файлов
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Подключаем маршруты
app.use('/api/products', productsRouter);
app.use('/api/homepage', homepageRouter);
app.use('/api/auth', authRouter);

// Добавляем логирование для маршрутов заказов
app.use('/api/orders', (req, res, next) => {
    console.log('\n=== Orders Route Request ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    console.log('===========================\n');
    next();
}, orderRoutes);

// Добавляем обработку ошибок
app.use((err, req, res, next) => {
    console.error('\n=== Error in Orders Route ===');
    console.error('Error:', err);
    console.error('Request:', {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        headers: req.headers
    });
    console.error('===========================\n');
    
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});

// Настройка Multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Тестовый маршрут для проверки работы сервера
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// API: Создать заказ (и добавить позиции заказа)
app.post('/api/orders', (req, res) => {
  const { user_id, items, total } = req.body;
  
  console.log('Received order data:', {
    user_id,
    total,
    items
  });

  // Валидация данных
  if (!user_id || !total) {
    return res.status(400).json({
      success: false,
      error: 'Отсутствуют обязательные поля'
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Заказ должен содержать хотя бы один товар'
    });
  }
  
  // Начинаем транзакцию
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({error: err.message});
    }

    // Создаем заказ
    db.query(
      'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
      [user_id, total, 'pending'],
      (err, result) => {
        if (err) {
          console.error('Error creating order:', err);
          return db.rollback(() => {
            res.status(500).json({error: err.message});
          });
        }

        const orderId = result.insertId;
        console.log('Created order with ID:', orderId);

        // Добавляем позиции заказа
        const orderItems = items.map(item => [orderId, item.product_id, item.quantity, item.price]);
        db.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?',
          [orderItems],
          (err) => {
            if (err) {
              console.error('Error adding order items:', err);
              return db.rollback(() => {
                res.status(500).json({error: err.message});
              });
            }

            // Если все успешно, подтверждаем транзакцию
            db.commit(err => {
              if (err) {
                console.error('Error committing transaction:', err);
                return db.rollback(() => {
                  res.status(500).json({error: err.message});
                });
              }
              res.json({ 
                success: true,
                order_id: orderId,
                message: 'Заказ успешно создан'
              });
            });
          }
        );
      }
    );
  });
});

// API: Получить позиции заказа
app.get('/api/order_items/:order_id', (req, res) => {
  db.query(
    `SELECT oi.*, p.name as product_name, p.images
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [req.params.order_id],
    (err, results) => {
      if (err) return res.status(500).json({error: err.message});
      res.json(results);
    }
  );
});

// API: Получить заказы пользователя (перемещен в конец)
app.get('/api/orders/:user_id', (req, res) => {
  console.log('\n=== Getting orders for user ===');
  console.log('User ID:', req.params.user_id);
  
  db.query(
    `SELECT o.*, 
     GROUP_CONCAT(
       JSON_OBJECT(
         'product_id', oi.product_id,
         'quantity', oi.quantity,
         'price', oi.price
       )
     ) as items
     FROM orders o
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = ?
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [req.params.user_id],
    (err, results) => {
      if (err) {
        console.error('Error fetching orders:', err);
        return res.status(500).json({error: err.message});
      }
      
      console.log('Found orders:', results.length);
      
      // Преобразуем строку items в массив объектов
      results = results.map(order => ({
        ...order,
        items: order.items ? JSON.parse(`[${order.items}]`) : []
      }));
      
      res.json(results);
    }
  );
});

// API: Добавить платеж
app.post('/api/payments', (req, res) => {
  const { order_id, amount, method, transaction_id, status } = req.body;
  db.query(
    'INSERT INTO payments (order_id, amount, method, transaction_id, status) VALUES (?, ?, ?, ?, ?)',
    [order_id, amount, method, transaction_id, status || 'pending'],
    (err, result) => {
      if (err) return res.status(500).json({error: err.message});
      res.json({ payment_id: result.insertId });
    }
  );
});

// API: Получить историю заказов пользователя
app.get('/api/orders/history', async (req, res) => {
    console.log('\n=== Getting orders history ===');
    console.log('Query:', req.query);
    console.log('Headers:', req.headers);
    
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        // Получаем ID пользователя из заголовка
        const userId = req.headers['x-user-id'];
        
        if (!userId) {
            console.error('No user ID provided in x-user-id header');
            return res.status(401).json({ 
                success: false,
                error: 'Необходима авторизация',
                details: 'Отсутствует ID пользователя'
            });
        }

        // Для отладки возвращаем тестовые данные
        const mockOrders = [
            {
                id: 1,
                user_id: userId,
                total: 2500,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                delivery_address: 'ул. Примерная, 123',
                phone: '+7 (999) 123-45-67',
                items: [
                    {
                        id: 1,
                        product_id: 1,
                        quantity: 2,
                        price: 1250,
                        product_name: 'Органические яблоки',
                        product_image: '/images/placeholder.jpg'
                    }
                ]
            }
        ];

        const response = {
            success: true,
            data: {
                orders: mockOrders,
                pagination: {
                    total: mockOrders.length,
                    per_page: limit,
                    current_page: page,
                    total_pages: Math.ceil(mockOrders.length / limit)
                }
            }
        };

        console.log('Sending response:', response);
        res.json(response);
    } catch (error) {
        console.error('Error in /history route:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

// HTML-роуты (статические страницы)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
app.get('/homepage', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/homepage.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});
app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/products.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Что-то пошло не так!'
    });
});

// Запускаем сервер
const server = app.listen(port, '0.0.0.0', () => {
    console.log('=== Server Startup ===');
    console.log(`Server is running on http://localhost:${port}`);
    console.log('Upload directory:', uploadDir);
    console.log('Node version:', process.version);
    console.log('Platform:', process.platform);
    console.log('====================');
});

// Обработка ошибок сервера
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please try a different port.`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

// Обработка завершения работы
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});