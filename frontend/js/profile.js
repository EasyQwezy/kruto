// Импортируем Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyBb2xBTWGMpm1FSbRBp04zyptzDhFivtWU",
    authDomain: "greenmarket-166c9.firebaseapp.com",
    projectId: "greenmarket-166c9",
    storageBucket: "greenmarket-166c9.firebasestorage.app",
    messagingSenderId: "1050311298642",
    appId: "1:1050311298642:web:b483089f1549d0879bd98b",
    measurementId: "G-4NZSRVXQM1"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupProfilePopup();
});

function checkAuth() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            showUserSection(user);
        } else {
            showGuestSection();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        showGuestSection();
    }
}

function showUserSection(userData) {
    const guestSection = document.getElementById('guest-section');
    const userSection = document.getElementById('user-section');
    
    // Скрываем секцию гостя и показываем секцию пользователя
    if (guestSection) guestSection.style.display = 'none';
    if (userSection) userSection.style.display = 'flex';
    
    // Обновляем данные пользователя
    const userName = document.getElementById('profile-username') || document.querySelector('.user-name');
    const userAvatar = document.getElementById('profile-avatar') || document.querySelector('.user-avatar');
    const profileName = document.querySelector('.profile-name');
    const profileEmail = document.querySelector('.profile-email');
    const profileAvatar = document.querySelector('.profile-avatar');
    
    if (userName) userName.textContent = userData.name || userData.email;
    if (profileName) profileName.textContent = userData.name || 'Пользователь';
    if (profileEmail) profileEmail.textContent = userData.email || '';
    
    if (userData.avatar) {
        if (userAvatar) userAvatar.src = userData.avatar;
        if (profileAvatar) profileAvatar.src = userData.avatar;
    } else {
        // Устанавливаем стандартную иконку профиля
        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ccc'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
        if (userAvatar) userAvatar.src = defaultAvatar;
        if (profileAvatar) profileAvatar.src = defaultAvatar;
    }
}

function showGuestSection() {
    const guestSection = document.getElementById('guest-section');
    const userSection = document.getElementById('user-section');
    
    // Показываем секцию гостя и скрываем секцию пользователя
    if (guestSection) guestSection.style.display = 'block';
    if (userSection) userSection.style.display = 'none';
}

function setupProfilePopup() {
    const userProfile = document.querySelector('.user-profile');
    const popup = document.querySelector('.profile-popup');
    const logoutBtn = document.getElementById('logoutBtn');
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const ordersLink = document.querySelector('.profile-menu a[href="#"]:has(i.fa-history)');

    if (!userProfile || !popup || !logoutBtn) return;

    // Toggle popup on click
    userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.classList.toggle('active');
    });

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        if (!userProfile.contains(e.target)) {
            popup.classList.remove('active');
        }
    });

    // Handle orders link click
    if (ordersLink) {
        ordersLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'profile.html#orders';
        });
    }

    // Handle logout with loading state
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            loadingSpinner.style.display = 'block';
            logoutBtn.style.pointerEvents = 'none';
            
            // Имитация задержки для демонстрации
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            localStorage.removeItem('user');
            showGuestSection();
            popup.classList.remove('active');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        } finally {
            loadingSpinner.style.display = 'none';
            logoutBtn.style.pointerEvents = 'auto';
        }
    });

    // Handle edit profile
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Здесь будет логика редактирования профиля
            alert('Функция редактирования профиля будет доступна в ближайшее время');
        });
    }
} 