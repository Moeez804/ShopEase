// ======================
// 🔹 Global Variables
// ======================
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let allProducts = []; // cache products to avoid repeated API calls
const IMAGE_BASE_URL = 'http://localhost:5284'; // Define the base URL for images
const vendorCache = new Map(); // Cache for vendor information

// ======================
// 🔍 Global Search Setup
// ======================
if (searchInput && searchBtn) {
    // On button click
    searchBtn.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `products.html?search=${encodeURIComponent(query)}`;
        }
    });

    // On Enter press
    searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            searchBtn.click();
        }
    });
}

// ======================
// 🔹 DOM Ready
// ======================
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    updateMainNavigationForCustomer();
    updateLogoutButton();
    // Initialize fade-up animations
    const fadeEls = document.querySelectorAll('.fade-up');
    if (fadeEls.length > 0) {
        window.addEventListener('scroll', () => {
            fadeEls.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight - 100) {
                    el.classList.add('show');
                }
            });
        });
        
        // Trigger once on load
        window.dispatchEvent(new Event('scroll'));
    }
    
    // Load appropriate content based on page
    if (document.getElementById('featured-products')) {
        loadFeaturedProducts();
    }
    
    if (document.getElementById('products-grid')) {
        loadAllProducts();
        setupVendorFilter();
        // Add event listeners for filters
        document.getElementById('category')?.addEventListener('change', loadAllProducts);
        document.getElementById('sort')?.addEventListener('change', loadAllProducts);
        document.getElementById('vendor')?.addEventListener('change', loadAllProducts);
    }

    // Load new ShopEase landing page sections
    if (document.getElementById('top-products-grid')) {
        loadTopProducts();
    }
    if (document.getElementById('flash-sale-grid')) {
        loadFlashSale();
        startFlashSaleCountdown();
    }
    if (document.getElementById('categories-grid')) {
        loadCategories();
    }
    if (document.getElementById('vendors-grid')) {
        loadTopVendors();
    }

    // Mobile Menu - Only set up once
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);

    // Page specific setups
    if (document.querySelector('.cart-page')) {
        displayCartItems();
        setupCartEventListeners();
    }
    if (document.querySelector('.checkout-page')) {
        displayCheckoutItems();
        setupCheckoutForm();
    }
    if (document.querySelector('.login-form')) setupLoginForm();
    if (document.querySelector('.register-form')) setupRegisterForm();
    if (document.querySelector('.product-details-page')) displayProductDetails();
    
    // Setup product grid event delegation (moved from top level)
    const productsGrid = document.getElementById('products-grid') || document.getElementById('featured-products') || document.getElementById('top-products-grid') || document.getElementById('flash-sale-grid');
    if (productsGrid) {
        productsGrid.addEventListener('click', handleProductGridClick);
    }
    
    // Setup quick view modal close button
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            document.getElementById("quickViewModal").style.display = "none";
        });
    }

    
    // Load sales if on the home page
    if (document.getElementById('salesContainer')) {
        loadSales();
    }

    // Setup review form for product details page
    setupReviewForm();
});

// ======================
// 🔹 Core Functions
// ======================

// Toggle Mobile Menu
function toggleMobileMenu() {
    const nav = document.querySelector("nav");
    if (nav) nav.classList.toggle("active");
}

// Update Cart Count in header
function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (!cartCount) return;
    cartCount.textContent = cart.reduce((t, i) => t + i.quantity, 0);
}

// Get complete image URL
function getImageUrl(imagePath) {
    if (!imagePath) return 'https://via.placeholder.com/300';
    if (imagePath.startsWith('http')) return imagePath;
    // Ensure proper URL formatting
    return `${IMAGE_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// ======================
// 🔹 NEW: ShopEase Landing Page Functions
// ======================

// Load Top Products (6 per row)
async function loadTopProducts() {
    const productsGrid = document.getElementById('top-products-grid');
    if (!productsGrid) return;

    try {
        const response = await fetch('http://localhost:5284/api/products');
        if (!response.ok) throw new Error("Failed to fetch products");

        allProducts = await response.json();

        // Filter out out-of-stock products and take first 6 for top products
        const topProducts = allProducts
            .filter(p => p.stockQuantity > 0)
            .slice(0, 6);

        // Create an array of promises to check for offers and vendor info
        const topProductsWithDetails = await Promise.all(
            topProducts.map(async (p) => {
                const [offer, vendor] = await Promise.all([
                    getProductWithOffer(p.productId),
                    getVendorInfo(p.vendorId)
                ]);
                
                return {
                    ...p,
                    offer: offer,
                    vendor: vendor,
                    finalPrice: offer ? offer.discountedPrice : p.price,
                    discountPercent: offer ? Math.round(((p.price - offer.discountedPrice) / p.price) * 100) : 0
                };
            })
        );

      // In your loadTopProducts() function, replace with this compact version:
productsGrid.innerHTML = topProductsWithDetails.map(p => {
    const imageUrl = getImageUrl(p.imageUrl);
    const isOutOfStock = p.stockQuantity <= 0;
    
    // Generate random rating (replace with actual data if available)
    const rating = (Math.random() * 2 + 3).toFixed(1);
    const ratingCount = Math.floor(Math.random() * 100) + 10;
    
    return `
        <div class="col-md-4 col-lg-2">
            <div class="card product-card h-100">
                <div class="position-relative">
                    <div class="product-image">
                        <img src="${imageUrl}" class="card-img-top" alt="${p.name}">
                    </div>
                    
                    <!-- Badge -->
                    ${p.offer ? `<span class="badge bg-danger product-badge">${p.discountPercent}% OFF</span>` : ''}
                    
                    <!-- Quick Actions -->
                    <div class="product-actions">
                        <button class="action-btn wishlist-btn" data-id="${p.productId}">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="action-btn quick-view-btn" data-id="${p.productId}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <div class="card-body d-flex flex-column">
                    <!-- Product Title -->
                    <h6 class="card-title fw-bold">${p.name}</h6>
                    
                    <!-- Vendor -->
                    ${p.vendor ? `
                        <div class="vendor-info small text-muted">
                            ${p.vendor.shopName || p.vendor.firstName + ' ' + p.vendor.lastName}
                        </div>
                    ` : ''}
                    
                    <!-- Rating -->
                    <div class="product-rating mb-2">
                        <div class="rating-stars">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star-half-alt"></i>
                        </div>
                        <span class="rating-count">(${ratingCount})</span>
                    </div>
                    
                    <!-- Stock Status -->
                    <div class="stock-status in-stock mb-2">
                        ${isOutOfStock ? 'Out of Stock' : 'In Stock'}
                    </div>
                    
                    <div class="mt-auto">
                        <!-- Price -->
                        <div class="price-section">
                            ${p.offer ? `
                                <div class="d-flex align-items-center flex-wrap">
                                    <span class="old-price me-2">PKR ${p.price.toFixed(2)}</span>
                                    <span class="current-price">PKR ${p.finalPrice.toFixed(2)}</span>
                                    <span class="discount-percent">Save ${p.discountPercent}%</span>
                                </div>
                            ` : `
                                <div class="current-price">PKR ${p.finalPrice.toFixed(2)}</div>
                            `}
                        </div>
                        
                        <!-- Add to Cart -->
                        <div class="d-grid">
                            ${isOutOfStock ? 
                                '<button class="btn btn-outline-secondary btn-sm" disabled>Out of Stock</button>' : 
                                `<button class="btn btn-success btn-sm add-to-cart" data-id="${p.productId}" data-price="${p.finalPrice}">
                                    <i class="fas fa-cart-plus me-1"></i>ADD TO CART
                                </button>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}).join('');
    } catch (err) {
        console.error("Error loading top products:", err);
        productsGrid.innerHTML = '<div class="col-12 text-center"><p>Failed to load products. Please try again later.</p></div>';
    }
}

// Load Flash Sale Products (6 per row)
async function loadFlashSale() {
    const flashSaleGrid = document.getElementById('flash-sale-grid');
    if (!flashSaleGrid) return;

    try {
        const response = await fetch('http://localhost:5284/api/products');
        if (!response.ok) throw new Error("Failed to fetch products");

        const products = await response.json();
        
        // Get active offers
        const offersResponse = await fetch("http://localhost:5284/api/offers/active");
        let activeOffers = [];
        if (offersResponse.ok) {
            activeOffers = await offersResponse.json();
        }

        // Filter products with active offers and take first 6
        const now = new Date().getTime();
        const flashSaleProducts = products
            .filter(p => {
                const offer = activeOffers.find(o => 
                    o.productId === p.productId && 
                    new Date(o.startDate).getTime() <= now && 
                    new Date(o.endDate).getTime() >= now
                );
                return offer && p.stockQuantity > 0;
            })
            .slice(0, 6);

        // Get vendor info for flash sale products
        const flashSaleWithDetails = await Promise.all(
            flashSaleProducts.map(async (p) => {
                const offer = activeOffers.find(o => o.productId === p.productId);
                const vendor = await getVendorInfo(p.vendorId);
                
                return {
                    ...p,
                    offer: offer,
                    vendor: vendor,
                    finalPrice: offer ? offer.discountedPrice : p.price,
                    discountPercent: offer ? Math.round(((p.price - offer.discountedPrice) / p.price) * 100) : 0
                };
            })
        );

        flashSaleGrid.innerHTML = flashSaleWithDetails.map(product => {
            const imageUrl = getImageUrl(product.imageUrl);
            
            return `
                <div class="col-md-4 col-lg-2">
                    <div class="card product-card h-100 border-danger">
                        <div class="position-relative">
                            <div class="product-image">
                                <img src="${imageUrl}" class="card-img-top" alt="${product.name}">
                            </div>
                            <span class="badge bg-danger product-badge">${product.discountPercent}% OFF</span>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text text-muted small">${product.description ? product.description.substring(0, 60) + '...' : 'No description available'}</p>
                            ${product.vendor ? `<div class="vendor-info small text-muted">By: ${product.vendor.shopName || product.vendor.firstName + ' ' + product.vendor.lastName}</div>` : ''}
                            <div class="mt-auto">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <span class="text-muted text-decoration-line-through small">PKR ${product.price.toFixed(2)}</span>
                                        <span class="h5 text-danger mb-0 ms-2">PKR ${product.finalPrice.toFixed(2)}</span>
                                    </div>
                                    <button class="btn btn-danger btn-sm add-to-cart" data-id="${product.productId}" data-price="${product.finalPrice}">Add to Cart</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading flash sale products:", err);
        flashSaleGrid.innerHTML = '<div class="col-12 text-center"><p>Failed to load flash sale products. Please try again later.</p></div>';
    }
}

