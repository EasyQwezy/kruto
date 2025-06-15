// Константы
const API_URL = 'http://localhost:3000/api';

class OrdersManager {
    constructor() {
        this.ordersContainer = document.getElementById('ordersContainer');
        this.paginationContainer = document.getElementById('pagination');
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.isLoading = false;
    }

    init() {
        if (this.ordersContainer) {
            this.loadOrders();
        }
    }

    async loadOrders() {
        try {
            this.showLoading();
            const userId = this.getUserId();
            
            if (!userId) {
                this.showError('Не удалось получить ID пользователя');
                return;
            }

            const response = await fetch(`http://localhost:3000/api/orders/history?page=${this.currentPage}&limit=${this.itemsPerPage}`, {
                headers: {
                    'x-user-id': userId
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Server response:', result);

            if (!result.success) {
                throw new Error(result.error || 'Ошибка при загрузке заказов');
            }

            if (!result.data || !Array.isArray(result.data.orders)) {
                throw new Error('Неверный формат ответа сервера');
            }

            this.totalPages = result.data.pagination.totalPages;
            this.renderOrders(result.data.orders);
            this.renderPagination();
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderOrders(orders) {
        if (!orders || orders.length === 0) {
            this.ordersContainer.innerHTML = `
                <div class="no-orders">
                    <p>У вас пока нет заказов</p>
                </div>
            `;
            return;
        }

        this.ordersContainer.innerHTML = orders.map(order => this.createOrderCard(order)).join('');
    }

    createOrderCard(order) {
        const statusClass = this.getStatusClass(order.status);
        const statusText = this.getStatusText(order.status);
        const formattedDate = order.formatted_date || new Date(order.created_at).toLocaleString('ru-RU');
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <h3>Заказ #${order.id}</h3>
                        <span class="order-date">${formattedDate}</span>
                    </div>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="order-items">
                    ${this.renderOrderItems(order.items)}
                </div>
                
                ${this.renderPaymentInfo(order.payment)}
                
                <div class="order-footer">
                    <div class="order-total">
                        Итого: ${order.total} ₽
                    </div>
                </div>
            </div>
        `;
    }

    renderOrderItems(items) {
        if (!items || items.length === 0) {
            return '<p>Нет товаров в заказе</p>';
        }

        return `
            <div class="items-list">
                ${items.map(item => `
                    <div class="order-item">
                        <div class="item-image">
                            <img src="${item.product.image || '../images/default-product.png'}" 
                                 alt="${item.product.name}"
                                 onerror="this.src='../images/default-product.png'">
                        </div>
                        <div class="item-details">
                            <h4>${item.product.name}</h4>
                            <div class="item-price">
                                ${item.quantity} × ${item.price} ₽ = ${item.quantity * item.price} ₽
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderPaymentInfo(payment) {
        if (!payment) {
            return '<div class="payment-info">Информация об оплате отсутствует</div>';
        }

        const paymentStatusClass = this.getPaymentStatusClass(payment.status);
        const paymentStatusText = this.getPaymentStatusText(payment.status);

        return `
            <div class="payment-info">
                <div class="payment-details">
                    <span class="payment-method">${this.getPaymentMethodText(payment.method)}</span>
                    <span class="payment-amount">${payment.amount} ₽</span>
                    <span class="payment-status ${paymentStatusClass}">${paymentStatusText}</span>
                </div>
                ${payment.transaction_id ? `
                    <div class="transaction-id">
                        ID транзакции: ${payment.transaction_id}
                    </div>
                ` : ''}
            </div>
        `;
    }

    getStatusClass(status) {
        const statusMap = {
            'pending': 'status-pending',
            'processing': 'status-processing',
            'shipped': 'status-shipped',
            'delivered': 'status-delivered',
            'cancelled': 'status-cancelled'
        };
        return statusMap[status] || 'status-pending';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Ожидает обработки',
            'processing': 'В обработке',
            'shipped': 'Отправлен',
            'delivered': 'Доставлен',
            'cancelled': 'Отменён'
        };
        return statusMap[status] || status;
    }

    getPaymentStatusClass(status) {
        const statusMap = {
            'pending': 'payment-pending',
            'completed': 'payment-completed',
            'failed': 'payment-failed',
            'refunded': 'payment-refunded'
        };
        return statusMap[status] || 'payment-pending';
    }

    getPaymentStatusText(status) {
        const statusMap = {
            'pending': 'Ожидает оплаты',
            'completed': 'Оплачено',
            'failed': 'Ошибка оплаты',
            'refunded': 'Возвращено'
        };
        return statusMap[status] || status;
    }

    getPaymentMethodText(method) {
        const methodMap = {
            'card': 'Банковская карта',
            'cash': 'Наличные',
            'transfer': 'Банковский перевод'
        };
        return methodMap[method] || method;
    }

    renderPagination() {
        if (this.totalPages <= 1) {
            this.paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination">';
        
        // Кнопка "Предыдущая"
        paginationHTML += `
            <button class="pagination-btn" 
                    ${this.currentPage === 1 ? 'disabled' : ''}
                    onclick="ordersManager.changePage(${this.currentPage - 1})">
                ←
            </button>
        `;

        // Номера страниц
        for (let i = 1; i <= this.totalPages; i++) {
            if (
                i === 1 || 
                i === this.totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)
            ) {
                paginationHTML += `
                    <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}"
                            onclick="ordersManager.changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (
                i === this.currentPage - 3 || 
                i === this.currentPage + 3
            ) {
                paginationHTML += '<span class="pagination-dots">...</span>';
            }
        }

        // Кнопка "Следующая"
        paginationHTML += `
            <button class="pagination-btn"
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}
                    onclick="ordersManager.changePage(${this.currentPage + 1})">
                →
            </button>
        `;

        paginationHTML += '</div>';
        this.paginationContainer.innerHTML = paginationHTML;
    }

    changePage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }
        this.currentPage = page;
        this.loadOrders();
    }

    getUserId() {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                console.error('No user data found in localStorage');
                return null;
            }
            
            const user = JSON.parse(userData);
            console.log('User data from localStorage:', user);
            
            if (!user || !user.id) {
                console.error('Invalid user data format:', user);
                return null;
            }
            
            console.log('Found user ID:', user.id);
            return user.id;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }

    showLoading() {
        this.isLoading = true;
        this.ordersContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Загрузка заказов...</p>
            </div>
        `;
    }

    hideLoading() {
        this.isLoading = false;
    }

    showError(message) {
        this.ordersContainer.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button onclick="ordersManager.loadOrders()">Повторить</button>
            </div>
        `;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.ordersManager = new OrdersManager();
    window.ordersManager.init();
});