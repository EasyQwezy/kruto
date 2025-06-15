// Базовый URL API
const API_URL = 'http://localhost:3000';

// Функция для проверки авторизации
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        }
        return false;
    } catch (error) {
        console.error('Error checking auth:', error);
        return false;
    }
}

// Функция для выхода
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Функция для обновления UI в зависимости от состояния авторизации
async function updateAuthUI() {
    const user = await checkAuth();
    const authLinks = document.querySelectorAll('.auth-links');
    const userLinks = document.querySelectorAll('.user-links');
    const userNameElements = document.querySelectorAll('.user-name');

    if (user) {
        // Пользователь авторизован
        authLinks.forEach(link => link.style.display = 'none');
        userLinks.forEach(link => link.style.display = 'block');
        userNameElements.forEach(element => {
            if (element) element.textContent = user.name;
        });
    } else {
        // Пользователь не авторизован
        authLinks.forEach(link => link.style.display = 'block');
        userLinks.forEach(link => link.style.display = 'none');
    }
}

// Функция для защиты роутов
async function protectRoute() {
    const user = await checkAuth();
    if (!user) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Функция для получения заголовков с токеном
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();

    // Обработчик выхода
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });
}); 