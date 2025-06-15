const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Получаем список разрешенных источников из переменной окружения
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:5500').split(',');

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

// Middleware для обработки JSON и форм
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

// Статические файлы
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
// ... другие маршруты ...

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        details: err.message
    });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        details: `Route ${req.url} not found`
    });
});

module.exports = app; 