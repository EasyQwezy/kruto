const mysql = require('mysql2/promise');
const cors = require('cors');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '12345', // Замените на ваш пароль
    database: 'greenmarket',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Тестирование подключения
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        // Проверяем таблицы
        return connection.query('SHOW TABLES')
            .then(([tables]) => {
                console.log('Available tables:', tables);
                return connection.query('SELECT * FROM orders');
            })
            .then(([orders]) => {
                console.log('Orders in database:', orders);
                connection.release();
            });
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

module.exports = pool; 