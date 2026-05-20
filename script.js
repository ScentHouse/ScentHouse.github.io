// 1. FIREBASE SDK-ՆԵՐԻ IMPORT
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    doc, 
    runTransaction, 
    serverTimestamp 
} from "firebase/firestore";

// 2. FIREBASE CONFIGURATION (Քո ScentHouse նախագծի իրական տվյալները)
const firebaseConfig = {
  apiKey: "AIzaSyCDyaaJoqgLlxsqglqMT-AfEk1abHhpWU0",
  authDomain: "scenthouse-a7e94.firebaseapp.com",
  projectId: "scenthouse-a7e94",
  storageBucket: "scenthouse-a7e94.firebasestorage.app",
  messagingSenderId: "849592505632",
  appId: "1:849592505632:web:fe3a466a9cc583dc79b345",
  measurementId: "G-D5XXG99KHM"
};

// Ինիցիալիզացնում ենք Firebase-ը, Analytics-ը և Firestore-ը
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Գլոբալ փոփոխականներ
let dbProducts = []; 
let cart = [];
let filteredProducts = [];

// 3. ԱԴՄԻՆԻ ՄՈՒՏՔ
function openAdmin() {
    let password = prompt("Մուտքագրեք գաղտնաբառը՝");
    if (password === "2008.02") {
        window.location.href = "admin.html";
    } else if (password !== null) {
        alert("Սխալ գաղտնաբառ!");
    }
}
window.openAdmin = openAdmin; // Կապում ենք window-ին, որ HTML-ից աշխատի

// 4. ԱՊՐԱՆՔՆԵՐԻ ՍՏԱՑՈՒՄ ԻՐԱԿԱՆ ԺԱՄԱՆԱԿՈՒՄ (REAL-TIME FETCH)
const productsCollectionRef = collection(db, "products");

onSnapshot(productsCollectionRef, (snapshot) => {
    dbProducts = [];
    snapshot.forEach((doc) => {
        dbProducts.push({ id: doc.id, ...doc.data() });
    });
    // Պահում ենք որոնման/տեսակավորման վիճակը թարմանալիս
    applySearchAndSort();
});

// Ապրանքները էկրանին ցուցադրել
function renderProducts() {
    const container = document.getElementById('productsList');
    if (!container) return;
    container.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        container.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:#888;'>Ապրանք չի գտնվել</p>";
        return;
    }

    filteredProducts.forEach(product => {
        // Ստուգում ենք՝ արդյոք պահեստում օծանելիք մնացել է
        const isOutOfStock = product.stock <= 0;
        
        container.innerHTML += `
            <div class="product-card" onclick="${isOutOfStock ? '' : `openProductModal('${product.id}')`}">
                <div class="product-img-placeholder" style="background: url('${product.image || ''}') center/cover #222;"></div>
                <h3>${product.name}</h3>
                <p style="color: #888; font-size: 12px;">Պահեստում՝ ${product.stock} հատ</p>
                <div class="price">${product.price} ֏</div>
                <button class="gold-btn" 
                    ${isOutOfStock ? 'disabled style="background:#444; color:#888; cursor:not-allowed;"' : ''} 
                    onclick="event.stopPropagation(); addToCart('${product.id}', '${product.name}', ${product.price})">
                    ${isOutOfStock ? 'Վերջացել է' : 'Ավելացնել'}
                </button>
            </div>
        `;
    });
}

// 5. ՈՐՈՆՄԱՆ ԵՎ ՏԵՍԱԿԱՎՈՐՄԱՆ ՄԻԱՍՆԱԿԱՆ ՏՐԱՄԱԲԱՆՈՒԹՅՈՒՆ
function applySearchAndSort() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const sortType = document.getElementById('priceSort').value;

    // Սկզբից ֆիլտրում ենք ըստ որոնման
    filteredProducts = dbProducts.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.brand.toLowerCase().includes(query)
    );

    // Հետո տեսակավորում ենք ըստ գնի
    if (sortType === 'lowToHigh') {
        filteredProducts.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortType === 'highToLow') {
        filteredProducts.sort((a, b) => Number(b.price) - Number(a.price));
    }

    renderProducts();
}

function handleSearch() {
    applySearchAndSort();
}
window.handleSearch = handleSearch;

function handleSort() {
    applySearchAndSort();
}
window.handleSort = handleSort;

// 6. ԱՊՐԱՆՔԻ ՄԵԾԱՑՎԱԾ ՊԱՏՈՒՀԱՆ
function openProductModal(id) {
    const product = dbProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('modalProductName').innerText = product.name;
    document.getElementById('modalProductBrand').innerText = product.brand;
    document.getElementById('modalProductPrice').innerText = product.price + " ֏";
    
    // Ցուցադրում ենք նկարը մոդալի div-ի մեջ
    document.getElementById('modalProductImg').style.background = `url('${product.image || ''}') center/cover #222`;
    
    if(document.getElementById('modalProductDesc') && product.description) {
        document.getElementById('modalProductDesc').innerText = product.description;
    }
    
    const addToCartBtn = document.getElementById('modalAddToCartBtn');
    addToCartBtn.onclick = function() {
        addToCart(product.id, product.name, product.price);
        closeProductModal();
    };

    document.getElementById('productModal').style.display = "flex";
}
window.openProductModal = openProductModal;

function closeProductModal() {
    document.getElementById('productModal').style.display = "none";
}
window.closeProductModal = closeProductModal;

