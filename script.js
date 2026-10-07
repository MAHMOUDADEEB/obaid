// قاعدة بيانات محلية وحالة التطبيق
let products = JSON.parse(localStorage.getItem('luxury_candy_products')) || [
    { id: 1, name: 'شوكولاتة فاخرة بالبندق', image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500', cost: 2.00, price: 3.50, hidden: false },
    { id: 2, name: 'علبة ملبس ملكي', image: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500', cost: 1.50, price: 2.75, hidden: false }
];

let supermarkets = JSON.parse(localStorage.getItem('luxury_candy_supermarkets')) || [
    { name: 'سوبرماركت البركة', phone: '0791234567' },
    { name: 'مچل الوناسه', phone: '0789876543' }
];

let cart = [];

// حفظ البيانات
function saveAppData() {
    localStorage.setItem('luxury_candy_products', JSON.stringify(products));
    localStorage.setItem('luxury_candy_supermarkets', JSON.stringify(supermarkets));
}

// تشغيل خلفية Three.js ثلاثية الأبعاد الفخمة
window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    if (container) {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        // إنشاء جزيئات ذهبية تسبح في الخلفية
        const geometry = new THREE.BufferGeometry();
        const count = 400;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 20;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ size: 0.04, color: 0xf59e0b });
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        camera.position.z = 5;

        function animate() {
            requestAnimationFrame(animate);
            particles.rotation.y += 0.001;
            renderer.render(scene, camera);
        }
        animate();
    }

    // تهيئة الشاشات
    if (document.getElementById('productsGrid')) renderCustomerCatalog();
    if (document.getElementById('adminProductsGrid')) {
        checkAdminAuth();
    }
});

// --- دوال واجهة الزبون ---
function renderCustomerCatalog() {
    const swiperWrapper = document.getElementById('swiperWrapper');
    const productsGrid = document.getElementById('productsGrid');

    const visibleProducts = products.filter(p => !p.hidden);

    if (swiperWrapper) {
        swiperWrapper.innerHTML = visibleProducts.map(p => `
            <div class="swiper-slide product-card">
                <img src="${p.image}" class="product-img">
                <div class="product-info">
                    <div class="product-title">${p.name}</div>
                    <div class="product-price">${p.price.toFixed(2)} د.أ</div>
                    <button class="btn-luxury" style="width:100%; justify-content:center; padding:8px;" onclick="addToCart(${p.id})">أضف للسلة</button>
                </div>
            </div>
        `).join('');

        new Swiper('.mySwiper', {
            slidesPerView: 1,
            spaceBetween: 20,
            pagination: { el: '.swiper-pagination', clickable: true },
            breakpoints: { 768: { slidesPerView: 3 } }
        });
    }

    if (productsGrid) {
        productsGrid.innerHTML = visibleProducts.map(p => `
            <div class="product-card">
                <img src="${p.image}" class="product-img">
                <div class="product-info">
                    <div class="product-title">${p.name}</div>
                    <div class="product-price">${p.price.toFixed(2)} د.أ</div>
                    <button class="btn-luxury" style="width:100%; justify-content:center;" onclick="addToCart(${p.id})">أضف للسلة</button>
                </div>
            </div>
        `).join('');
    }
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
}

function updateCartUI() {
    const countEl = document.getElementById('cartCount');
    if (countEl) countEl.innerText = cart.reduce((sum, item) => sum + item.qty, 0);
}

