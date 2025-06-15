// Базовый URL для API
const API_BASE_URL = 'http://localhost:3000';

// Функция для загрузки избранных товаров
async function loadFeaturedProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/homepage/featured`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        const container = document.getElementById('featured-products');
        const errorDiv = document.getElementById('products-error');
        
        if (!products || products.length === 0) {
            container.innerHTML = '<p>Товары не найдены</p>';
            return;
        }
        
        container.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.images[0] ? `${API_BASE_URL}${product.images[0]}` : 'images/placeholder.jpg'}" 
                         alt="${product.name}"
                         onerror="this.src='images/placeholder.jpg'">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description.substring(0, 100)}...</p>
                    <div class="product-price">${parseFloat(product.price).toFixed(2)} ₽</div>
                </div>
            </div>
        `).join('');
        
        errorDiv.style.display = 'none';
    } catch (error) {
        console.error('Error loading featured products:', error);
        const errorDiv = document.getElementById('products-error');
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `
            <p>Ошибка при загрузке товаров. Пожалуйста, попробуйте позже.</p>
            <button class="retry-btn" onclick="loadFeaturedProducts()">Повторить</button>
        `;
        document.getElementById('featured-products').innerHTML = '';
    }
}

// Загружаем товары при загрузке страницы
document.addEventListener('DOMContentLoaded', loadFeaturedProducts); 