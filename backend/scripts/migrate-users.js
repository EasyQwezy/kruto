require('dotenv').config();
const admin = require('../config/firebase');
const pool = require('../db');

async function migrateUsers() {
    try {
        console.log('Starting user migration...');

        // Получаем всех пользователей из базы данных
        const [users] = await pool.query('SELECT * FROM users WHERE firebase_uid IS NULL');

        console.log(`Found ${users.length} users to migrate`);

        for (const user of users) {
            try {
                console.log(`Migrating user: ${user.email}`);

                // Создаем пользователя в Firebase
                const userRecord = await admin.auth().createUser({
                    email: user.email,
                    displayName: user.name,
                    emailVerified: false,
                    disabled: user.status !== 'active'
                });

                // Обновляем пользователя в базе данных
                await pool.query(
                    `UPDATE users SET 
                        firebase_uid = ?,
                        auth_provider = 'email',
                        email_verified = ?,
                        last_login = CURRENT_TIMESTAMP
                    WHERE id = ?`,
                    [userRecord.uid, false, user.id]
                );

                // Логируем успешную миграцию
                await pool.query(
                    `INSERT INTO migration_log 
                        (user_id, old_email, new_firebase_uid, status) 
                    VALUES (?, ?, ?, 'success')`,
                    [user.id, user.email, userRecord.uid]
                );

                console.log(`Successfully migrated user: ${user.email}`);
            } catch (error) {
                console.error(`Error migrating user ${user.email}:`, error);

                // Логируем ошибку
                await pool.query(
                    `INSERT INTO migration_log 
                        (user_id, old_email, status, error_message) 
                    VALUES (?, ?, 'failed', ?)`,
                    [user.id, user.email, error.message]
                );
            }
        }

        console.log('Migration completed');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        // Закрываем соединение с базой данных
        await pool.end();
    }
}

// Запускаем миграцию
migrateUsers(); 