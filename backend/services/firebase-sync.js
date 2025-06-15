const db = require('../db');

class FirebaseSyncService {
    // Синхронизация пользователя при входе
    async syncUserOnLogin(firebaseUser) {
        try {
            console.log('Начало синхронизации пользователя:', firebaseUser.uid);
            
            // Проверяем существование пользователя
            const [existingUsers] = await db.query(
                'SELECT * FROM users WHERE firebase_uid = ?',
                [firebaseUser.uid]
            );
            
            if (existingUsers.length === 0) {
                // Создаем нового пользователя
                console.log('Создание нового пользователя');
                const [result] = await db.query(
                    `INSERT INTO users (firebase_uid, name, email, avatar) 
                     VALUES (?, ?, ?, ?)`,
                    [
                        firebaseUser.uid,
                        firebaseUser.displayName || null,
                        firebaseUser.email,
                        firebaseUser.photoURL
                    ]
                );
                console.log('Новый пользователь создан, ID:', result.insertId);
                return result.insertId;
            } else {
                // Обновляем существующего пользователя
                console.log('Обновление существующего пользователя');
                const [result] = await db.query(
                    `UPDATE users 
                     SET name = ?, 
                         email = ?, 
                         avatar = ?,
                         last_login = CURRENT_TIMESTAMP
                     WHERE firebase_uid = ?`,
                    [
                        firebaseUser.displayName || null,
                        firebaseUser.email,
                        firebaseUser.photoURL,
                        firebaseUser.uid
                    ]
                );
                console.log('Пользователь обновлен, затронуто строк:', result.affectedRows);
                return existingUsers[0].id;
            }
        } catch (error) {
            console.error('Ошибка при синхронизации пользователя:', error);
            throw error;
        }
    }

    // Синхронизация пользователя при обновлении данных
    async syncUserOnUpdate(firebaseUser) {
        try {
            const [result] = await db.query(
                `UPDATE users SET 
                    email = ?,
                    name = ?,
                    email_verified = ?,
                    updated_at = NOW()
                WHERE firebase_uid = ?`,
                [
                    firebaseUser.email,
                    firebaseUser.displayName || firebaseUser.email,
                    firebaseUser.emailVerified,
                    firebaseUser.uid
                ]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in syncUserOnUpdate:', error);
            throw error;
        }
    }

    // Синхронизация при удалении пользователя
    async syncUserOnDelete(firebaseUid) {
        try {
            const [result] = await db.query(
                'UPDATE users SET status = "deleted", updated_at = NOW() WHERE firebase_uid = ?',
                [firebaseUid]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in syncUserOnDelete:', error);
            throw error;
        }
    }

    // Получение пользователя из MySQL по Firebase UID
    async getUserByFirebaseUid(firebaseUid) {
        try {
            const [users] = await db.query(
                'SELECT * FROM users WHERE firebase_uid = ?',
                [firebaseUid]
            );
            return users[0] || null;
        } catch (error) {
            console.error('Ошибка при получении пользователя:', error);
            throw error;
        }
    }
}

module.exports = new FirebaseSyncService(); 