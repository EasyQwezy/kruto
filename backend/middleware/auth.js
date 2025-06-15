const admin = require('../config/firebase');
const pool = require('../db');

// Middleware для проверки аутентификации
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Для маршрута /sync не проверяем наличие пользователя в базе
        if (req.path === '/sync') {
            req.user = { firebase_uid: decodedToken.uid };
            return next();
        }

        // Для остальных маршрутов проверяем наличие пользователя
        const [users] = await pool.query(
            'SELECT * FROM users WHERE firebase_uid = ?',
            [decodedToken.uid]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found in database' });
        }

        // Добавляем информацию о пользователе в request
        req.user = {
            ...users[0],
            firebase: decodedToken
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware для проверки роли администратора
const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const [users] = await pool.query(
            'SELECT role FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0 || users[0].role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    authenticateUser,
    isAdmin
}; 