// Flash Sale Countdown Timer
function startFlashSaleCountdown() {
    const countdownElement = document.getElementById('flash-sale-countdown');
    if (!countdownElement) return;

    // Set flash sale end time (24 hours from now for demo)
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 24);
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = endTime - now;
        
        if (distance < 0) {
            countdownElement.innerHTML = '<div class="alert alert-warning mb-0">Flash sale has ended!</div>';
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        document.getElementById('days').textContent = days.toString().padStart(2, '0');
        document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Load Categories
async function loadCategories() {
    const categoriesGrid = document.getElementById('categories-grid');
    if (!categoriesGrid) return;

    try {
        const response = await fetch('http://localhost:5284/api/products');
        if (!response.ok) throw new Error("Failed to fetch products");

        const products = await response.json();
        
        // Extract unique categories from products
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
        
        // Take first 6 categories
        const topCategories = categories.slice(0, 6);
        
        // Map categories to icons
        const categoryIcons = {
            'Electronics': 'fas fa-laptop',
            'Clothing': 'fas fa-tshirt',
            'Home & Garden': 'fas fa-home',
            'Beauty': 'fas fa-spa',
            'Sports': 'fas fa-running',
            'Books': 'fas fa-book',
            'Toys': 'fas fa-gamepad',
            'Automotive': 'fas fa-car',
            'Health': 'fas fa-heartbeat',
            'Food': 'fas fa-utensils',
            'Jewelry': 'fas fa-gem',
            'Furniture': 'fas fa-couch'
        };

        categoriesGrid.innerHTML = topCategories.map(category => {
            const icon = categoryIcons[category] || 'fas fa-shopping-bag';
            const categoryProducts = products.filter(p => p.category === category);
            const productCount = categoryProducts.length;
            
            return `
                <div class="col-md-4 col-lg-2">
                    <div class="category-card">
                        <div class="category-icon">
                            <i class="${icon}"></i>
                        </div>
                        <h5>${category}</h5>
                        <p class="text-muted small">${productCount} products available</p>
                        <a href="products.html?category=${category.toLowerCase()}" class="btn btn-outline-success btn-sm">Shop Now</a>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading categories:", err);
        categoriesGrid.innerHTML = '<div class="col-12 text-center"><p>Failed to load categories. Please try again later.</p></div>';
    }
}

async function loadTopVendors() {
    const vendorsGrid = document.getElementById('vendors-grid');
    if (!vendorsGrid) return;

    try {
        const response = await fetch('http://localhost:5284/api/products');
        const products = await response.json();

        // ✅ Extract vendor objects directly from products
        const vendorList = products
            .map(p => p.vendor)
            .filter(v => v && v.userId); // remove nulls

        // ✅ Remove duplicate vendors
        const uniqueVendors = Array.from(
            new Map(vendorList.map(v => [v.userId, v])).values()
        );

        // ✅ Limit to top 6 vendors
        const topVendors = uniqueVendors.slice(0, 6);

        vendorsGrid.innerHTML = topVendors.map(vendor => {
            const vendorProducts = products.filter(p => p.vendor.userId === vendor.userId);
            const productCount = vendorProducts.length;
            const vendorName = vendor.businessName || `${vendor.firstName} ${vendor.lastName}`;

            return `
                <div class="col-md-4 col-lg-2">
                    <div class="vendor-card text-center p-3 border rounded shadow-sm">
                        <div class="vendor-logo mb-2">
                            <i class="fas fa-store fa-2x text-success"></i>
                        </div>
                        <h6 class="fw-bold mb-1">${vendorName}</h6>
                        <p class="text-muted small mb-1">${productCount} products</p>
                        <div class="mb-2">
                            <i class="fas fa-star text-warning"></i>
                            <i class="fas fa-star text-warning"></i>
                            <i class="fas fa-star text-warning"></i>
                            <i class="fas fa-star text-warning"></i>
                            <i class="fas fa-star-half-alt text-warning"></i>
                            <span class="ms-1 small">4.5</span>
                        </div>
                       <a href="vendor-details.html?vendor=${vendor.userId}" class="btn btn-outline-success btn-sm"> View Shop</a>

                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading vendors:", err);
        vendorsGrid.innerHTML = '<div class="col-12 text-center"><p>Failed to load vendors. Please try again later.</p></div>';
    }
}

// ======================
// 🔹 Vendor Functions
// ======================

async function getVendorInfo(vendorId) {
    if (!vendorId) return null;
    
    // Check cache first
    if (vendorCache.has(vendorId)) {
        return vendorCache.get(vendorId);
    }

    try {
        const response = await fetch(`http://localhost:5284/api/Auth/user/${vendorId}`);
        if (response.ok) {
            const vendor = await response.json();
            // Cache the vendor info
            vendorCache.set(vendorId, vendor);
            return vendor;
        } else {
            console.warn(`Vendor API returned status: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching vendor info:", error);
        return null;
    }
}

// Load all vendors for filtering
async function loadVendors() {
    try {
        // Extract vendor info from products since we don't have a direct vendors endpoint
        const response = await fetch('http://localhost:5284/api/products');
        const products = await response.json();
        
        // Get unique vendor IDs from products
        const vendorIds = [...new Set(products.map(p => p.vendorId).filter(id => id))];
        
        // Get vendor info for each unique vendor
        const vendors = await Promise.all(
            vendorIds.map(id => getVendorInfo(id))
        );
        
        return vendors.filter(v => v !== null);
    } catch (error) {
        console.error("Error loading vendors:", error);
        return [];
    }
}

// Setup vendor filter dropdown
async function setupVendorFilter() {
    const vendorSelect = document.getElementById('vendor');
    if (!vendorSelect) return;

    try {
        const vendors = await loadVendors();
        vendorSelect.innerHTML = '<option value="all">All Vendors</option>' +
            vendors.map(vendor => 
                `<option value="${vendor.userId}">${vendor.shopName || vendor.firstName + ' ' + vendor.lastName}</option>`
            ).join('');
        
        // Check if there's a vendor filter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const vendorParam = urlParams.get('vendor');
        if (vendorParam) {
            vendorSelect.value = vendorParam;
        }
    } catch (error) {
        console.error("Error setting up vendor filter:", error);
    }
}

// ======================
// 🔹 Product Functions
// ======================

// Handle product grid clicks
function handleProductGridClick(e) {
    const addToCartBtn = e.target.closest('.add-to-cart');
    const wishlistBtn = e.target.closest('.wishlist-btn');
    const quickViewBtn = e.target.closest('.quick-view-btn');

    // 🛒 Add to cart
    if (addToCartBtn) {
        const productId = parseInt(addToCartBtn.dataset.id);
        const product = allProducts.find(p => p.productId === productId);
        if (product) addToCart(product);
    }

    // ❤️ Add to wishlist (localStorage)
    if (wishlistBtn) {
        const productId = parseInt(wishlistBtn.dataset.id);
        const product = allProducts.find(p => p.productId === productId);

        let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        if (!wishlist.some(i => i.id === productId)) {
            wishlist.push({
                id: product.productId,
                name: product.name,
                price: product.price,
                image: product.imageUrl,
                vendorId: product.vendorId
            });
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            showNotification(`${product.name} added to wishlist!`);
        } else {
            showNotification(`${product.name} is already in wishlist!`);
        }
    }

   // 👁️ Quick view modal
if (quickViewBtn) {
  
    const productId = parseInt(quickViewBtn.dataset.id);
    const product = allProducts.find(p => p.productId === productId);
    
    
    
    if (product) {
        // Check for active offers and vendor info
        Promise.all([
            getProductWithOffer(productId),
            getVendorInfo(product.vendorId)
        ]).then(([offer, vendor]) => {
            const finalPrice = offer ? offer.discountedPrice : product.price;
            const discountPercent = offer ? Math.round(((product.price - offer.discountedPrice) / product.price) * 100) : 0;
            const isOutOfStock = product.stockQuantity <= 0;
            const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 10;
            
            // Update modal content
            document.getElementById("modalImage").src = getImageUrl(product.imageUrl);
            document.getElementById("modalTitle").textContent = product.name;
            document.getElementById("modalDescription").textContent = product.description || "No description available.";
            
            // Add vendor info to modal
            const modalVendorInfo = document.getElementById("modalVendorInfo");
            if (modalVendorInfo && vendor) {
                modalVendorInfo.innerHTML = `🏪 Sold by: ${vendor.shopName || vendor.firstName + ' ' + vendor.lastName}`;
                modalVendorInfo.style.display = 'block';
            } else {
                modalVendorInfo.style.display = 'none';
            }
            
            // Update price display to show discount if available
            let priceHtml = '';
            if (offer) {
                priceHtml = `
                    <span class="modal-old-price">PKR ${product.price.toFixed(2)}</span>
                    <span class="modal-price">PKR ${finalPrice.toFixed(2)}</span>
                    <span class="discount-badge">${discountPercent}% OFF</span>
                `;
            } else {
                priceHtml = `<span class="modal-price">PKR ${finalPrice.toFixed(2)}</span>`;
            }
            
            document.getElementById("modalPrice").innerHTML = priceHtml;
            
            // Update stock status
            const stockStatus = document.createElement('div');
            stockStatus.className = 'modal-stock ' + 
                (isOutOfStock ? 'stock-out' : 
                 isLowStock ? 'stock-low' : 'stock-in');
            stockStatus.innerHTML = 
                (isOutOfStock ? '❌ Out of Stock' : 
                 isLowStock ? `⚠️ Only ${product.stockQuantity} left in stock` : '✅ In Stock');
            
            // Insert stock status after price
            document.getElementById("modalPrice").after(stockStatus);
            
            // Update product specifications
            const modalSpecs = document.getElementById("modalSpecs");
            modalSpecs.innerHTML = `
                <div class="spec-item">
                    <span class="spec-label">Category:</span>
                    <span class="spec-value">${product.category || 'General'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Product ID:</span>
                    <span class="spec-value">#${product.productId}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Status:</span>
                    <span class="spec-value">${product.status || 'Available'}</span>
                </div>
                ${product.variants && product.variants.length > 0 ? `
                <div class="spec-item">
                    <span class="spec-label">Variants:</span>
                    <span class="spec-value">${product.variants.length} options available</span>
                </div>
                ` : ''}
            `;
            
            // Update action buttons
            const modalAddToCart = document.getElementById("modalAddToCart");
            modalAddToCart.setAttribute("data-id", product.productId);
            modalAddToCart.setAttribute("data-price", finalPrice);
            modalAddToCart.disabled = isOutOfStock;
            modalAddToCart.innerHTML = isOutOfStock ? 
                '<i class="fas fa-times me-2"></i>Out of Stock' : 
                '<i class="fas fa-shopping-cart me-2"></i>Add to Cart';
            
            // Update View Details button
            const modalViewDetails = document.getElementById("modalViewDetails");
            modalViewDetails.onclick = function() {
                window.location.href = `product-details.html?id=${product.productId}`;
            };
            
            // Update Add to Cart functionality for modal
            modalAddToCart.onclick = function() {
                if (!isOutOfStock) {
                    addToCart(product, finalPrice);
                    document.getElementById("quickViewModal").style.display = "none";
                    showNotification(`${product.name} added to cart!`);
                }
            };
            
            // Show modal
            document.getElementById("quickViewModal").style.display = "flex";
            
            console.log('Modal should be visible now');
            
        }).catch(err => {
            console.error("Error loading product details:", err);
            // Fallback to basic product info
            const isOutOfStock = product.stockQuantity <= 0;
            
            document.getElementById("modalImage").src = getImageUrl(product.imageUrl);
            document.getElementById("modalTitle").textContent = product.name;
            document.getElementById("modalDescription").textContent = product.description || "No description available.";
            document.getElementById("modalPrice").innerHTML = `<span class="modal-price">PKR ${product.price.toFixed(2)}</span>`;
            
            // Update stock status for fallback
            const stockStatus = document.createElement('div');
            stockStatus.className = 'modal-stock ' + (isOutOfStock ? 'stock-out' : 'stock-in');
            stockStatus.innerHTML = isOutOfStock ? '❌ Out of Stock' : '✅ In Stock';
            document.getElementById("modalPrice").after(stockStatus);
            
            // Update specifications for fallback
            const modalSpecs = document.getElementById("modalSpecs");
            modalSpecs.innerHTML = `
                <div class="spec-item">
                    <span class="spec-label">Category:</span>
                    <span class="spec-value">${product.category || 'General'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Product ID:</span>
                    <span class="spec-value">#${product.productId}</span>
                </div>
            `;
            
            // Update buttons for fallback
            const modalAddToCart = document.getElementById("modalAddToCart");
            modalAddToCart.setAttribute("data-id", product.productId);
            modalAddToCart.disabled = isOutOfStock;
            modalAddToCart.innerHTML = isOutOfStock ? 
                '<i class="fas fa-times me-2"></i>Out of Stock' : 
                '<i class="fas fa-shopping-cart me-2"></i>Add to Cart';
            
            const modalViewDetails = document.getElementById("modalViewDetails");
            modalViewDetails.onclick = function() {
                window.location.href = `product-details.html?id=${product.productId}`;
            };
            
            modalAddToCart.onclick = function() {
                if (!isOutOfStock) {
                    addToCart(product);
                    document.getElementById("quickViewModal").style.display = "none";
                    showNotification(`${product.name} added to cart!`);
                }
            };
            
            document.getElementById("quickViewModal").style.display = "flex";
        });
    }
    e.stopPropagation();
}}

// Check if a product has an active offer
async function getProductWithOffer(productId) {
    try {
        // First, try to get all active offers and filter by productId
        const response = await fetch("http://localhost:5284/api/offers/active");
        if (response.ok) {
            const offers = await response.json();
            const now = new Date().getTime();
            
            // Filter offers for this product that are currently active
            const activeOffer = offers.find(o => 
                o.productId === productId && 
                new Date(o.startDate).getTime() <= now && 
                new Date(o.endDate).getTime() >= now
            );
            
            return activeOffer || null;
        }
        return null;
    } catch (error) {
        console.error("Error checking for offers:", error);
        return null;
    }
}

// ======================
// 🔹 Products Loading
// ======================

async function loadFeaturedProducts() {
    const productsGrid = document.getElementById('featured-products');
    if (!productsGrid) return;

    try {
        const response = await fetch('http://localhost:5284/api/products');
        if (!response.ok) throw new Error("Failed to fetch products");

        allProducts = await response.json(); // cache products globally

        // Filter out out-of-stock products and take first 4 for featured
        const featuredProducts = allProducts
            .filter(p => p.stockQuantity > 0) // Only include products with stock
            .slice(0, 4);

        // Create an array of promises to check for offers and vendor info
        const featuredProductsWithDetails = await Promise.all(
            featuredProducts.map(async (p) => {
                const [offer, vendor] = await Promise.all([
                    getProductWithOffer(p.productId),
                    getVendorInfo(p.vendorId)
                ]);
                
                return {
                    ...p,
                    offer: offer,
                    vendor: vendor,
                    finalPrice: offer ? offer.discountedPrice : p.price,
                    discountPercent: offer ? Math.round(((p.price - offer.discountedPrice) / p.price) * 100) : 0
                };
            })
        );

        productsGrid.innerHTML = featuredProductsWithDetails.map(p => {
            // Construct image URL for each product
            const imageUrl = getImageUrl(p.imageUrl);
            
            // Check if product is out of stock
            const isOutOfStock = p.stockQuantity <= 0;
                
            return `
                <div class="product-card">
                    <div class="product-image">
                        <img src="${imageUrl}" alt="${p.name}">
                        ${p.offer ? `<div class="badge">${p.discountPercent}% OFF</div>` : ''}
                        ${isOutOfStock ? `<div class="out-of-stock-badge">Out of Stock</div>` : ''}
                        
                        <!-- Floating Action Buttons -->
                        <div class="product-actions">
                            <button class="wishlist-btn" data-id="${p.productId}"><i class="fas fa-heart"></i></button>
                            <button class="quick-view-btn" data-id="${p.productId}"><i class="fas fa-eye"></i></button>
                        </div>
                    </div>
                    
                    <!-- Info Section -->
                    <div class="product-info">
                        <h3>${p.name}</h3>
                        ${p.vendor ? `<div class="vendor-info">By: ${p.vendor.shopName || p.vendor.firstName + ' ' + p.vendor.lastName}</div>` : ''}
                        <div class="product-price">
                            ${p.offer ? `<span class="old-price">PKR ${p.price.toFixed(2)}</span>` : ''}
                            PKR ${p.finalPrice.toFixed(2)}
                        </div>
                        ${isOutOfStock ? 
                            `<button class="out-of-stock-btn" disabled>Out of Stock</button>` : 
                            `<button class="add-to-cart" data-id="${p.productId}" data-price="${p.finalPrice}">
                                <i class="fas fa-shopping-cart"></i> Add to Cart
                            </button>`
                        }
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading products:", err);
        productsGrid.innerHTML = "<p>⚠️ Failed to load products. Try again later.</p>";
    }
}

async function loadAllProducts() {
    const productsGrid = document.getElementById('products-grid');
    const categoryFilter = document.getElementById('category')?.value || "all";
    const sortFilter = document.getElementById('sort')?.value || "none";
    const vendorFilter = document.getElementById('vendor')?.value || "all";

    try {
        const response = await fetch('http://localhost:5284/api/products');
        let products = await response.json();
        allProducts = products;
        
        // 🔍 Get search & category from URL
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get("search")?.toLowerCase() || "";
        const categoryParam = urlParams.get("category")?.toLowerCase() || "";
        const vendorParam = urlParams.get("vendor")?.toLowerCase() || "";

        // ======================
        // Apply Filters
        // ======================

        // 1. Category from URL param
        if (categoryParam) {
            products = products.filter(product =>
                product.category && product.category.toLowerCase() === categoryParam
            );

            // ✅ Sync dropdown with URL
            const categoryDropdown = document.getElementById('category');
            if (categoryDropdown) categoryDropdown.value = categoryParam;
        }

        // 2. Category from dropdown (only if no URL param)
        else if (categoryFilter !== 'all') {
            products = products.filter(product =>
                product.category && product.category.toLowerCase() === categoryFilter.toLowerCase()
            );
        }

        // 3. Vendor filter from URL param
        if (vendorParam) {
            products = products.filter(product =>
                product.vendorId && product.vendorId.toString() === vendorParam
            );
            
            // Sync dropdown with URL
            const vendorDropdown = document.getElementById('vendor');
            if (vendorDropdown) vendorDropdown.value = vendorParam;
        }

        // 4. Vendor filter from dropdown (only if no URL param)
        else if (vendorFilter !== 'all') {
            products = products.filter(product =>
                product.vendorId && product.vendorId.toString() === vendorFilter
            );
        }

        // 5. Search filter
        if (searchQuery) {
            const categoryMatch = products.some(p =>
                p.category && p.category.toLowerCase() === searchQuery
            );

            if (categoryMatch) {
                products = products.filter(p =>
                    p.category && p.category.toLowerCase() === searchQuery
                );
            } else {
                products = products.filter(product =>
                    product.name.toLowerCase().includes(searchQuery) ||
                    (product.category && product.category.toLowerCase().includes(searchQuery)) ||
                    (product.vendorId && searchQuery.includes(product.vendorId.toString()))
                );
            }

            const input = document.getElementById("searchInput");
            if (input) input.value = searchQuery;
        }

        // 6. Sorting
        switch (sortFilter) {
            case 'name-asc':
                products.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                products.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'price-asc':
                products.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                products.sort((a, b) => b.price - a.price);
                break;
        }

        // Get all active offers
        let allActiveOffers = [];
        try {
            const offersResponse = await fetch("http://localhost:5284/api/offers/active");
            if (offersResponse.ok) {
                allActiveOffers = await offersResponse.json();
            }
        } catch (offerError) {
            console.error("Error fetching offers:", offerError);
        }

        const now = new Date().getTime();

        // Get vendor info for all products
        const productsWithDetails = await Promise.all(
            products.map(async (product) => {
                const vendor = await getVendorInfo(product.vendorId);
                const activeOffer = allActiveOffers.find(o => 
                    o.productId === product.productId && 
                    new Date(o.startDate).getTime() <= now && 
                    new Date(o.endDate).getTime() >= now
                );
                
                return {
                    ...product,
                    vendor: vendor,
                    finalPrice: activeOffer ? activeOffer.discountedPrice : product.price,
                    discountPercent: activeOffer ? Math.round(((product.price - activeOffer.discountedPrice) / product.price) * 100) : 0
                };
            })
        );

        // ======================
        // Render Products
        // ======================
        if (productsWithDetails.length > 0) {
            productsGrid.innerHTML = productsWithDetails.map(product => {
                // Check if product is out of stock
                const isOutOfStock = product.stockQuantity <= 0;

                return `
                    <div class="product-card">
                        <div class="product-image">
                            <img src="${getImageUrl(product.imageUrl)}" alt="${product.name}">
                            ${product.discountPercent > 0 ? `<div class="badge">${product.discountPercent}% OFF</div>` : ''}
                            ${isOutOfStock ? `<div class="out-of-stock-badge">Out of Stock</div>` : ''}
                        </div>
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            ${product.vendor ? `<div class="vendor-info">By: ${product.vendor.shopName || product.vendor.firstName + ' ' + product.vendor.lastName}</div>` : ''}
                            <div class="product-price">
                                ${product.discountPercent > 0 ? `<span class="old-price">PKR ${product.price.toFixed(2)}</span>` : ''}
                                PKR ${product.finalPrice.toFixed(2)}
                            </div>
                            <a href="product-details.html?id=${product.productId}" class="btn view-details">View Details</a>
                            ${isOutOfStock ? 
                                `<button class="out-of-stock-btn" disabled>Out of Stock</button>` : 
                                `<button class="add-to-cart" data-id="${product.productId}" data-price="${product.finalPrice}">Add to Cart</button>`
                            }
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            productsGrid.innerHTML = `<p>No products found.</p>`;
        }
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<p>Error loading products. Please try again later.</p>';
    }
}

// ======================
// 🔹 Sales & Offers
// ======================

async function loadSales() {
    try {
        const res = await fetch("http://localhost:5284/api/offers/active");
        let offers = await res.json();

        const salesContainer = document.getElementById("salesContainer");
        if (!salesContainer) return;
        
        salesContainer.innerHTML = "";

        const now = new Date().getTime();

        // ✅ Filter only offers that have not expired
        offers = offers.filter(o => new Date(o.endDate).getTime() > now);

        // ✅ Hide section if no valid offers
        if (!offers || offers.length === 0) {
            salesContainer.style.display = "none";
            return;
        } else {
            salesContainer.style.display = "block";
        }

        // ✅ Group offers by sale type
        const grouped = {};
        offers.forEach(o => {
            const type = o.saleType?.toLowerCase() || "other";
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(o);
        });

        const saleTitles = {
            "day": "🔥 Deals of the Day",
            "week": "⭐ Weekly Sale",
            "month": "🎉 Monthly Sale",
            "year": "🏆 Yearly Mega Deals",
            "eid": "🌙 Eid Special",
            "blackfriday": "🖤 Black Friday Deals",
            "newyear": "🎆 New Year Offers",
            "other": "💥 Special Offers"
        };

        Object.keys(grouped).forEach(type => {
            const group = grouped[type];
            let title = saleTitles[type] || `🔥 ${type.toUpperCase()} SALE`;

            const section = document.createElement("div");
            section.classList.add("sale-section");
            section.innerHTML = `
                <h2 class="section-title">${title}</h2>
                <div class="flash-sale-grid" id="flashSale-${type}"></div>
            `;
            salesContainer.appendChild(section);

            const container = document.getElementById(`flashSale-${type}`);

            group.forEach((o, index) => {
                let imageUrl = o.imageUrl 
                    ? (o.imageUrl.startsWith("http") ? o.imageUrl : `${IMAGE_BASE_URL}${o.imageUrl}`)
                    : "https://via.placeholder.com/300";

                const countdownId = `countdown-${type}-${index}`;

                // ✅ Calculate discount percentage
                let discountPercent = 0;
                if (o.price && o.discountedPrice && o.price > o.discountedPrice) {
                    discountPercent = Math.round(((o.price - o.discountedPrice) / o.price) * 100);
                }

                container.innerHTML += `
                    <div class="flash-card">
                        ${discountPercent > 0 ? `<div class="badge">${discountPercent}% OFF</div>` : ""}
                        <img src="${imageUrl}" alt="${o.name}">
                        <h3>${o.name}</h3>
                        <p class="price">
                            ${discountPercent > 0 ? `<span class="old-price">PKR ${Number(o.price).toFixed(2)}</span>` : ""}
                            PKR ${Number(o.discountedPrice).toFixed(2)}
                        </p>
                        <div id="${countdownId}" class="countdown-timer"></div>
                        <button class="add-to-cart" data-id="${o.productId}" data-price="${o.discountedPrice}">Add to Cart</button>
                    </div>
                `;

                // ⏳ Start countdown for this product
                startCountdown(
                    new Date(o.startDate).getTime(),
                    new Date(o.endDate).getTime(),
                    countdownId
                );
            });
        });

    } catch (err) {
        console.error("Error loading offers:", err);
    }
}

function startCountdown(startDate, endDate, elementId) {
    const countdownEl = document.getElementById(elementId);
    if (!countdownEl) return;

    function updateCountdown() {
        const now = new Date().getTime();

        if (now < startDate) {
            // Not started yet
            const distance = startDate - now;
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            countdownEl.innerHTML = `
                <span>Starts in:</span>
                <span>${days}d</span> :
                <span>${hours}h</span> :
                <span>${minutes}m</span> :
                <span>${seconds}s</span>
            `;
        } 
        else if (now >= startDate && now <= endDate) {
            // Active offer
            const distance = endDate - now;
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            countdownEl.innerHTML = `
                <span>Ends in:</span>
                <span>${days}d</span> :
                <span>${hours}h</span> :
                <span>${minutes}m</span> :
                <span>${seconds}s</span>
            `;
        } 
        else {
            // Expired
            countdownEl.innerHTML = "⏰ Offer expired!";
            clearInterval(interval);
        }
    }

    updateCountdown(); // run immediately
    const interval = setInterval(updateCountdown, 1000);
}

// ======================
// 🔹 Cart Functions
// ======================

async function addToCart(product, discountedPrice = null, quantity = 1) {
    // Check if product is in stock
    if (product.stockQuantity <= 0) {
        showNotification(`${product.name} is out of stock!`);
        return;
    }
    
    // Get vendor info
    const vendor = await getVendorInfo(product.vendorId);
    
    // Check if there's an active offer for this product
    let finalPrice = product.price;
    if (discountedPrice) {
        finalPrice = discountedPrice;
    } else {
        const offer = await getProductWithOffer(product.productId);
        if (offer) {
            finalPrice = offer.discountedPrice;
        }
    }

    const existingItem = cart.find(i => i.id === product.productId);
    if (existingItem) {
        // Check if we're trying to add more than available
        if (existingItem.quantity >= product.stockQuantity) {
            showNotification(`Only ${product.stockQuantity} ${product.name} available in stock!`);
            return;
        }
        existingItem.quantity += quantity;
        existingItem.price = finalPrice; // Update price in case it changed
    } else {
        cart.push({
            id: product.productId,
            name: product.name,
            price: finalPrice, // Use the discounted price if available
            image: product.imageUrl,
            quantity: quantity,
            vendorId: product.vendorId,
            vendorName: vendor ? (vendor.shopName || vendor.firstName + ' ' + vendor.lastName) : 'ShopEase Official'
        });
    }

    saveCart();
    updateCartCount();
    showNotification(`${product.name} added to cart!`);
}

function displayCartItems() {
    const container = document.querySelector('.cart-items');
    const subtotalEl = document.querySelector('.cart-subtotal');
    const shippingEl = document.querySelector('.cart-shipping');
    const estimatedEl = document.querySelector('.cart-estimated');

    if (!container || !subtotalEl || !shippingEl || !estimatedEl) return;

    if (cart.length === 0) {
        container.innerHTML = "<p>Your cart is empty.</p>";
        subtotalEl.textContent = "PKR 0.00";
        shippingEl.textContent = "Calculated at checkout";
        estimatedEl.textContent = "PKR 0.00";
        return;
    }

    container.innerHTML = cart.map(i => {
        const price = typeof i.price === "number" ? i.price : 0;
        const quantity = i.quantity || 1;
        const imageUrl = i.image 
            ? getImageUrl(i.image)
            : 'https://via.placeholder.com/300';

        return `
            <div class="cart-item" data-id="${i.id}">
                <div class="cart-item-image">
                   <img src="${imageUrl}" alt="${i.name}">
                </div>
                <div class="cart-item-details">
                    <h3>${i.name || "Unknown"}</h3>
                    ${i.vendorName ? `<div class="vendor-info">Sold by: ${i.vendorName}</div>` : ''}
                    <div class="cart-item-price">PKR ${price.toFixed(2)}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn minus">-</button>
                        <span>${quantity}</span>
                        <button class="quantity-btn plus">+</button>
                    </div>
                </div>
                <button class="remove-item">&times;</button>
            </div>
        `;
    }).join('');

    // ✅ Totals calculation
    const subtotal = cart.reduce((sum, i) => {
        const price = typeof i.price === "number" ? i.price : 0;
        return sum + price * (i.quantity || 1);
    }, 0);

    const tax = subtotal * 0.1;  // Example: 10% tax
    const shipping = subtotal > 50 ? 0 : 5.99; // Free if > PKR 50
    const total = subtotal + tax + shipping;

    subtotalEl.textContent = `PKR ${subtotal.toFixed(2)}`;
    shippingEl.textContent = shipping === 0 ? "FREE" : `PKR ${shipping.toFixed(2)}`;
    estimatedEl.textContent = `PKR ${total.toFixed(2)}`;
}

function setupCartEventListeners() {
    const cartContainer = document.querySelector('.cart-items');
    if (!cartContainer) return;
    
    cartContainer.addEventListener('click', e => {
        const itemEl = e.target.closest('.cart-item');
        if (!itemEl) return;

        const itemId = parseInt(itemEl.dataset.id);
        const item = cart.find(i => i.id === itemId);

        if (e.target.classList.contains('plus')) {
            item.quantity++;
        } else if (e.target.classList.contains('minus')) {
            item.quantity > 1 ? item.quantity-- : cart = cart.filter(i => i.id !== itemId);
        } else if (e.target.classList.contains('remove-item')) {
            cart = cart.filter(i => i.id !== itemId);
        }

        saveCart();
        displayCartItems();
        updateCartCount();
    });

    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                showNotification("Your cart is empty!");
                return;
            }
            if (!currentUser) {
                showNotification("Please login first.");
                window.location.href = "login.html?redirect=checkout.html";
                return;
            }
            window.location.href = "checkout.html";
        });
    }
}

// ======================
// 🔹 Checkout Functions
// ======================

function displayCheckoutItems() {
    const checkoutItems = document.querySelector('.checkout-items');
    const checkoutTotal = document.querySelector('.checkout-total');
    if (!checkoutItems || !checkoutTotal) return;

    if (cart.length === 0) {
        checkoutItems.innerHTML = "<p>Your cart is empty.</p>";
        checkoutTotal.textContent = "PKR 0.00";
        return;
    }

    checkoutItems.innerHTML = cart.map(i => `
        <div class="checkout-item">
            <div class="checkout-item-name">${i.name} <span>x${i.quantity}</span></div>
            <div class="checkout-item-price">PKR ${(i.price * i.quantity).toFixed(2)}</div>
        </div>
    `).join('');

    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = subtotal * 0.1;
    const shipping = subtotal > 50 ? 0 : 5.99;
    const total = subtotal + tax + shipping;

    document.querySelector('.checkout-subtotal').textContent = `PKR ${subtotal.toFixed(2)}`;
    document.querySelector('.checkout-tax').textContent = `PKR ${tax.toFixed(2)}`;
    document.querySelector('.checkout-shipping').textContent = shipping === 0 ? "FREE" : `PKR ${shipping.toFixed(2)}`;
    checkoutTotal.textContent = `PKR ${total.toFixed(2)}`;
}

function setupCheckoutForm() {
    const form = document.querySelector('.checkout-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();

        // 1️⃣ Get authentication token
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please log in to complete your order', 'error');
            window.location.href = 'login.html?redirect=checkout.html';
            return;
        }

        // 2️⃣ Validate fields
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.style.borderColor = 'red';
            } else {
                field.style.borderColor = '';
            }
        });
        if (!isValid) {
            showNotification('Please fill all required fields', 'error');
            return;
        }

        const paymentMethodInput = document.querySelector('input[name="payment-method"]:checked');
        if (!paymentMethodInput) {
            showNotification('Please select a payment method', 'error');
            return;
        }

        // ✅ Normalize payment method to match backend
        let paymentMethod = paymentMethodInput.value.toUpperCase();
        if (paymentMethod === "JAZZCASH") paymentMethod = "JazzCash";
        if (paymentMethod === "EASYPAISA") paymentMethod = "Easypaisa";

        // 3️⃣ Get current user info
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser || !currentUser.userId) {
            showNotification('User information not found. Please log in again.', 'error');
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
            return;
        }

        // 4️⃣ Build order object
        const order = {
            userId: currentUser.userId, // Use the logged-in user's ID
            shippingAddress: document.getElementById('address').value,
            paymentMethod: paymentMethod,
            orderItems: cart.map(i => ({
                productId: i.id,
                quantity: i.quantity,
                unitPrice: i.price,
                originalPrice: i.originalPrice || i.price
            }))
        };
        
        console.log("Order Payload:", JSON.stringify(order, null, 2));

        try {
            // 5️⃣ Create Order in DB - WITH AUTH HEADER
            let orderRes = await fetch("http://localhost:5284/api/orders/create", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(order)
            });
            
            if (!orderRes.ok) {
                if (orderRes.status === 401) {
                    showNotification("Session expired. Please log in again.", "error");
                    localStorage.removeItem('token');
                    localStorage.removeItem('currentUser');
                    window.location.href = 'login.html';
                    return;
                }
                
                const errorText = await orderRes.text();
                throw new Error(`Order creation failed: ${errorText || orderRes.statusText}`);
            }

            let result = await orderRes.json();
            let orderId = result.orderId;

            showNotification("Order created successfully! Processing payment...");

            // 6️⃣ Payment Handling
         // 6️⃣ Payment Handling
if (paymentMethod === "COD") {
    try {
        let res = await fetch(`http://localhost:5284/api/payment/cod`, {
            method: "POST", // ✅ Changed to POST
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
                orderId: orderId // ✅ Send orderId in request body
            })
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`COD confirmation failed: ${errorText || res.statusText}`);
        }

        let data = await res.json();
        showNotification(`Order placed with Cash on Delivery. Order ID: ${data.orderId || orderId}`);
        
        // Clear cart and redirect
        cart = [];
        saveCart();
        updateCartCount();
        setTimeout(() => window.location.href = "order-confirmation.html?orderId=" + (data.orderId || orderId), 2000);
    } catch (err) {
        console.error("COD payment error:", err);
        showNotification("COD payment failed: " + err.message, "error");
    }
}

            if (paymentMethod === "JazzCash") {
                let res = await fetch("http://localhost:5284/api/payment/jazzcash", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ orderId })
                });
                
                if (!res.ok) throw new Error("JazzCash initialization failed");

                let data = await res.json();

                // Build auto-submitting form
                let paymentForm = document.createElement("form");
                paymentForm.method = "POST";
                paymentForm.action = data.paymentUrl;
                for (let key in data.data) {
                    let input = document.createElement("input");
                    input.type = "hidden";
                    input.name = key;
                    input.value = data.data[key];
                    paymentForm.appendChild(input);
                }
                document.body.appendChild(paymentForm);
                paymentForm.submit();
            }

            if (paymentMethod === "Easypaisa") {
                let res = await fetch("http://localhost:5284/api/payment/easypaisa", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ orderId })
                });
                
                if (!res.ok) throw new Error("Easypaisa initialization failed");

                let data = await res.json();

                // Build auto-submitting form
                let paymentForm = document.createElement("form");
                paymentForm.method = "POST";
                paymentForm.action = data.paymentUrl;
                for (let key in data.data) {
                    let input = document.createElement("input");
                    input.type = "hidden";
                    input.name = key;
                    input.value = data.data[key];
                    paymentForm.appendChild(input);
                }
                document.body.appendChild(paymentForm);
                paymentForm.submit();
            }

        } catch (err) {
            console.error("Checkout error:", err);
            showNotification("Checkout failed: " + err.message, "error");
        }
    });
}
// ======================
// 🔹 Auth Functions
// ======================

