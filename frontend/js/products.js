// Базовый URL для API
const API_BASE_URL = 'http://localhost:3000';

// Функция для загрузки всех товаров
async function loadProducts() {
    try {
        const response = await fetch('http://localhost:3000/api/products', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Server response:', data);
        
        if (!data.success) {
            throw new Error('Server returned unsuccessful response');
        }
        
        const products = Array.isArray(data.data) ? data.data : [];
        console.log('Number of products:', products.length);
        
        const container = document.getElementById('products-container');
        const errorDiv = document.getElementById('products-error');
        
        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="no-products">
                    <p>Товары не найдены</p>
                    <button class="retry-btn" onclick="loadProducts()">
                        <i class="fas fa-sync-alt"></i> Обновить
                    </button>
                </div>
            `;
            return;
        }
        
        // Сохраняем продукты в localStorage для фильтрации
        localStorage.setItem('products', JSON.stringify(products));
        
        // Отображаем товары
        displayProducts(products);
        
        errorDiv.style.display = 'none';
    } catch (error) {
        console.error('Error loading products:', error);
        const errorDiv = document.getElementById('products-error');
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `
            <p>Ошибка при загрузке товаров. Пожалуйста, попробуйте позже.</p>
            <button class="retry-btn" onclick="loadProducts()">
                <i class="fas fa-sync-alt"></i> Повторить
            </button>
        `;
        document.getElementById('products-container').innerHTML = '';
    }
}

// Функция для отображения товаров
function displayProducts(products) {
    if (!Array.isArray(products)) {
        console.error('displayProducts: products is not an array');
        return;
    }

    const container = document.getElementById('products-container');
    container.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.images && product.images[0] ? `${API_BASE_URL}${product.images[0]}` : 'images/placeholder.jpg'}" 
                     alt="${product.name || 'Product'}"
                     onerror="this.src='images/placeholder.jpg'">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name || 'Без названия'}</h3>
                <p class="product-description">${(product.description || '').substring(0, 100)}...</p>
                <div class="product-price">${parseFloat(product.price || 0).toFixed(2)} ₽</div>
                <button class="order-btn" onclick="addToCart(${product.id})">
                    <i class="fas fa-shopping-cart"></i>
                    Заказать
                </button>
            </div>
        </div>
    `).join('');
}

// Функция для фильтрации товаров
function filterProducts(products) {
    if (!Array.isArray(products)) {
        console.error('filterProducts: products is not an array');
        return;
    }

    const sort = document.getElementById('sort').value;
    let filteredProducts = [...products];
    
    // Сортировка
    switch (sort) {
        case 'name_asc':
            filteredProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'name_desc':
            filteredProducts.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            break;
        case 'price_asc':
            filteredProducts.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
            break;
        case 'price_desc':
            filteredProducts.sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0));
            break;
    }
    
    displayProducts(filteredProducts);
}

// Функция для добавления товара в корзину
function addToCart(productId) {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const product = products.find(p => p.id === productId);
    
    if (product) {
        cart.addItem(
            product.id,
            product.name,
            parseFloat(product.price),
            product.images && product.images[0] ? `${API_BASE_URL}${product.images[0]}` : 'images/placeholder.jpg'
        );
    }
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    
    // Обработчик сортировки
    document.getElementById('sort').addEventListener('change', () => {
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        filterProducts(products);
    });
}); 