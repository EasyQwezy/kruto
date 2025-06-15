const admin = require('../config/firebase');
const pool = require('../db');

class AuthService {
    // Создание нового пользователя в Firebase и базе данных
    async createUser(userData) {
        try {
            // Создаем пользователя в Firebase
            const userRecord = await admin.auth().createUser({
                email: userData.email,
                password: userData.password,
                displayName: userData.name,
                emailVerified: false
            });

            // Создаем пользователя в базе данных
            const [result] = await pool.query(
                `INSERT INTO users (
                    firebase_uid, name, email, phone, 
                    auth_provider, status, email_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    userRecord.uid,
                    userData.name,
                    userData.email,
                    userData.phone || null,
                    'email',
                    'active',
                    false
                ]
            );

            return {
                id: result.insertId,
                firebase_uid: userRecord.uid,
                ...userData
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    // Обновление данных пользователя
    async updateUser(userId, userData) {
        try {
            // Получаем firebase_uid пользователя
            const [users] = await pool.query(
                'SELECT firebase_uid FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                throw new Error('User not found');
            }

            const { firebase_uid } = users[0];

            // Обновляем данные в Firebase
            await admin.auth().updateUser(firebase_uid, {
                displayName: userData.name,
                email: userData.email
            });

            // Обновляем данные в базе данных
            await pool.query(
                `UPDATE users SET 
                    name = ?, 
                    email = ?, 
                    phone = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
                [
                    userData.name,
                    userData.email,
                    userData.phone || null,
                    userId
                ]
            );

            return { id: userId, ...userData };
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Удаление пользователя
    async deleteUser(userId) {
        try {
            // Получаем firebase_uid пользователя
            const [users] = await pool.query(
                'SELECT firebase_uid FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                throw new Error('User not found');
            }

            const { firebase_uid } = users[0];

            // Удаляем пользователя из Firebase
            await admin.auth().deleteUser(firebase_uid);

            // Удаляем пользователя из базы данных
            await pool.query('DELETE FROM users WHERE id = ?', [userId]);

            return { success: true };
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    // Получение пользователя по ID
    async getUserById(userId) {
        try {
            const [users] = await pool.query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                throw new Error('User not found');
            }

            return users[0];
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    // Получение пользователя по Firebase UID
    async getUserByFirebaseUid(firebaseUid) {
        try {
            const [users] = await pool.query(
                'SELECT * FROM users WHERE firebase_uid = ?',
                [firebaseUid]
            );

            if (users.length === 0) {
                throw new Error('User not found');
            }

            return users[0];
        } catch (error) {
            console.error('Error getting user by Firebase UID:', error);
            throw error;
        }
    }
}

module.exports = new AuthService(); 