function setupLoginForm() {
    const form = document.querySelector('.login-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        try {
            const res = await fetch('http://localhost:5284/api/auth/login', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Login failed");
            }

            const user = await res.json();
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('token', user.token);
            
            // ✅ UPDATE GLOBAL VARIABLE
            currentUser = user;
            
            showNotification("Login successful!");

            updateMainNavigationForCustomer();
            updateLogoutButton();

            if (user.role === "Admin") {
                window.location.href = "../admin/dashboard.html";
            } else if (user.role === "Vendor") {
                window.location.href = "../vendor/dashboard.html";
            } else {
                // Normal customer
                const redirect = new URLSearchParams(window.location.search).get('redirect');
                window.location.href = redirect || "index.html";
            }

        } catch (err) {
            showNotification(err.message);
        }
    });
}
function setupRegisterForm() {
    const form = document.querySelector('.register-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const user = {
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value.trim(),
            firstName: document.getElementById('first-name').value.trim(),
            lastName: document.getElementById('last-name').value.trim(),
            address: document.getElementById('address').value.trim(),
            phoneNumber: document.getElementById('phone').value.trim()
        };

        if (user.password.length < 6) {
            showNotification("Password must be at least 6 characters long");
            return;
        }

        try {
            // ✅ Correct endpoint (register customer)
            const res = await fetch('http://localhost:5284/api/auth/register/customer', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user)
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Registration failed");
            }

            const currentUser = await res.json();
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // ✅ UPDATE GLOBAL VARIABLE
            currentUser = user;
            
            showNotification("Registration successful!");
            
            // ✅ ADD THIS: Update navigation after registration
            updateMainNavigationForCustomer();
            updateLogoutButton();
            
            setTimeout(() => window.location.href = "index.html", 1500);
        } catch (err) {
            showNotification(err.message);
        }
    });
}
// ✅ ADD THIS FUNCTION: Handle logout from main shop
function handleLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('cart');
    
    // Remove "My Orders" link if it exists
    const myOrdersLink = document.querySelector('.my-orders-link');
    if (myOrdersLink) {
        myOrdersLink.remove();
    }
    
    // Remove user greeting if it exists
    const userGreeting = document.querySelector('.user-greeting');
    if (userGreeting) {
        userGreeting.remove();
    }
    
    // Hide logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.style.display = 'none';
    }
    
    showNotification('Logged out successfully');
    updateCartCount();
}
// ✅ UPDATED FUNCTION: Update main navigation for logged-in customers
function updateMainNavigationForCustomer() {
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    
    if (currentUser && currentUser.role === 'Customer') {
        // Simply update the login button to dashboard icon
        updateLoginToDashboard();
    }
}

