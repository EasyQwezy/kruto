const mysql = require('mysql2/promise');
require('dotenv').config();

// Вывод конфигурации базы данных
console.log('Конфигурация базы данных:', {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'greenmarket'
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345',
    database: process.env.DB_NAME || 'greenmarket',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Расширенная проверка подключения
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Соединение с базой данных успешно установлено');
        
        // Проверка версии MySQL
        const [rows] = await connection.query('SELECT VERSION() as version');
        console.log('Версия MySQL:', rows[0].version);
        
        // Проверка доступных баз данных
        const [databases] = await connection.query('SHOW DATABASES');
        console.log('Доступные базы данных:', databases.map(db => db.Database));
        
        connection.release();
    } catch (err) {
        console.error('❌ Ошибка подключения к базе данных:', err.message);
        console.error('Код ошибки:', err.code);
        console.error('Полный стек ошибки:', err);
    }
}

// Запускаем проверку подключения
testConnection();

module.exports = pool;