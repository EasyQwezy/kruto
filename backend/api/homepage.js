const express = require('express');
const router = express.Router();
const db = require('../db');

// Получить данные для главной страницы
router.get('/', async (req, res) => {
    try {
        // Здесь можно добавить логику для получения данных для главной страницы
        res.json({ message: 'Homepage data' });
    } catch (error) {
        console.error('Ошибка получения данных главной страницы:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

module.exports = router; 