// Function to update login button to dashboard icon
function updateLoginToDashboard() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    
    if (currentUser) {
        // Find ONLY the actual login button - be more specific
        let loginLink = null;
        
        const selectors = [
            'a[href="/login.html"]',          
            'a[href="login.html"]',          
            'a.nav-link[href*="login"]',    
            '.btn-login',                     
            '.login-btn',                     
            'button[onclick*="login"]',       
            'a:last-child'                    
        ];
        
        // Try each selector
        for (const selector of selectors) {
            loginLink = document.querySelector(selector);
            if (loginLink) break;
        }
        
        // Additional check: ensure it's not a home link
        if (loginLink) {
            const href = loginLink.getAttribute('href') || '';
            const text = loginLink.textContent || '';
            
            // Skip if it's a home link or doesn't look like a login button
            if (href.includes('index') || href.includes('home') || 
                href.includes('#') && !text.toLowerCase().includes('login')) {
                loginLink = null;
            }
        }
        
        if (loginLink && !loginLink.classList.contains('dashboard-icon')) {
            // Save original login link for later if needed
            loginLink.setAttribute('data-original-href', loginLink.href);
            loginLink.setAttribute('data-original-text', loginLink.innerHTML);
            
            // Update to dashboard icon
            loginLink.href = 'customer-dashboard.html';
            loginLink.innerHTML = '<i class="fas fa-user-circle fa-lg"></i>';
            loginLink.title = 'Dashboard';
            loginLink.classList.add('dashboard-icon');
            
            // Style the dashboard icon
            loginLink.style.cssText = `
                color: #667eea;
                text-decoration: none;
                padding: 8px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                font-size: 24px;
                width: 40px;
                height: 40px;
            `;
            
            // Add hover effect
            loginLink.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
                this.style.transform = 'scale(1.1)';
            });
            
            loginLink.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
                this.style.transform = 'scale(1)';
            });
            
            // Add logout functionality on right-click or long press
            loginLink.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                showLogoutConfirmation();
            });
            
            // Optional: Add logout on long press for mobile
            let touchTimer;
            loginLink.addEventListener('touchstart', function(e) {
                touchTimer = setTimeout(() => {
                    showLogoutConfirmation();
                }, 1000);
            });
            
            loginLink.addEventListener('touchend', function(e) {
                clearTimeout(touchTimer);
            });
        }
    }
}