// 7. ԶԱՄԲՅՈՒՂԻ ՏՐԱՄԱԲԱՆՈՒԹՅՈՒՆ
function addToCart(id, name, price) {
    const product = dbProducts.find(p => p.id === id);
    let existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        if (existingItem.qty >= product.stock) {
            alert("Պահեստում եղած քանակից ավել չեք կարող գնել։");
            return;
        }
        existingItem.qty += 1;
    } else {
        cart.push({ id, name, price, qty: 1 });
    }
    updateCartUI();
}
window.addToCart = addToCart;

function updateCartUI() {
    const container = document.getElementById('cartItemsContainer');
    const countSpan = document.getElementById('cartCount');
    const totalSection = document.getElementById('cartTotalSection');
    const totalPriceSpan = document.getElementById('cartTotalPrice');

    countSpan.innerText = cart.reduce((sum, item) => sum + item.qty, 0);

    if (cart.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#888; padding: 20px 0;'>Ձեր զամբյուղը դատարկ է</p>";
        totalSection.style.display = "none";
        return;
    }

    let html = "";
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.qty;
        html += `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">
                <div>
                    <strong>${item.name}</strong><br>
                    <span style="color:#d4af37">${item.price} ֏ × ${item.qty}</span>
                </div>
                <div class="cart-qty" style="display:flex; gap:5px; align-items:center;">
                    <button onclick="changeQty(${index}, -1)" style="padding:2px 8px;">-</button>
                    <span>${item.qty}</span>
                    <button onclick="changeQty(${index}, 1)" style="padding:2px 8px;">+</button>
                    <button class="remove-btn" onclick="removeItem(${index})" style="background:crimson; border:none; color:white; padding:2px 6px; cursor:pointer; margin-left:10px;">X</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    totalPriceSpan.innerText = total;
    totalSection.style.display = "block";
}

function changeQty(index, amount) {
    const item = cart[index];
    const product = dbProducts.find(p => p.id === item.id);

    if (amount > 0 && item.qty >= product.stock) {
        alert("Պահեստում ավել ապրանք չկա։");
        return;
    }

    item.qty += amount;
    if (item.qty <= 0) {
        cart.splice(index, 1);
    }
    updateCartUI();
}
window.changeQty = changeQty;

function removeItem(index) {
    cart.splice(index, 1);
    updateCartUI();
}
window.removeItem = removeItem;

function toggleCart() {
    const modal = document.getElementById('cartModal');
    modal.style.display = modal.style.display === "flex" ? "none" : "flex";
    updateCartUI();
}
window.toggleCart = toggleCart;

function openOrderForm() {
    document.getElementById('cartModal').style.display = "none";
    document.getElementById('orderModal').style.display = "flex";
}
window.openOrderForm = openOrderForm;

function closeOrderForm() {
    document.getElementById('orderModal').style.display = "none";
}
window.closeOrderForm = closeOrderForm;

// 8. ՊԱՏՎԵՐԻ ԳՐԱՆՑՈՒՄ ԵՎ ՔԱՆԱԿԻ ԱՎՏՈՄԱՏ ՊԱԿԱՍԵՑՈՒՄ (TRANSACTION)
async function submitOrder() {
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const address = document.getElementById('custAddress').value;

    if(name === "" || phone === "" || address === "") {
        alert("Խնդրում ենք լրացնել բոլոր դաշտերը");
        return;
    }

    const orderData = {
        customerName: name,
        phone: phone,
        address: address,
        items: cart,
        totalPrice: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        status: "pending",
        createdAt: serverTimestamp()
    };

    try {
        // Սկսում ենք ապահով տրանզակցիան
        await runTransaction(db, async (transaction) => {
            const productRefs = cart.map(item => doc(db, "products", item.id));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            // 1. Ստուգում ենք պահեստի քանակները
            for (let i = 0; i < cart.length; i++) {
                const docSnap = productDocs[i];
                const item = cart[i];
                if (!docSnap.exists()) {
                    throw "Ապրանքներից մեկը գոյություն չունի բազայում:";
                }
                const currentStock = docSnap.data().stock || 0;
                if (currentStock < item.qty) {
                    throw `Ցավոք, "${item.name}"-ից պահեստում մնացել է ընդամենը ${currentStock} հատ։`;
                }
            }

            // 2. Թարմացնում ենք ապրանքների մնացորդային քանակը
            for (let i = 0; i < cart.length; i++) {
                const docSnap = productDocs[i];
                const item = cart[i];
                const newStock = docSnap.data().stock - item.qty;
                transaction.update(productRefs[i], { stock: newStock });
            }

            // 3. Գրանցում ենք նոր պատվերը "orders" հավաքածուի (collection) մեջ
            const newOrderRef = doc(collection(db, "orders"));
            transaction.set(newOrderRef, orderData);
        });

        alert("Շնորհակալություն, ձեր պատվերն ընդունված է և ավտոմատ գրանցվել է բազայում։");
        
        // Մաքրում ենք տվյալները պատվերից հետո
        cart = [];
        document.getElementById('custName').value = "";
        document.getElementById('custPhone').value = "";
        document.getElementById('custAddress').value = "";
        
        updateCartUI();
        closeOrderForm();

    } catch (error) {
        console.error("Պատվերի սխալ:", error);
        alert("Պատվերը չհաջողվեց. " + error);
    }
}
window.submitOrder = submitOrder;