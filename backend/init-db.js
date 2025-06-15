const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    let connection;
    try {
        // Создаем подключение без указания базы данных
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root'
        });

        console.log('Connected to MySQL server');

        // Создаем базу данных, если она не существует
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'greenmarket'}`);
        console.log(`Database ${process.env.DB_NAME || 'greenmarket'} created or already exists`);

        // Используем базу данных
        await connection.query(`USE ${process.env.DB_NAME || 'greenmarket'}`);

        // Читаем и выполняем SQL скрипт
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');
        
        // Разбиваем скрипт на отдельные запросы
        const queries = schema.split(';').filter(query => query.trim());
        
        for (const query of queries) {
            if (query.trim()) {
                await connection.query(query);
            }
        }

        // Создание таблицы продуктов
        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                description TEXT,
                images JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        console.log('Database schema initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Запускаем инициализацию
initializeDatabase()
    .then(() => {
        console.log('Database initialization completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }); 