// Function to show logout confirmation
function showLogoutConfirmation() {
    if (confirm('Do you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.reload();
    }
}

// Function to restore login button (if user logs out)
function restoreLoginButton() {
    const dashboardIcons = document.querySelectorAll('.dashboard-icon');
    dashboardIcons.forEach(loginLink => {
        const originalHref = loginLink.getAttribute('data-original-href');
        const originalText = loginLink.getAttribute('data-original-text');
        
        if (originalHref && originalText) {
            loginLink.href = originalHref;
            loginLink.innerHTML = originalText;
            loginLink.classList.remove('dashboard-icon');
            loginLink.style.cssText = ''; // Remove inline styles
            loginLink.removeAttribute('data-original-href');
            loginLink.removeAttribute('data-original-text');
            loginLink.removeAttribute('title');
        }
    });
}

function cleanupMyOrdersElements() {
    // Remove any existing user containers
    const userContainers = document.querySelectorAll('.user-container');
    userContainers.forEach(container => container.remove());
    
    // Remove any existing "My Orders" links
    const myOrdersLinks = document.querySelectorAll('.my-orders-link');
    myOrdersLinks.forEach(link => link.remove());
}

// Call this function when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Debug - uncomment to see what links exist
    // debugNavLinks();
    
    // Clean up any existing elements first
    cleanupMyOrdersElements();
    
    // Update navigation for logged-in customers
    updateMainNavigationForCustomer();
    
    // Also check login status on storage changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'currentUser') {
            if (!e.newValue) {
                // User logged out - restore login button
                restoreLoginButton();
                // Clean up any remaining elements
                cleanupMyOrdersElements();
            } else {
                // User logged in - update navigation
                cleanupMyOrdersElements();
                updateMainNavigationForCustomer();
            }
        }
    });
    
    // Also handle logout from other pages
    window.addEventListener('beforeunload', function() {
        // Check if user is still logged in
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        if (!currentUser) {
            cleanupMyOrdersElements();
        }
    });
});

