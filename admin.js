import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    deleteDoc 
} from "firebase/firestore";

// FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyCDyaaJoqgLlxsqglqMT-AfEk1abHhpWU0",
  authDomain: "scenthouse-a7e94.firebaseapp.com",
  projectId: "scenthouse-a7e94",
  storageBucket: "scenthouse-a7e94.firebasestorage.app",
  messagingSenderId: "849592505632",
  appId: "1:849592505632:web:fe3a466a9cc583dc79b345",
  measurementId: "G-D5XXG99KHM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. ԱՊՐԱՆՔԻ ԱՎԵԼԱՑՈՒՄ ԲԱԶԱՅԻՆ (PRODUCTS COLLECTION)
document.getElementById('addProdBtn').addEventListener('click', async () => {
    const name = document.getElementById('prodName').value;
    const brand = document.getElementById('prodBrand').value;
    const price = Number(document.getElementById('prodPrice').value);
    const stock = Number(document.getElementById('prodStock').value);
    const image = document.getElementById('prodImage').value;
    const description = document.getElementById('prodDesc').value;

    if (!name || !brand || !price || !stock || !image) {
        alert("Խնդրում ենք լրացնել բոլոր պարտադիր դաշտերը (Անուն, Բրենդ, Գին, Քանակ, Նկար)։");
        return;
    }

    try {
        await addDoc(collection(db, "products"), {
            name: name,
            brand: brand,
            price: price,
            stock: stock,
            image: image,
            description: description,
            createdAt: new Date()
        });

        alert(`«${name}» օծանելիքը հաջողությամբ ավելացվեց բազա:`);
        
        // Մաքրում ենք ֆորմայի դաշտերը
        document.getElementById('prodName').value = "";
        document.getElementById('prodBrand').value = "";
        document.getElementById('prodPrice').value = "";
        document.getElementById('prodStock').value = "";
        document.getElementById('prodImage').value = "";
        document.getElementById('prodDesc').value = "";

    } catch (error) {
        console.error("Ապրանքը ավելացնելու սխալ:", error);
        alert("Սխալ տեղի ունեցավ ապրանքը ավելացնելիս։");
    }
});

// 2. ՊԱՏՎԵՐՆԵՐԻ ՍՏԱՑՈՒՄ ԻՐԱԿԱՆ ԺԱՄԱՆԱԿՈՒՄ (REAL-TIME ORDERS)
const ordersCollectionRef = collection(db, "orders");
// Պատվերները դասավորում ենք ըստ ստեղծման ժամանակի (նորերը վերևում)
const q = query(ordersCollectionRef, orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    const container = document.getElementById('ordersListContainer');
    container.innerHTML = "";

    if (snapshot.empty) {
        container.innerHTML = "<p style='color: #888; text-align: center;'>Առայժմ պատվերներ չկան</p>";
        return;
    }

    snapshot.forEach((orderDoc) => {
        const order = orderDoc.data();
        const orderId = orderDoc.id;

        // Ձևավորում ենք պատվիրված ապրանքների տեքստը
        let itemsHtml = "";
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                itemsHtml += `<div>• <strong>${item.name}</strong> — ${item.qty} հատ (${item.price} ֏)</div>`;
            });
        }

        // Պատվերի ամսաթիվը ստանալ
        let dateString = "Նոր պատվեր";
        if (order.createdAt) {
            const date = order.createdAt.toDate();
            dateString = date.toLocaleString('hy-AM');
        }

        container.innerHTML += `
            <div class="order-card" id="order-${orderId}">
                <div class="order-meta">Ժամանակ՝ ${dateString}</div>
                <div style="font-size: 16px; margin-bottom: 5px;">
                    Գնորդ՝ <strong>${order.customerName}</strong>
                </div>
                <div style="color: #ccc; font-size: 14px;">
                    📞 Հեռախոս՝ <a href="tel:${order.phone}" style="color:#d4af37; text-decoration:none;">${order.phone}</a><br>
                    📍 Հասցե՝ ${order.address}
                </div>
                
                <div class="order-items">
                    ${itemsHtml}
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                    <div style="color: #d4af37; font-weight:bold;">Ընդհանուր՝ ${order.totalPrice} ֏</div>
                    <button onclick="deleteOrder('${orderId}')" style="background:crimson; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">
                        Ջնջել / Ավարտել
                    </button>
                </div>
            </div>
        `;
    });
});

// 3. ՊԱՏՎԵՐԸ ՋՆՋԵԼՈՒ ՖՈՒՆԿՑԻԱ (ԵՐԲ ՕՐԻՆԱԿ ԱՌԱՔՈՒՄԸ ԱՎԱՐՏՎՈՒՄ Է)
async function deleteOrder(id) {
    if (confirm("Ցանկանու՞մ եք ջնջել այս պատվերը պատմությունից:")) {
        try {
            await deleteDoc(doc(db, "orders", id));
        } catch (error) {
            alert("Չհաջողվեց ջնջել պատվերը. " + error);
        }
    }
}
// Կապում ենք window-ին, որպեսզի onclick-ը HTML-ից աշխատի
window.deleteOrder = deleteOrder;