function openCartModal() {
    const list = document.getElementById('cartItemsList');
    const select = document.getElementById('supermarketSelect');

    select.innerHTML = '<option value="">-- اختر السوبرماركت --</option>' + 
        supermarkets.map(s => `<option value="${s.phone}">${s.name}</option>`).join('');

    if (cart.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted)">السلة فارغة حالياً</p>';
    } else {
        list.innerHTML = cart.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                <div><strong>${item.name}</strong><br><small style="color:var(--primary)">${item.price} د.أ</small></div>
                <div>الكمية: ${item.qty}</div>
            </div>
        `).join('');
    }

    document.getElementById('cartModal').classList.add('active');
}

function onSupermarketSelect() {
    const select = document.getElementById('supermarketSelect');
    document.getElementById('targetPhone').value = select.value;
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// --- توليد الفاتورة PDF وإرسالها عبر واتساب ---
function generatePDFInvoice() {
    const phone = document.getElementById('targetPhone').value.trim();
    if (!phone || cart.length === 0) {
        alert('يرجى اختيار السوبرماركت وتعبئة السلة أولاً!');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("Cairo", "normal");
    doc.text("فاتورة توزيع السكاكر الفاخرة", 105, 20, { align: "center" });
    
    let y = 40;
    let total = 0;
    cart.forEach(item => {
        let subtotal = item.price * item.qty;
        total += subtotal;
        doc.text(`${item.name} - الكمية: ${item.qty} - السعر: ${subtotal.toFixed(2)} د.أ`, 20, y);
        y += 10;
    });

    doc.text(`الإجمالي الكلي: ${total.toFixed(2)} د.أ`, 20, y + 10);

    // حفظ ملف PDF محلياً
    doc.save("invoice.pdf");

    // تجهيز رابط واتساب
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '962' + cleanPhone.substring(1);

    const msg = encodeURIComponent(`مرحباً، مرفق لكم فاتورة بضاعة السكاكر بقيمة إجمالية: ${total.toFixed(2)} د.أ`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
    
    cart = [];
    updateCartUI();
    closeModal('cartModal');
}

// --- دوال الأدمن ---
function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (u === 'm7md' && p === '2001') {
        localStorage.setItem('admin_logged', 'true');
        checkAdminAuth();
    } else {
        alert('اسم المستخدم أو كلمة المرور غير صحيحة!');
    }
}

function checkAdminAuth() {
    if (localStorage.getItem('admin_logged') === 'true') {
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('adminDashboard').style.display = 'block';
        renderAdminDashboard();
    } else {
        document.getElementById('loginModal').classList.add('active');
    }
}

function logout() {
    localStorage.removeItem('admin_logged');
    location.reload();
}

function renderAdminDashboard() {
    document.getElementById('statTotalProducts').innerText = products.length;
    let totalProfit = products.reduce((sum, p) => sum + ((p.price - p.cost) * 10), 0); // تقديري افتراضي
    document.getElementById('statTotalProfit').innerText = totalProfit.toFixed(2) + ' د.أ';

    const grid = document.getElementById('adminProductsGrid');
    grid.innerHTML = products.map(p => `
        <div class="product-card" style="opacity: ${p.hidden ? '0.5' : '1'}">
            <img src="${p.image}" class="product-img">
            <div class="product-info">
                <div class="product-title">${p.name}</div>
                <div style="font-size:0.85rem; color:var(--text-muted)">التكلفة: ${p.cost} | البيع: ${p.price}</div>
                <div style="margin-top: 15px; display:flex; gap:10px;">
                    <button class="btn-outline" style="flex:1; padding:6px; font-size:0.8rem;" onclick="toggleProductVisibility(${p.id})">
                        ${p.hidden ? 'إظهار' : 'إخفاء'}
                    </button>
                    <button class="btn-outline" style="border-color:var(--danger); color:var(--danger); padding:6px;" onclick="deleteProduct(${p.id})">حذف</button>
                </div>
            </div>
        </div>
    `).join('');
}

function openAddProductModal() {
    document.getElementById('addProductModal').classList.add('active');
}

function saveNewProduct(e) {
    e.preventDefault();
    const newP = {
        id: Date.now(),
        name: document.getElementById('prodName').value,
        image: document.getElementById('prodImage').value,
        cost: parseFloat(document.getElementById('prodCost').value),
        price: parseFloat(document.getElementById('prodPrice').value),
        hidden: false
    };
    products.push(newP);
    saveAppData();
    closeModal('addProductModal');
    renderAdminDashboard();
}

function toggleProductVisibility(id) {
    const p = products.find(item => item.id === id);
    if (p) p.hidden = !p.hidden;
    saveAppData();
    renderAdminDashboard();
}

function deleteProduct(id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        products = products.filter(item => item.id !== id);
        saveAppData();
        renderAdminDashboard();
    }
}

function openSupermarketsModal() {
    renderSupermarketsList();
    document.getElementById('supermarketModal').classList.add('active');
}

function saveSupermarket(e) {
    e.preventDefault();
    const name = document.getElementById('smName').value;
    const phone = document.getElementById('smPhone').value;
    supermarkets.push({ name, phone });
    saveAppData();
    document.getElementById('smName').value = '';
    document.getElementById('smPhone').value = '';
    renderSupermarketsList();
}

function renderSupermarketsList() {
    const container = document.getElementById('supermarketsListContainer');
    container.innerHTML = supermarkets.map((s, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-main); padding:10px; border-radius:8px; margin-bottom:8px;">
            <div><strong>${s.name}</strong><br><small style="color:var(--text-muted)">${s.phone}</small></div>
            <button class="btn-outline" style="border-color:var(--danger); color:var(--danger); padding:4px 8px; font-size:0.75rem;" onclick="deleteSupermarket(${idx})">حذف</button>
        </div>
    `).join('');
}

function deleteSupermarket(idx) {
    supermarkets.splice(idx, 1);
    saveAppData();
    renderSupermarketsList();
}

function exportInventoryPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("Cairo", "normal");
    doc.text("تقرير جرد المخزون والأرباح اليومية", 105, 20, { align: "center" });
    
    let y = 40;
    products.forEach(p => {
        let profit = p.price - p.cost;
        doc.text(`${p.name} | التكلفة: ${p.cost} | البيع: ${p.price} | الربح: ${profit.toFixed(2)} د.أ`, 20, y);
        y += 10;
    });
    doc.save("inventory_report.pdf");
}