// ✅ ADD THIS FUNCTION: Update user greeting in navigation
function updateUserGreeting(user) {
    const userName = user.firstName || user.username || 'Customer';
    
    // Find existing greeting or create new one
    let userGreeting = document.querySelector('.user-greeting') ||
                      document.querySelector('.welcome-user');
    
    if (!userGreeting) {
        // Look for a place to add the greeting
        const myOrdersLink = document.querySelector('.my-orders-link');
        if (myOrdersLink) {
            userGreeting = document.createElement('span');
            userGreeting.className = 'user-greeting';
            userGreeting.textContent = `Hi, ${userName}!`;
            userGreeting.style.cssText = `
                color: #495057;
                margin-right: 10px;
                font-weight: 500;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
            `;
            
            // Insert before My Orders link
            myOrdersLink.parentNode.insertBefore(userGreeting, myOrdersLink);
        }
    }
}

// ✅ ADD THIS FUNCTION: Update logout button if exists
function updateLogoutButton() {
    const logoutBtn = document.querySelector('.logout-btn') ||
                     document.querySelector('[onclick*="logout"]');
    
    if (logoutBtn) {
        logoutBtn.style.display = 'inline-block';
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            localStorage.removeItem('token');
            localStorage.removeItem('cart');
            window.location.reload();
        });
    }
}
// ======================
// 🔹 Product Details Functions
// ======================

async function displayProductDetails() {
    const productId = new URLSearchParams(window.location.search).get('id');
    if (!productId) {
        showNotification("Product not found", "error");
        setTimeout(() => window.location.href = "products.html", 1500);
        return;
    }

    try {
        const res = await fetch(`http://localhost:5284/api/products/${productId}`);
        if (!res.ok) throw new Error("Product not found");

        const product = await res.json();
        
        // Store product globally for access in other functions
        window.currentProduct = product;
        
        // Get vendor info and offer info with error handling
        let vendor = null;
        let offer = null;
        
        try {
            [vendor, offer] = await Promise.all([
                getVendorInfo(product.vendor?.userId || product.vendorId),
                getProductWithOffer(product.productId)
            ]);
            // Store offer globally
            window.currentOffer = offer;
        } catch (error) {
            console.warn('Error loading vendor/offer info:', error);
            // Continue without vendor/offer info
        }
        
        const finalPrice = offer ? offer.discountedPrice : product.price;
        const discountPercent = offer ? Math.round(((product.price - finalPrice) / product.price) * 100) : 0;
        const isOutOfStock = product.stockQuantity <= 0;
        
        // Update breadcrumb category
        const breadcrumbCategory = document.getElementById('breadcrumbCategory');
        if (breadcrumbCategory && product.category) {
            breadcrumbCategory.textContent = product.category;
            breadcrumbCategory.innerHTML = `<a href="products.html?category=${product.category.toLowerCase()}">${product.category}</a>`;
        }
        
        // Update product images
        updateProductImages(product);
        
        // Update product basic info - PASS offer as parameter
        updateProductBasicInfo(product, finalPrice, discountPercent, isOutOfStock, offer);
        
        // Update variants section
        updateProductVariants(product);
        
        // Update vendor information
        updateVendorInfo(vendor);
        
        // Update product specifications
        updateProductSpecifications(product);
        
        // Update product description
        updateProductDescription(product);
        
        // Setup event listeners
        setupProductEventListeners(product, finalPrice, isOutOfStock);
        
    } catch (err) {
        console.error('Error loading product details:', err);
        const productInfo = document.querySelector('.product-info');
        if (productInfo) {
            productInfo.innerHTML = `
                <div class="error-message">
                    <p>⚠️ ${err.message}</p>
                    <a href="products.html" class="btn">Back to Products</a>
                </div>
            `;
        }
    }
}

function updateProductImages(product) {
    const mainImage = document.getElementById('mainProductImage');
    const thumbnailGallery = document.getElementById('thumbnailGallery');
    
    if (mainImage) {
        mainImage.src = getImageUrl(product.imageUrl);
        mainImage.alt = product.name;
    }
    
    // Clear existing thumbnails
    if (thumbnailGallery) {
        thumbnailGallery.innerHTML = '';
        
        // Add main image as first thumbnail (main product)
        const mainThumbnail = document.createElement('div');
        mainThumbnail.className = 'thumbnail active';
        mainThumbnail.setAttribute('data-product-type', 'main');
        mainThumbnail.innerHTML = `<img src="${getImageUrl(product.imageUrl)}" alt="${product.name}">`;
        thumbnailGallery.appendChild(mainThumbnail);
        
        // Add variant images as additional thumbnails
        if (product.variants && product.variants.length > 0) {
            product.variants.forEach((variant, index) => {
                if (variant.imageUrl && variant.imageUrl !== product.imageUrl) {
                    const variantThumbnail = document.createElement('div');
                    variantThumbnail.className = 'thumbnail';
                    variantThumbnail.setAttribute('data-product-type', 'variant');
                    variantThumbnail.setAttribute('data-variant-index', index);
                    variantThumbnail.innerHTML = `<img src="${getImageUrl(variant.imageUrl)}" alt="${variant.variantCombination || 'Variant'}">`;
                    thumbnailGallery.appendChild(variantThumbnail);
                }
            });
        }
        
        // Add thumbnail click functionality
        const thumbnails = thumbnailGallery.querySelectorAll('.thumbnail');
        thumbnails.forEach((thumb, index) => {
            thumb.addEventListener('click', function() {
                // Remove active class from all thumbnails
                thumbnails.forEach(t => t.classList.remove('active'));
                // Add active class to clicked thumbnail
                this.classList.add('active');
                
                const thumbImg = this.querySelector('img').src;
                mainImage.src = thumbImg;
                
                // Handle variant selection based on thumbnail click
                const productType = this.getAttribute('data-product-type');
                const variantIndex = this.getAttribute('data-variant-index');
                
                if (productType === 'variant' && variantIndex !== null) {
                    // This is a variant thumbnail - select the corresponding variant
                    const variant = product.variants[variantIndex];
                    if (variant) {
                        // Update variant selection in the options
                        updateVariantOptionSelection(variant, product);
                        // Update product details for this variant
                        updateVariantSelection(variant, product);
                    }
                } else if (productType === 'main') {
                    // This is the main product thumbnail - reset to main product
                    resetToMainProduct(product);
                }
            });
        });
    }
}

// FIXED: Added offer parameter to fix ReferenceError
function updateProductBasicInfo(product, finalPrice, discountPercent, isOutOfStock, offer) {
    // Update product title
    const productTitle = document.getElementById('productTitle');
    if (productTitle) {
        productTitle.textContent = product.name;
    }
    
    // Update prices
    const productPrice = document.getElementById('productPrice');
    const oldPrice = document.getElementById('oldPrice');
    const discountBadge = document.getElementById('discountBadge');
    
    if (productPrice) productPrice.textContent = `PKR ${finalPrice.toFixed(2)}`;
    if (oldPrice) {
        if (offer && discountPercent > 0) {
            oldPrice.textContent = `PKR ${product.price.toFixed(2)}`;
            oldPrice.style.display = 'inline';
        } else {
            oldPrice.style.display = 'none';
        }
    }
    if (discountBadge) {
        if (offer && discountPercent > 0) {
            discountBadge.textContent = `${discountPercent}% OFF`;
            discountBadge.style.display = 'inline';
        } else {
            discountBadge.style.display = 'none';
        }
    }
    
    // Update stock status
    const stockStatus = document.getElementById('stockStatus');
    const availableStock = document.getElementById('availableStock');
    
    if (stockStatus) {
        if (isOutOfStock) {
            stockStatus.innerHTML = '<span style="color: #e74c3c;"><i class="fas fa-times-circle"></i> Out of Stock</span>';
        } else {
            stockStatus.innerHTML = `<span style="color: #28a745;"><i class="fas fa-check-circle"></i> In Stock</span>`;
        }
    }
    
    if (availableStock) {
        availableStock.textContent = `Available: ${product.stockQuantity}`;
    }
}

