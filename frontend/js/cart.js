// Функции для работы с корзиной
const cart = {
    // Добавление товара в корзину
    addItem(productId, name, price, image) {
        console.log('Adding item to cart:', { productId, name, price, image });
        let cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        cartItems.push({ productId, name, price, image, quantity: 1 });
        localStorage.setItem('cart', JSON.stringify(cartItems));
        this.updateCartUI();
        this.showNotification('Товар добавлен в корзину!');
    },

    // Получение всех товаров в корзине
    getItems() {
        return JSON.parse(localStorage.getItem('cart')) || [];
    },

    // Удаление товара из корзины
    removeItem(productId) {
        let cartItems = this.getItems();
        cartItems = cartItems.filter(item => item.productId !== productId);
        localStorage.setItem('cart', JSON.stringify(cartItems));
        this.updateCartUI();
    },

    // Очистка корзины
    clear() {
        localStorage.removeItem('cart');
        this.updateCartUI();
    },

    // Обновление интерфейса корзины
    updateCartUI() {
        console.log('Updating cart UI');
        const cartItems = this.getItems();
        const cartCount = document.querySelector('.cart-count');
        const cartItemsContainer = document.querySelector('.cart-items');
        const cartActions = document.querySelector('.cart-actions');
        
        if (cartCount) {
            cartCount.textContent = cartItems.length;
        }

        if (cartItemsContainer) {
            if (cartItems.length === 0) {
                cartItemsContainer.innerHTML = '<p class="empty-cart">Корзина пуста</p>';
                if (cartActions) {
                    cartActions.style.display = 'none';
                }
                return;
            }

            if (cartActions) {
                cartActions.style.display = 'block';
            }

            let total = 0;
            cartItemsContainer.innerHTML = cartItems.map(item => {
                total += item.price * item.quantity;
                return `
                    <div class="cart-item">
                        <img src="${item.image}" alt="${item.name}">
                        <div class="cart-item-details">
                            <h4>${item.name}</h4>
                            <p>${item.price} ₽</p>
                            <div class="cart-item-quantity">
                                <button onclick="cart.updateQuantity(${item.productId}, ${item.quantity - 1})">-</button>
                                <span>${item.quantity}</span>
                                <button onclick="cart.updateQuantity(${item.productId}, ${item.quantity + 1})">+</button>
                            </div>
                        </div>
                        <button class="remove-item" onclick="cart.removeItem(${item.productId})">×</button>
                    </div>
                `;
            }).join('') + `
                <div class="cart-total">
                    <p>Итого: ${total} ₽</p>
                </div>
            `;
        }
    },

    // Обновление количества товара
    updateQuantity(productId, newQuantity) {
        if (newQuantity < 1) {
            this.removeItem(productId);
            return;
        }

        let cartItems = this.getItems();
        cartItems = cartItems.map(item => {
            if (item.productId === productId) {
                return { ...item, quantity: newQuantity };
            }
            return item;
        });
        localStorage.setItem('cart', JSON.stringify(cartItems));
        this.updateCartUI();
    },

    // Оформление заказа
    async checkout() {
        const items = this.getItems();
        const total = this.calculateTotal();

        if (items.length === 0) {
            this.showNotification('Корзина пуста', 'error');
            return;
        }

        // Проверяем авторизацию пользователя
        const userData = JSON.parse(localStorage.getItem('user'));
        console.log('Checking user authentication:', userData);
        
        if (!userData || !userData.id) {
            console.log('User not authenticated, redirecting to login page');
            this.showNotification('Необходимо войти в систему', 'error');
            window.location.href = 'login.html';
            return;
        }

        // Заполняем модальное окно данными
        const checkoutItems = document.getElementById('checkout-items');
        const checkoutTotal = document.getElementById('checkout-total');
        
        if (!checkoutItems || !checkoutTotal) {
            console.error('Checkout modal elements not found');
            return;
        }

        checkoutItems.innerHTML = items.map(item => `
            <div class="checkout-item">
                <span>${item.name}</span>
                <span>${item.quantity} x ${item.price} ₽</span>
            </div>
        `).join('');
        
        checkoutTotal.textContent = total;

        // Показываем модальное окно
        const modal = document.getElementById('checkout-modal');
        if (!modal) {
            console.error('Checkout modal not found');
            return;
        }
        modal.style.display = 'block';

        // Обработчик отправки формы
        const form = document.getElementById('checkout-form');
        if (!form) {
            console.error('Checkout form not found');
            return;
        }

        form.onsubmit = async (e) => {
            e.preventDefault();

            // Повторная проверка авторизации перед отправкой заказа
            const currentUserData = JSON.parse(localStorage.getItem('user'));
            console.log('Rechecking user authentication before order submission:', currentUserData);
            
            if (!currentUserData || !currentUserData.id) {
                this.showNotification('Сессия истекла. Пожалуйста, войдите снова.', 'error');
                window.location.href = 'login.html';
                return;
            }

            const orderData = {
                user_id: currentUserData.id,
                total: total,
                items: items.map(item => ({
                    product_id: item.productId,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            console.log('Sending order data:', orderData);

            try {
                const response = await fetch('http://localhost:3000/api/orders', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                });

                const result = await response.json();
                console.log('Server response:', result);

                if (!response.ok) {
                    throw new Error(result.message || `HTTP error! status: ${response.status}`);
                }
                
                if (result.success) {
                    this.clear();
                    this.showNotification('Заказ успешно создан!', 'success');
                    modal.style.display = 'none';
                } else {
                    throw new Error(result.message || 'Ошибка при создании заказа');
                }
            } catch (error) {
                console.error('Error creating order:', error);
                this.showNotification(error.message || 'Ошибка при создании заказа', 'error');
            }
        };
    },

    // Показ уведомлений
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    // Получение общей суммы корзины
    getTotal() {
        const cartItems = this.getItems();
        let total = 0;
        for (const item of cartItems) {
            total += item.price * item.quantity;
        }
        return total;
    },

    // Получение общей суммы корзины
    calculateTotal() {
        const cartItems = this.getItems();
        let total = 0;
        for (const item of cartItems) {
            total += item.price * item.quantity;
        }
        return total;
    }
};

// Инициализация корзины при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Cart initialization');
    cart.updateCartUI();

    // Обработчик для открытия/закрытия корзины
    const cartIcon = document.querySelector('.cart-icon');
    const cartPopup = document.querySelector('.cart-popup');

    if (cartIcon && cartPopup) {
        cartIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            cartPopup.classList.toggle('active');
        });

        // Закрытие корзины при клике вне её
        document.addEventListener('click', (e) => {
            if (!cartPopup.contains(e.target) && !cartIcon.contains(e.target)) {
                cartPopup.classList.remove('active');
            }
        });
    }

    // Обработчик закрытия модального окна
    const modal = document.getElementById('checkout-modal');
    const closeBtn = modal?.querySelector('.close-modal');
    
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    // Закрытие модального окна при клике вне его содержимого
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}); 