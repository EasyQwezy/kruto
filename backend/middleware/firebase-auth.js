const admin = require('../config/firebase');
const firebaseSync = require('../services/firebase-sync');

async function verifyFirebaseToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Получаем полные данные пользователя из Firebase
        const firebaseUser = await admin.auth().getUser(decodedToken.uid);
        
        // Синхронизируем данные с MySQL
        const userId = await firebaseSync.syncUserOnLogin(firebaseUser);
        
        // Добавляем информацию о пользователе в request
        req.user = {
            id: userId,
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || null,
            avatar: firebaseUser.photoURL
        };

        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = verifyFirebaseToken; 