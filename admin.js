import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

let finalImageBase64 = ""; // Այստեղ կպահվի նկարի տեքստային կոդը

// 1. ՆԿԱՐԸ ՊԱՏԿԵՐԱՍՐԱՀԻՑ ԸՆՏՐԵԼՈՒ ԵՎ ՏԵՔՍՏԻ (BASE64) ՎԵՐԱԾԵԼՈՒ ՖՈՒՆԿՑԻԱՆ
document.getElementById('prodImageFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Ցուցադրում ենք նախադիտումը (Preview) ադմինին
    const preview = document.getElementById('imagePreview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";

    const statusDiv = document.getElementById('uploadStatus');
    const label = document.getElementById('fileLabel');
    statusDiv.style.display = "block";
    statusDiv.innerText = "Նկարը մշակվում է...";
    statusDiv.style.color = "#d4af37";

    // Օգտագործում ենք FileReader՝ նկարը տեքստ սարքելու համար (ՉԻ ՕԳՏԱԳՈՐԾՈՒՄ ԻՆՏԵՐՆԵՏ)
    const reader = new FileReader();
    reader.onloadend = function() {
        finalImageBase64 = reader.result; // Նկարի ամբողջական տեքստային կոդը
        
        statusDiv.innerText = "✓ Նկարը պատրաստ է ավելացման";
        statusDiv.style.color = "#00ff00";
        label.innerText = "✓ Նկարը ընտրված է";
    };
    
    reader.readAsDataURL(file);
});

// 2. ԱՊՐԱՆՔԻ ԱՎԵԼԱՑՈՒՄ ԲԱԶԱՅԻՆ
document.getElementById('addProdBtn').addEventListener('click', async () => {
    const name = document.getElementById('prodName').value;
    const brand = document.getElementById('prodBrand').value;
    const price = Number(document.getElementById('prodPrice').value);
    const stock = Number(document.getElementById('prodStock').value);
    const description = document.getElementById('prodDesc').value;

    if (!name || !brand || !price || !stock || !finalImageBase64) {
        alert("Խնդրում ենք լրացնել բոլոր դաշտերը և ընտրել նկար պատկերասրահից։");
        return;
    }

    try {
        // Ավելացնում ենք Firestore "products" հավաքածուի մեջ
        await addDoc(collection(db, "products"), {
            name: name,
            brand: brand,
            price: price,
            stock: stock,
            image: finalImageBase64, // Բազա է գնում հենց նկարի տեքստը
            description: description,
            createdAt: new Date()
        });

        alert(`«${name}» օծանելիքը հաջողությամբ ավելացվեց բազա:`);
        
        // Մաքրում ենք դաշտերը հաջորդ ապրանքի համար
        document.getElementById('prodName').value = "";
        document.getElementById('prodBrand').value = "";
        document.getElementById('prodPrice').value = "";
        document.getElementById('prodStock').value = "";
        document.getElementById('prodDesc').value = "";
        document.getElementById('imagePreview').style.display = "none";
        document.getElementById('uploadStatus').style.display = "none";
        document.getElementById('fileLabel').innerText = "📸 Ընտրել նկարը պատկերասրահից";
        finalImageBase64 = ""; 

    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Սխալ տեղի ունեցավ ապրանքը ավելացնելիս։");
    }
});

// 3. ՊԱՏՎԵՐՆԵՐԻ ՍՏԱՑՈՒՄ ԻՐԱԿԱՆ ԺԱՄԱՆԱԿՈՒՄ (REAL-TIME)
const ordersCollectionRef = collection(db, "orders");
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

        // Հավաքում ենք պատվիրված ապրանքների HTML-ը
        let itemsHtml = "";
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                itemsHtml += `<div>• <strong>${item.name}</strong> — ${item.qty} հատ (${item.price} ֏)</div>`;
            });
        }

        // Ստուգում ենք ամսաթիվը
        let dateString = "Նոր պատվեր";
        if (order.createdAt) {
            const date = order.createdAt.toDate();
            dateString = date.toLocaleString('hy-AM');
        }

        // Ավելացնում ենք պատվերի քարտը էջին
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

// 4. ՊԱՏՎԵՐ ՋՆՋԵԼՈՒ ՖՈՒՆԿՑԻԱՆ
async function deleteOrder(id) {
    if (confirm("Ցանկանու՞մ եք ջնջել այս պատվերը պատմությունից:")) {
        try {
            await deleteDoc(doc(db, "orders", id));
        } catch (error) {
            alert("Չհաջողվեց ջնջել պատվերը. " + error);
        }
    }
}

// Քանի որ սա type="module" է, ֆունկցիան կցում ենք window-ին, որ HTML-ի button-ը տեսնի այն
window.deleteOrder = deleteOrder;
