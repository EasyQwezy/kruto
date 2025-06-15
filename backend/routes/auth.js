const express = require('express');
const router = express.Router();
const admin = require('../config/firebase');
const authService = require('../services/auth');
const { authenticateUser } = require('../middleware/auth');
const firebaseSync = require('../services/firebase-sync');
const verifyFirebaseToken = require('../middleware/firebase-auth');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Разрешены только изображения (JPEG, JPG, PNG)'));
    }
});

// Регистрация нового пользователя
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Проверяем обязательные поля
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Создаем пользователя
        const user = await authService.createUser({
            name,
            email,
            password,
            phone
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: error.message || 'Error creating user'
        });
    }
});

// Получение пользователя по токену
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const firebaseUser = await admin.auth().getUser(decodedToken.uid);
        
        // Синхронизируем данные с MySQL
        const userData = await firebaseSync.syncUserOnLogin(firebaseUser);
        
        res.json({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            ...userData
        });
    } catch (error) {
        console.error('Error in /me route:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Обновление данных пользователя
router.put('/me', authenticateUser, async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const updatedUser = await authService.updateUser(req.user.id, {
            name,
            email,
            phone
        });

        res.json({
            message: 'User updated successfully',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            error: error.message || 'Error updating user'
        });
    }
});

// Удаление пользователя
router.delete('/me', authenticateUser, async (req, res) => {
    try {
        await authService.deleteUser(req.user.id);
        res.json({
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            error: error.message || 'Error deleting user'
        });
    }
});

// Выход пользователя
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Здесь можно добавить дополнительную логику при выходе
        // Например, обновление last_logout в базе данных
        
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error in /logout route:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Синхронизация данных пользователя
router.post('/sync', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = await firebaseSync.syncUserOnLogin(req.user);
        
        // Получаем полные данные пользователя
        const [users] = await db.query(
            'SELECT id, name, email, phone, avatar FROM users WHERE id = ?',
            [userId]
        );
        
        if (!users.length) {
            throw new Error('User not found after sync');
        }
        
        res.json({
            success: true,
            userId: users[0].id,
            user: users[0]
        });
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        res.status(500).json({ error: 'Ошибка синхронизации' });
    }
});

// Обновление профиля пользователя
router.post('/update-profile', authenticateUser, upload.single('avatar'), async (req, res) => {
    try {
        console.log('Получен запрос на обновление профиля:', {
            body: req.body,
            file: req.file,
            headers: req.headers
        });

        // Проверяем наличие данных формы
        if (!req.body) {
            console.error('req.body is undefined');
            return res.status(400).json({
                success: false,
                error: 'Отсутствуют данные формы'
            });
        }

        const { name, phone, firebase_uid } = req.body;
        let avatarUrl = null;

        // Проверяем обязательные поля
        if (!firebase_uid) {
            console.error('Отсутствует firebase_uid');
            return res.status(400).json({
                success: false,
                error: 'Отсутствует firebase_uid'
            });
        }

        // Обработка загрузки аватара
        if (req.file) {
            console.log('Получен файл аватара:', req.file);
            avatarUrl = `/uploads/avatars/${req.file.filename}`;
            console.log('Аватар сохранен:', avatarUrl);
        }

        // Обновляем данные пользователя
        console.log('Обновление данных пользователя:', { name, phone, avatarUrl, firebase_uid });
        const [result] = await db.query(
            'UPDATE users SET name = ?, phone = ?, avatar = COALESCE(?, avatar) WHERE firebase_uid = ?',
            [name, phone, avatarUrl, firebase_uid]
        );

        if (result.affectedRows === 0) {
            console.error('Пользователь не найден:', firebase_uid);
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }

        // Получаем обновленные данные пользователя
        const [updatedUser] = await db.query(
            'SELECT * FROM users WHERE firebase_uid = ?',
            [firebase_uid]
        );

        console.log('Профиль успешно обновлен:', updatedUser[0]);
        res.json({
            success: true,
            message: 'Профиль успешно обновлен',
            user: updatedUser[0]
        });
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка обновления профиля',
            details: error.message
        });
    }
});

module.exports = router; 