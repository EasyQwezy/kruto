const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const fs = require('fs');

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/products')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            cb(new Error('Неподдерживаемый формат файла. Разрешены только JPEG, PNG и WebP'));
            return;
        }
        cb(null, true);
    }
});

// Получение всех товаров
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json({ products: result.rows });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение товара по ID
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Добавление нового товара
router.post('/', upload.array('images', 5), async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        // Валидация данных
        const { name, price, description, show_on_homepage } = req.body;
        
        if (!name || !price || !description) {
            throw new Error('Missing required fields');
        }
        
        if (isNaN(price) || parseFloat(price) <= 0) {
            throw new Error('Invalid price value');
        }
        
        // Сохранение путей к изображениям
        const imagePaths = req.files.map(file => '/uploads/products/' + file.filename);
        
        // Добавление товара в базу данных
        const result = await client.query(
            'INSERT INTO products (name, price, description, images, show_on_homepage) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, price, description, JSON.stringify(imagePaths), show_on_homepage === 'true']
        );
        
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating product:', error);
        
        // Удаляем загруженные файлы в случае ошибки
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }
        
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Обновление товара
router.put('/:id', upload.array('images', 5), async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        // Валидация данных
        const { name, price, description, show_on_homepage } = req.body;
        
        if (!name || !price || !description) {
            throw new Error('Missing required fields');
        }
        
        if (isNaN(price) || parseFloat(price) <= 0) {
            throw new Error('Invalid price value');
        }
        
        // Получаем текущие данные товара
        const currentProduct = await client.query('SELECT images FROM products WHERE id = $1', [req.params.id]);
        
        if (currentProduct.rows.length === 0) {
            throw new Error('Product not found');
        }
        
        let imagePaths = JSON.parse(currentProduct.rows[0].images || '[]');
        
        // Если есть новые изображения, добавляем их
        if (req.files && req.files.length > 0) {
            const newImagePaths = req.files.map(file => '/uploads/products/' + file.filename);
            imagePaths = [...imagePaths, ...newImagePaths];
        }
        
        // Обновление товара
        const result = await client.query(
            'UPDATE products SET name = $1, price = $2, description = $3, images = $4, show_on_homepage = $5 WHERE id = $6 RETURNING *',
            [name, price, description, JSON.stringify(imagePaths), show_on_homepage === 'true', req.params.id]
        );
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating product:', error);
        
        // Удаляем загруженные файлы в случае ошибки
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }
        
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Удаление товара
router.delete('/:id', async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        // Получаем информацию о товаре
        const product = await client.query('SELECT images FROM products WHERE id = $1', [req.params.id]);
        
        if (product.rows.length === 0) {
            throw new Error('Product not found');
        }
        
        // Удаляем изображения
        const images = JSON.parse(product.rows[0].images || '[]');
        images.forEach(imagePath => {
            const fullPath = path.join(__dirname, '../../public', imagePath);
            fs.unlink(fullPath, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        });
        
        // Удаляем товар из базы данных
        await client.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        
        await client.query('COMMIT');
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting product:', error);
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
});

module.exports = router; 