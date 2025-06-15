const express = require('express');
const router = express.Router();
const db = require('../db');

// Кэш для товаров на главной странице
let homepageProductsCache = null;
let lastCacheUpdate = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

// Получение товаров для главной страницы
router.get('/featured', async (req, res) => {
    try {
        // Проверяем кэш
        const now = Date.now();
        if (homepageProductsCache && lastCacheUpdate && (now - lastCacheUpdate < CACHE_DURATION)) {
            return res.json(homepageProductsCache);
        }

        // Получаем товары из базы данных
        const [rows] = await db.query(
            'SELECT id, name, price, description, images FROM products WHERE show_on_homepage = true ORDER BY id DESC LIMIT 8'
        );

        // Обрабатываем изображения
        const products = rows.map(product => ({
            ...product,
            images: JSON.parse(product.images || '[]').map(img => `/uploads/products/${img}`)
        }));

        // Обновляем кэш
        homepageProductsCache = products;
        lastCacheUpdate = now;

        res.json(products);
    } catch (error) {
        console.error('Error fetching homepage products:', error);
        
        // Если есть кэшированные данные, возвращаем их
        if (homepageProductsCache) {
            console.log('Returning cached data due to error');
            return res.json(homepageProductsCache);
        }
        
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch featured products'
        });
    }
});

// Сброс кэша при изменении товаров
router.post('/clear-cache', (req, res) => {
    homepageProductsCache = null;
    lastCacheUpdate = null;
    res.json({ message: 'Cache cleared successfully' });
});

module.exports = router; 