function updateProductVariants(product) {
    const variantsSection = document.getElementById('variantsSection');
    const variantOptions = document.getElementById('variantOptions');
    
    if (product.variants && product.variants.length > 0) {
        variantsSection.style.display = 'block';
        variantOptions.innerHTML = '';
        
        product.variants.forEach(variant => {
            const variantOption = document.createElement('div');
            const isVariantOutOfStock = variant.stockQuantity <= 0;
            
            variantOption.className = `variant-option ${isVariantOutOfStock ? 'out-of-stock' : ''}`;
            variantOption.innerHTML = `
                <div><strong>${variant.variantCombination || 'Default Variant'}</strong></div>
                <div>PKR ${variant.price.toFixed(2)}</div>
                <div style="font-size: 12px; color: #666;">Stock: ${variant.stockQuantity}</div>
            `;
            
            if (!isVariantOutOfStock) {
                variantOption.addEventListener('click', function() {
                    // Remove selected class from all options
                    document.querySelectorAll('.variant-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    // Add selected class to clicked option
                    this.classList.add('selected');
                    
                    // Update main product display with variant details
                    updateVariantSelection(variant, product);
                });
            }
            
            variantOptions.appendChild(variantOption);
        });
    } else {
        variantsSection.style.display = 'none';
    }
}

// NEW FUNCTION: Update variant option selection visually
function updateVariantOptionSelection(selectedVariant, mainProduct) {
    const variantOptions = document.querySelectorAll('.variant-option');
    variantOptions.forEach(option => {
        option.classList.remove('selected');
        const variantText = option.querySelector('strong').textContent;
        if (variantText === selectedVariant.variantCombination) {
            option.classList.add('selected');
        }
    });
}

// NEW FUNCTION: Reset to main product when clicking main thumbnail
function resetToMainProduct(product) {
    const offer = window.currentOffer || null;
    const finalPrice = offer ? offer.discountedPrice : product.price;
    const discountPercent = offer ? Math.round(((product.price - finalPrice) / product.price) * 100) : 0;
    const isOutOfStock = product.stockQuantity <= 0;
    
    // Reset prices to main product
    const productPrice = document.getElementById('productPrice');
    const oldPrice = document.getElementById('oldPrice');
    const discountBadge = document.getElementById('discountBadge');
    
    if (productPrice) productPrice.textContent = `PKR ${finalPrice.toFixed(2)}`;
    if (oldPrice) {
        if (offer && discountPercent > 0) {
            oldPrice.textContent = `PKR ${product.price.toFixed(2)}`;
            oldPrice.style.display = 'inline';
        } else {
            oldPrice.style.display = 'none';
        }
    }
    if (discountBadge) {
        if (offer && discountPercent > 0) {
            discountBadge.textContent = `${discountPercent}% OFF`;
            discountBadge.style.display = 'inline';
        } else {
            discountBadge.style.display = 'none';
        }
    }
    
    // Reset stock to main product
    const stockStatus = document.getElementById('stockStatus');
    const availableStock = document.getElementById('availableStock');
    const quantityInput = document.querySelector('.quantity-input');
    
    if (stockStatus) {
        if (isOutOfStock) {
            stockStatus.innerHTML = '<span style="color: #e74c3c;"><i class="fas fa-times-circle"></i> Out of Stock</span>';
        } else {
            stockStatus.innerHTML = `<span style="color: #28a745;"><i class="fas fa-check-circle"></i> In Stock</span>`;
        }
    }
    
    if (availableStock) {
        availableStock.textContent = `Available: ${product.stockQuantity}`;
    }
    
    if (quantityInput) {
        quantityInput.max = product.stockQuantity;
        if (product.stockQuantity < parseInt(quantityInput.value)) {
            quantityInput.value = product.stockQuantity;
        }
    }
    
    // Update action buttons
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    
    if (addToCartBtn) addToCartBtn.disabled = isOutOfStock;
    if (buyNowBtn) buyNowBtn.disabled = isOutOfStock;
    
    // Clear variant selection
    document.querySelectorAll('.variant-option').forEach(opt => {
        opt.classList.remove('selected');
    });
}

// UPDATED: Modified variant selection to handle both clicks and thumbnail selections
function updateVariantSelection(variant, mainProduct) {
    // Update main image if variant has different image
    const mainImage = document.getElementById('mainProductImage');
    if (variant.imageUrl && variant.imageUrl !== mainProduct.imageUrl) {
        mainImage.src = getImageUrl(variant.imageUrl);
    }
    
    // Also update the active thumbnail to match
    updateActiveThumbnailForVariant(variant);
    
    // Update price
    const productPrice = document.getElementById('productPrice');
    const oldPrice = document.getElementById('oldPrice');
    const discountBadge = document.getElementById('discountBadge');
    
    if (productPrice) productPrice.textContent = `PKR ${variant.price.toFixed(2)}`;
    if (oldPrice) oldPrice.style.display = 'none';
    if (discountBadge) discountBadge.style.display = 'none';
    
    // Update stock
    const stockStatus = document.getElementById('stockStatus');
    const availableStock = document.getElementById('availableStock');
    const quantityInput = document.querySelector('.quantity-input');
    
    const isOutOfStock = variant.stockQuantity <= 0;
    
    if (stockStatus) {
        if (isOutOfStock) {
            stockStatus.innerHTML = '<span style="color: #e74c3c;"><i class="fas fa-times-circle"></i> Out of Stock</span>';
        } else {
            stockStatus.innerHTML = `<span style="color: #28a745;"><i class="fas fa-check-circle"></i> In Stock</span>`;
        }
    }
    
    if (availableStock) {
        availableStock.textContent = `Available: ${variant.stockQuantity}`;
    }
    
    if (quantityInput) {
        quantityInput.max = variant.stockQuantity;
        if (variant.stockQuantity < parseInt(quantityInput.value)) {
            quantityInput.value = variant.stockQuantity;
        }
    }
    
    // Update action buttons
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    
    if (addToCartBtn) addToCartBtn.disabled = isOutOfStock;
    if (buyNowBtn) buyNowBtn.disabled = isOutOfStock;
}

// NEW FUNCTION: Update active thumbnail when variant is selected
function updateActiveThumbnailForVariant(variant) {
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => {
        thumb.classList.remove('active');
        const thumbImg = thumb.querySelector('img');
        if (thumbImg && thumbImg.src.includes(variant.imageUrl)) {
            thumb.classList.add('active');
        }
    });
}

function updateVendorInfo(vendor) {
    const vendorName = document.getElementById('vendorName');
    const viewVendorShop = document.getElementById('viewVendorShop');
    
    if (vendorName) {
        if (vendor) {
            vendorName.textContent = vendor.shopName || `${vendor.firstName} ${vendor.lastName}`;
        } else {
            vendorName.textContent = 'ShopEase Official';
        }
    }
    
    if (viewVendorShop && vendor) {
        viewVendorShop.setAttribute('data-vendor-id', vendor.userId);
    }
}

function updateProductSpecifications(product) {
    const specsGrid = document.getElementById('specsGrid');
    
    if (specsGrid) {
        const specifications = [
            { label: 'Product ID', value: product.productId },
            { label: 'Category', value: product.category || 'General' },
            { label: 'Brand', value: 'ShopEase' },
            { label: 'Status', value: product.status || 'Available' },
            { label: 'Created Date', value: new Date(product.createdAt).toLocaleDateString() },
            { label: 'Product Type', value: (product.variants && product.variants.length > 0) ? 'With Variants' : 'Single Product' }
        ];
        
        // Add variant combinations if available
        if (product.variants && product.variants.length > 0) {
            const uniqueCombinations = [...new Set(product.variants.map(v => v.variantCombination).filter(Boolean))];
            if (uniqueCombinations.length > 0) {
                specifications.push({ 
                    label: 'Available Options', 
                    value: uniqueCombinations.join(', ') 
                });
            }
        }
        
        specsGrid.innerHTML = specifications.map(spec => `
            <div class="spec-item">
                <span class="spec-label">${spec.label}</span>
                <span class="spec-value">${spec.value}</span>
            </div>
        `).join('');
    }
}

