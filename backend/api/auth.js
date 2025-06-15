const express = require('express');
const router = express.Router();
const admin = require('../config/firebase');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const { authenticateUser } = require('../middleware/auth');
const multer = require('multer');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/avatars');
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

// Middleware для проверки токена
router.use(authenticateUser);

// Эндпоинт для загрузки аватара
router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        // Формируем URL для доступа к файлу
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        res.json({
            message: 'Аватар успешно загружен',
            avatarUrl: avatarUrl
        });
    } catch (error) {
        console.error('Ошибка загрузки аватара:', error);
        res.status(500).json({ error: 'Ошибка загрузки аватара' });
    }
});

// Синхронизация пользователя
router.post('/sync', async (req, res) => {
    try {
        console.log('Получены данные для синхронизации:', req.body);
        const { name, email, avatar, firebase_uid } = req.body;

        // Проверяем обязательные поля
        if (!firebase_uid) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствует firebase_uid'
            });
        }

        // Получаем данные пользователя из Firebase
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUser(firebase_uid);
            console.log('Данные пользователя из Firebase:', firebaseUser);
        } catch (error) {
            console.error('Ошибка получения данных из Firebase:', error);
            return res.status(400).json({
                success: false,
                error: 'Не удалось получить данные пользователя из Firebase'
            });
        }

        // Используем email из Firebase, если он не передан
        const userEmail = email || firebaseUser.email;
        if (!userEmail) {
            console.error('Email отсутствует в запросе и в Firebase');
            return res.status(400).json({
                success: false,
                error: 'Email не может быть пустым'
            });
        }
        
        // Проверяем существование пользователя
        const [existingUser] = await db.query(
            'SELECT * FROM users WHERE firebase_uid = ?',
            [firebase_uid]
        );

        if (existingUser.length > 0) {
            console.log('Найден существующий пользователь:', existingUser[0]);
            
            // Обновляем данные пользователя
            console.log('Обновление данных пользователя');
            await db.query(
                'UPDATE users SET name = ?, email = ?, avatar = ?, last_login = NOW() WHERE firebase_uid = ?',
                [name || existingUser[0].name, userEmail, avatar || existingUser[0].avatar, firebase_uid]
            );
            console.log('Данные пользователя успешно обновлены');

            // Определяем, нужна ли настройка профиля
            const needsProfileSetup = !name || !existingUser[0].phone;
            console.log('Требуется настройка профиля:', needsProfileSetup);
            
            // Отправляем ответ в формате, ожидаемом клиентом
            res.json({
                success: true,
                message: 'Пользователь обновлен',
                user: {
                    id: existingUser[0].id,
                    firebase_uid: existingUser[0].firebase_uid,
                    name: name || existingUser[0].name,
                    email: userEmail,
                    phone: existingUser[0].phone,
                    avatar: avatar || existingUser[0].avatar,
                    role: existingUser[0].role
                },
                redirect: {
                    needed: needsProfileSetup,
                    url: needsProfileSetup ? 'profile-setup.html' : 'index.html'
                }
            });
        } else {
            // Создаем нового пользователя
            console.log('Создание нового пользователя');
            const [result] = await db.query(
                'INSERT INTO users (name, email, avatar, firebase_uid, role) VALUES (?, ?, ?, ?, ?)',
                [name || null, userEmail, avatar || null, firebase_uid, 'user']
            );
            console.log('Новый пользователь создан');

            // Отправляем ответ в формате, ожидаемом клиентом
            res.json({
                success: true,
                message: 'Пользователь создан',
                user: {
                    id: result.insertId,
                    firebase_uid,
                    name: name || null,
                    email: userEmail,
                    phone: null,
                    avatar: avatar || null,
                    role: 'user'
                },
                redirect: {
                    needed: true,
                    url: 'profile-setup.html'
                }
            });
        }
    } catch (error) {
        console.error('Ошибка синхронизации пользователя:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка синхронизации пользователя',
            details: error.message 
        });
    }
});

// Обновление профиля пользователя
router.post('/update-profile', authenticateUser, async (req, res) => {
    try {
        console.log('Получен запрос на обновление профиля:', req.body);
        const { name, phone, firebase_uid } = req.body;
        let avatarUrl = null;

        // Проверяем обязательные поля
        if (!firebase_uid) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствует firebase_uid'
            });
        }

        // Обработка загрузки аватара
        if (req.files && req.files.avatar) {
            console.log('Получен файл аватара');
            const avatarFile = req.files.avatar;
            const fileName = `${firebase_uid}_${Date.now()}${path.extname(avatarFile.name)}`;
            const filePath = path.join(__dirname, '../../uploads/avatars', fileName);

            // Создаем директорию, если она не существует
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

            // Перемещаем файл
            await avatarFile.mv(filePath);
            avatarUrl = `/uploads/avatars/${fileName}`;
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

// Получение профиля пользователя
router.get('/get-profile', authenticateUser, async (req, res) => {
    try {
        console.log('Получение профиля для пользователя:', req.user.firebase_uid);
        
        const [users] = await db.query(
            'SELECT id, name, email, phone, avatar, role FROM users WHERE firebase_uid = ?',
            [req.user.firebase_uid]
        );

        console.log('Найденные данные пользователя:', users[0]);

        if (users.length === 0) {
            console.log('Пользователь не найден');
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        const response = {
            success: true,
            user: users[0]
        };
        console.log('Отправляем ответ:', response);
        res.json(response);
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения профиля', 
            details: error.message 
        });
    }
});

module.exports = router; 