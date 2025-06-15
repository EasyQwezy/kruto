const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка хранилища для загрузки изображений
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Разрешены только изображения (JPEG, JPG, PNG)'));
        }
    }
}).array('images', 5);

// Получить все товары
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const sortBy = req.query.sort || 'newest';
        
        // Определяем сортировку
        let orderBy;
        switch (sortBy) {
            case 'price-asc':
                orderBy = 'p.price ASC';
                break;
            case 'price-desc':
                orderBy = 'p.price DESC';
                break;
            case 'newest':
            default:
                orderBy = 'p.id DESC';
                break;
        }
        
        // Получаем товары с их изображениями
        const [products] = await db.query(
            `SELECT p.*, GROUP_CONCAT(pi.image_url) as images 
             FROM products p 
             LEFT JOIN product_images pi ON p.id = pi.product_id 
             GROUP BY p.id 
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        
        // Получаем общее количество товаров
        const [total] = await db.query('SELECT COUNT(*) AS count FROM products');
        
        // Обрабатываем изображения для каждого товара
        const processedProducts = products.map(product => ({
            ...product,
            images: product.images ? product.images.split(',').map(img => img.trim()) : []
        }));
        
        // Отправляем ответ с правильными заголовками
        res.setHeader('Content-Type', 'application/json');
        res.json({
            success: true,
            data: processedProducts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total[0].count / limit),
                totalItems: total[0].count,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            details: error.message 
        });
    }
});

// Получить один товар
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.*, GROUP_CONCAT(pi.image_url) as images 
             FROM products p 
             LEFT JOIN product_images pi ON p.id = pi.product_id 
             WHERE p.id = ? 
             GROUP BY p.id`,
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Продукт не найден' 
            });
        }
        
        // Обрабатываем изображения
        const product = {
            ...rows[0],
            images: rows[0].images ? rows[0].images.split(',').map(img => img.trim()) : []
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            details: error.message 
        });
    }
});

// Добавить товар
router.post('/', upload, async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        console.log('Received files:', req.files);
        
        const { name, price, description, show_on_homepage } = req.body;
        
        // Проверяем наличие всех необходимых полей
        if (!name) {
            return res.status(400).json({ 
                success: false,
                error: 'Название товара обязательно' 
            });
        }
        
        if (!price) {
            return res.status(400).json({ 
                success: false,
                error: 'Цена товара обязательна' 
            });
        }
        
        if (!description) {
            return res.status(400).json({ 
                success: false,
                error: 'Описание товара обязательно' 
            });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Необходимо загрузить хотя бы одно изображение' 
            });
        }

        // Проверяем валидность цены
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Некорректное значение цены' 
            });
        }

        // Начинаем транзакцию
        await db.query('START TRANSACTION');

        try {
            // Создаем запись о товаре
            const [result] = await db.query(
                'INSERT INTO products (name, price, description, show_on_homepage) VALUES (?, ?, ?, ?)',
                [name, parsedPrice, description, show_on_homepage === 'true']
            );

            const productId = result.insertId;
            console.log('Product inserted successfully, ID:', productId);

            // Сохраняем изображения
            const imagePromises = req.files.map(async (file) => {
                const imageUrl = `/uploads/products/${file.filename}`;
                await db.query(
                    'INSERT INTO product_images (product_id, image_url) VALUES (?, ?)',
                    [productId, imageUrl]
                );
                return imageUrl;
            });

            const imageUrls = await Promise.all(imagePromises);

            // Получаем созданный товар
            const [product] = await db.query(
                'SELECT * FROM products WHERE id = ?',
                [productId]
            );

            // Подтверждаем транзакцию
            await db.query('COMMIT');

            res.setHeader('Content-Type', 'application/json');
            res.status(201).json({
                success: true,
                data: {
                    ...product[0],
                    images: imageUrls
                }
            });
        } catch (error) {
            // В случае ошибки откатываем транзакцию
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при создании продукта',
            details: error.message 
        });
    }
});

// Обновить товар
router.put('/:id', upload, async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, price, description } = req.body;
        
        // Начинаем транзакцию
        await db.query('START TRANSACTION');

        try {
            // Проверяем существование товара
            const [currentProduct] = await db.query(
                'SELECT * FROM products WHERE id = ?',
                [productId]
            );
            
            if (currentProduct.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({ error: 'Продукт не найден' });
            }
            
            // Обновляем информацию о товаре
            await db.query(
                'UPDATE products SET name = ?, price = ?, description = ? WHERE id = ?',
                [
                    name || currentProduct[0].name,
                    price ? parseFloat(price) : currentProduct[0].price,
                    description || currentProduct[0].description,
                    productId
                ]
            );
            
            // Если есть новые изображения, добавляем их
            if (req.files && req.files.length > 0) {
                // Удаляем старые изображения
                await db.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
                
                // Добавляем новые изображения
                const imagePromises = req.files.map(async (file) => {
                    const imageUrl = `/uploads/products/${file.filename}`;
                    await db.query(
                        'INSERT INTO product_images (product_id, image_url) VALUES (?, ?)',
                        [productId, imageUrl]
                    );
                    return imageUrl;
                });
                
                await Promise.all(imagePromises);
            }
            
            // Получаем обновленный товар со всеми его изображениями
            const [updatedProduct] = await db.query(
                `SELECT p.*, GROUP_CONCAT(pi.image_url) as images 
                 FROM products p 
                 LEFT JOIN product_images pi ON p.id = pi.product_id 
                 WHERE p.id = ? 
                 GROUP BY p.id`,
                [productId]
            );
            
            // Преобразуем строку с изображениями в массив
            if (updatedProduct[0].images) {
                updatedProduct[0].images = updatedProduct[0].images.split(',');
            } else {
                updatedProduct[0].images = [];
            }
            
            // Подтверждаем транзакцию
            await db.query('COMMIT');
            
            res.json(updatedProduct[0]);
        } catch (error) {
            // В случае ошибки откатываем транзакцию
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Удалить товар
router.delete('/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Начинаем транзакцию
        await db.query('START TRANSACTION');

        try {
            // Получаем информацию о товаре и его изображениях
            const [product] = await db.query(
                'SELECT * FROM products WHERE id = ?',
                [productId]
            );
            
            if (product.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({ error: 'Продукт не найден' });
            }
            
            // Получаем пути к изображениям
            const [images] = await db.query(
                'SELECT image_url FROM product_images WHERE product_id = ?',
                [productId]
            );
            
            // Удаляем записи из таблицы product_images (каскадное удаление)
            await db.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
            
            // Удаляем сам товар
            await db.query('DELETE FROM products WHERE id = ?', [productId]);
            
            // Удаляем файлы изображений
            for (const image of images) {
                const imagePath = path.join(__dirname, '..', image.image_url);
                try {
                    await fs.promises.unlink(imagePath);
                } catch (error) {
                    console.error(`Error deleting file ${imagePath}:`, error);
                }
            }
            
            // Подтверждаем транзакцию
            await db.query('COMMIT');
            
            res.status(204).send();
        } catch (error) {
            // В случае ошибки откатываем транзакцию
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 