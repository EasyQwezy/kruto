// Function to load featured products
async function loadFeaturedProducts() {
    try {
        const response = await fetch('/api/homepage/featured');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();
        const featuredContainer = document.getElementById('featured-products');
        
        if (featuredContainer) {
            featuredContainer.innerHTML = products.map(product => `
                <div class="product-card">
                    <img src="${product.images[0] || '/images/placeholder.jpg'}" alt="${product.name}" onerror="this.src='/images/placeholder.jpg'">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p class="price">$${product.price}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading featured products:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
}); 