function updateProductDescription(product) {
    const productDescription = document.getElementById('productDescription');
    if (productDescription) {
        if (product.description) {
            productDescription.innerHTML = `
                <p>${product.description}</p>
                ${product.variants && product.variants.length > 0 ? `
                    <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                        <strong>Available Variants:</strong>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            ${product.variants.map(variant => `
                                <li>${variant.variantCombination || 'Default'} - PKR ${variant.price.toFixed(2)} (Stock: ${variant.stockQuantity})</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;
        } else {
            productDescription.textContent = "No detailed description available for this product.";
        }
    }
}

// UPDATED: Modified setupProductEventListeners to handle variant cart additions properly
function setupProductEventListeners(product, finalPrice, isOutOfStock) {
    // Add to Cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.disabled = isOutOfStock;
        addToCartBtn.addEventListener('click', function() {
            const quantity = parseInt(document.querySelector('.quantity-input').value) || 1;
            const selectedVariant = getSelectedVariant(product);
            
            let productToAdd = product;
            let priceToUse = finalPrice;
            
            if (selectedVariant) {
                productToAdd = {
                    ...product,
                    productId: selectedVariant.variantId || product.productId,
                    price: selectedVariant.price,
                    stockQuantity: selectedVariant.stockQuantity,
                    imageUrl: selectedVariant.imageUrl || product.imageUrl,
                    name: `${product.name} - ${selectedVariant.variantCombination || 'Variant'}`
                };
                priceToUse = selectedVariant.price;
            }
            
            addToCart(productToAdd, priceToUse, quantity);
            showNotification(`${productToAdd.name} added to cart!`);
        });
    }
    
    // Buy Now button
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (buyNowBtn) {
        buyNowBtn.disabled = isOutOfStock;
        buyNowBtn.addEventListener('click', function() {
            const quantity = parseInt(document.querySelector('.quantity-input').value) || 1;
            const selectedVariant = getSelectedVariant(product);
            
            let productToAdd = product;
            let priceToUse = finalPrice;
            
            if (selectedVariant) {
                productToAdd = {
                    ...product,
                    productId: selectedVariant.variantId || product.productId,
                    price: selectedVariant.price,
                    stockQuantity: selectedVariant.stockQuantity,
                    imageUrl: selectedVariant.imageUrl || product.imageUrl,
                    name: `${product.name} - ${selectedVariant.variantCombination || 'Variant'}`
                };
                priceToUse = selectedVariant.price;
            }
            
            addToCart(productToAdd, priceToUse, quantity);
            window.location.href = 'checkout.html';
        });
    }
    
    // View Vendor Shop button
    const viewVendorShop = document.getElementById('viewVendorShop');
    if (viewVendorShop) {
        viewVendorShop.addEventListener('click', function() {
            const vendorId = this.getAttribute('data-vendor-id');
            if (vendorId) {
                window.location.href = `products.html?vendor=${vendorId}`;
            } else {
                showNotification('Vendor information not available');
            }
        });
    }
}

function getSelectedVariant(product) {
    const selectedOption = document.querySelector('.variant-option.selected');
    if (selectedOption && product.variants) {
        const variantText = selectedOption.querySelector('strong').textContent;
        return product.variants.find(v => v.variantCombination === variantText);
    }
    return null;
}

// ======================
// 🔹 Review Functions
// ======================

function setupReviewForm() {
    const reviewForm = document.querySelector('.review-form');
    if (!reviewForm) return;

    reviewForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('review-name').value;
        const rating = document.getElementById('review-rating').value;
        const text = document.getElementById('review-text').value;
        
        // Create new review element
        const newReview = document.createElement('div');
        newReview.className = 'review';
        newReview.innerHTML = `
            <div class="review-header">
                <div class="review-author">${name}</div>
                <div class="review-rating">
                    ${'<i class="fas fa-star"></i>'.repeat(rating)}
                    ${'<i class="far fa-star"></i>'.repeat(5 - rating)}
                </div>
            </div>
            <div class="review-content">
                <p>${text}</p>
            </div>
        `;
        
        // Add to reviews list
        document.querySelector('.reviews-list').prepend(newReview);
        
        // Reset form
        reviewForm.reset();
        
        // Show success message
        showNotification('Review submitted successfully!');
    });
}

// ======================
// 🔹 CSS Styles Injection
// ======================

// Add CSS for notifications and discount styling if not already present
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
     
        .old-price {
            text-decoration: line-through;
            color: #999;
            margin-right: 10px;
        }
        .discount-badge {
            background: #ff4444;
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
        }
        .flash-card .badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ff4444;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
        }
        .product-card .badge {
            position: absolute;
            top: 10px;
            left: 10px;
            background: #ff4444;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10;
        }
        .product-image {
            position: relative;
        }
        .out-of-stock-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #666;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10;
        }
        .out-of-stock-btn {
            background-color: #ccc;
            color: #666;
            cursor: not-allowed;
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 4px;
            font-weight: bold;
        }
        .out-of-stock-btn:hover {
            background-color: #ccc;
            transform: none;
        }
        .vendor-info {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
            font-style: italic;
        }
        .vendor-section {
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .vendor-card {
            padding: 10px;
        }
        .vendor-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .vendor-email, .vendor-phone {
            font-size: 14px;
            color: #666;
            margin: 3px 0;
        }
        .view-vendor-products {
            display: inline-block;
            margin-top: 10px;
            color: #007bff;
            text-decoration: none;
            font-size: 14px;
        }
        .view-vendor-products:hover {
            text-decoration: underline;
        }
        .filter-group {
            margin-bottom: 15px;
        }
        .filter-select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
        }
        #modalVendorInfo {
            color: #666;
            font-size: 14px;
            margin: 10px 0;
            font-style: italic;
            display: none;
        }
  .my-orders-link {
            color: #007bff;
            text-decoration: none;
            padding: 8px 15px;
            border-radius: 4px;
            background: rgba(0, 123, 255, 0.1);
            margin-left: 10px;
            display: inline-flex;
            align-items: center;
            transition: all 0.2s;
            font-weight: 500;
            font-size: 14px;
        }
        .my-orders-link:hover {
            background: rgba(0, 123, 255, 0.2);
            text-decoration: none;
            color: #0056b3;
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0, 123, 255, 0.2);
        }
        .user-greeting {
            color: #495057;
            margin-right: 10px;
            font-weight: 500;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
        }
        
        /* Make sure the navigation has proper spacing */
        nav a:not(.my-orders-link) {
            margin-right: 10px;
        }
    `;
    document.head.appendChild(style);
}
// ======================
// 🔹 Dummy Data for Testing (WITH ONLINE IMAGES)
// ======================

const DUMMY_PRODUCTS = [
    {
        productId: 1,
        name: "iPhone 15 Pro Max",
        description: "Latest Apple smartphone with A17 Pro chip, titanium design, and advanced camera system. 256GB storage, Deep Purple color.",
        price: 349999,
        category: "Electronics",
        stockQuantity: 15,
        imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop",
        vendorId: 101,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: [
            { variantId: 1011, variantCombination: "128GB - Black", price: 329999, stockQuantity: 8, imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop" },
            { variantId: 1012, variantCombination: "256GB - Purple", price: 349999, stockQuantity: 15, imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop" },
            { variantId: 1013, variantCombination: "512GB - Gold", price: 389999, stockQuantity: 5, imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop" }
        ]
    },
    {
        productId: 2,
        name: "Samsung Galaxy S24 Ultra",
        description: "Premium Android smartphone with 200MP camera, S Pen support, and AI features. 512GB storage, Titanium Black.",
        price: 289999,
        category: "Electronics",
        stockQuantity: 12,
        imageUrl: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&h=500&fit=crop",
        vendorId: 102,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: [
            { variantId: 1021, variantCombination: "256GB - Black", price: 269999, stockQuantity: 10, imageUrl: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&h=500&fit=crop" },
            { variantId: 1022, variantCombination: "512GB - Violet", price: 289999, stockQuantity: 12, imageUrl: "https://images.unsplash.com/photo-1610945264803-b42c4d9ae2c4?w=500&h=500&fit=crop" }
        ]
    },
    {
        productId: 3,
        name: "MacBook Pro 14-inch",
        description: "Apple M3 Pro chip, 18GB RAM, 512GB SSD. Perfect for professionals and creators.",
        price: 399999,
        category: "Electronics",
        stockQuantity: 8,
        imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop",
        vendorId: 101,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: []
    },
    {
        productId: 4,
        name: "Sony WH-1000XM5 Headphones",
        description: "Industry-leading noise cancellation, 30-hour battery life, premium sound quality.",
        price: 54999,
        category: "Electronics",
        stockQuantity: 25,
        imageUrl: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&h=500&fit=crop",
        vendorId: 103,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: [
            { variantId: 1041, variantCombination: "Black", price: 54999, stockQuantity: 15, imageUrl: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&h=500&fit=crop" },
            { variantId: 1042, variantCombination: "Silver", price: 54999, stockQuantity: 10, imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop" }
        ]
    },
    {
        productId: 5,
        name: "Premium Cotton T-Shirt",
        description: "100% combed cotton, premium quality t-shirt available in multiple colors. Perfect for daily wear.",
        price: 2499,
        category: "Clothing",
        stockQuantity: 50,
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop",
        vendorId: 104,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: [
            { variantId: 1051, variantCombination: "Small - Blue", price: 2499, stockQuantity: 12, imageUrl: "https://images.unsplash.com/photo-1565693413544-599785ad0b1b?w=500&h=500&fit=crop" },
            { variantId: 1052, variantCombination: "Medium - Black", price: 2499, stockQuantity: 15, imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&h=500&fit=crop" },
            { variantId: 1053, variantCombination: "Large - White", price: 2499, stockQuantity: 13, imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&h=500&fit=crop" },
            { variantId: 1054, variantCombination: "XL - Red", price: 2499, stockQuantity: 10, imageUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&h=500&fit=crop" }
        ]
    },
    {
        productId: 6,
        name: "Leather Jacket",
        description: "Genuine leather jacket, premium quality, perfect for winter season.",
        price: 14999,
        category: "Clothing",
        stockQuantity: 20,
        imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=500&fit=crop",
        vendorId: 104,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: [
            { variantId: 1061, variantCombination: "Small - Brown", price: 14999, stockQuantity: 5, imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=500&fit=crop" },
            { variantId: 1062, variantCombination: "Medium - Black", price: 14999, stockQuantity: 8, imageUrl: "https://images.unsplash.com/photo-1548624313-1de0338e1e4d?w=500&h=500&fit=crop" }
        ]
    },
    {
        productId: 7,
        name: "Modern Coffee Table",
        description: "Elegant wooden coffee table, perfect for modern living rooms. Includes storage space.",
        price: 24999,
        category: "Home & Garden",
        stockQuantity: 10,
        imageUrl: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=500&h=500&fit=crop",
        vendorId: 105,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: [
            { variantId: 1071, variantCombination: "Walnut", price: 24999, stockQuantity: 6, imageUrl: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=500&h=500&fit=crop" },
            { variantId: 1072, variantCombination: "Oak", price: 26999, stockQuantity: 4, imageUrl: "https://images.unsplash.com/photo-1595425970375-3e016a1d62c6?w=500&h=500&fit=crop" }
        ]
    },
    {
        productId: 8,
        name: "LED Desk Lamp",
        description: "Adjustable brightness, multiple color modes, USB charging port. Perfect for study or office.",
        price: 3999,
        category: "Home & Garden",
        stockQuantity: 35,
        imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&h=500&fit=crop",
        vendorId: 105,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: []
    },
    {
        productId: 9,
        name: "Facial Cleanser Set",
        description: "Complete skincare set including cleanser, toner, and moisturizer. Suitable for all skin types.",
        price: 5999,
        category: "Beauty",
        stockQuantity: 40,
        imageUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop",
        vendorId: 106,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: [
            { variantId: 1091, variantCombination: "Normal Skin", price: 5999, stockQuantity: 15, imageUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop" },
            { variantId: 1092, variantCombination: "Dry Skin", price: 5999, stockQuantity: 12, imageUrl: "https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=500&h=500&fit=crop" },
            { variantId: 1093, variantCombination: "Oily Skin", price: 5999, stockQuantity: 13, imageUrl: "https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=500&h=500&fit=crop" }
        ]
    },
    {
        productId: 10,
        name: "Professional Hair Dryer",
        description: "Ionic technology, 3 heat settings, includes concentrator nozzle and diffuser.",
        price: 8999,
        category: "Beauty",
        stockQuantity: 18,
        imageUrl: "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=500&h=500&fit=crop",
        vendorId: 106,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: []
    },
    {
        productId: 11,
        name: "Yoga Mat Premium",
        description: "Eco-friendly, non-slip, 6mm thick yoga mat. Perfect for all types of yoga and exercise.",
        price: 3499,
        category: "Sports",
        stockQuantity: 45,
        imageUrl: "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=500&h=500&fit=crop",
        vendorId: 107,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: [
            { variantId: 1111, variantCombination: "Purple", price: 3499, stockQuantity: 15, imageUrl: "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=500&h=500&fit=crop" },
            { variantId: 1112, variantCombination: "Blue", price: 3499, stockQuantity: 15, imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&h=500&fit=crop" },
            { variantId: 1113, variantCombination: "Green", price: 3499, stockQuantity: 15, imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&h=500&fit=crop" }
        ]
    },
    {
        productId: 12,
        name: "Dumbbells Set 20kg",
        description: "Adjustable dumbbells set, includes 2 bars and weight plates. Perfect for home gym.",
        price: 12999,
        category: "Sports",
        stockQuantity: 12,
        imageUrl: "https://images.unsplash.com/photo-1586401100295-7a8096fd231a?w=500&h=500&fit=crop",
        vendorId: 107,
        status: "Available",
        createdAt: new Date().toISOString(),
        variants: []
    }
];

const DUMMY_VENDORS = {
    101: { userId: 101, firstName: "Apple", lastName: "Store", shopName: "Apple Premium Reseller", email: "apple@shopease.com", phoneNumber: "03111234567" },
    102: { userId: 102, firstName: "Samsung", lastName: "Official", shopName: "Samsung Pakistan", email: "samsung@shopease.com", phoneNumber: "03112345678" },
    103: { userId: 103, firstName: "Sony", lastName: "Electronics", shopName: "Sony World", email: "sony@shopease.com", phoneNumber: "03113456789" },
    104: { userId: 104, firstName: "Fashion", lastName: "Hub", shopName: "FashionHub Pakistan", email: "fashion@shopease.com", phoneNumber: "03114567890" },
    105: { userId: 105, firstName: "Home", lastName: "Decor", shopName: "HomeDecor Plus", email: "home@shopease.com", phoneNumber: "03115678901" },
    106: { userId: 106, firstName: "Beauty", lastName: "World", shopName: "BeautyWorld", email: "beauty@shopease.com", phoneNumber: "03116789012" },
    107: { userId: 107, firstName: "Sports", lastName: "Direct", shopName: "SportsDirect PK", email: "sports@shopease.com", phoneNumber: "03117890123" }
};

const DUMMY_OFFERS = [
    {
        offerId: 1,
        productId: 1,
        name: "iPhone 15 Pro Max Deal",
        discountedPrice: 299999,
        price: 349999,
        saleType: "Day",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop"
    },
    {
        offerId: 2,
        productId: 2,
        name: "Samsung S24 Ultra Offer",
        discountedPrice: 259999,
        price: 289999,
        saleType: "Week",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        imageUrl: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&h=500&fit=crop"
    },
    {
        offerId: 3,
        productId: 5,
        name: "T-Shirt Bundle Deal",
        discountedPrice: 1999,
        price: 2499,
        saleType: "Day",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop"
    },
    {
        offerId: 4,
        productId: 9,
        name: "Skincare Set Special",
        discountedPrice: 4499,
        price: 5999,
        saleType: "Month",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        imageUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop"
    }
];

// Modified API fetch functions to use dummy data when needed
async function fetchWithDummyFallback(url, dummyData) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn(`API failed for ${url}, using dummy data:`, error);
        return dummyData;
    }
}

// Override fetch to use online images
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    // Check if it's our API endpoint and we want to use dummy data
    if (url.includes('localhost:5284/api/products') && (!options || options.method === 'GET')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(DUMMY_PRODUCTS)
        });
    }
    
    if (url.includes('localhost:5284/api/offers/active')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(DUMMY_OFFERS)
        });
    }
    
    if (url.includes('localhost:5284/api/Auth/user/')) {
        const vendorId = parseInt(url.split('/').pop());
        const vendor = DUMMY_VENDORS[vendorId];
        if (vendor) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(vendor)
            });
        }
    }
    
    // For all other requests, use original fetch
    return originalFetch(url, options);
};