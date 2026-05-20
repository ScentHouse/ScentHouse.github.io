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

let uploadedImageUrl = ""; // Այստեղ կպահվի ImgBB-ի տված օնլայն հղումը

// ՆԿԱՐԸ ՊԱՏԿԵՐԱՍՐԱՀԻՑ ԸՆՏՐԵԼՈՒ ԵՎ ԱՎՏՈՄԱՏ IMGBB ՈՒՂԱՐԿԵԼՈՒ ՏՐԱՄԱԲԱՆՈՒԹՅՈՒՆԸ
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
    statusDiv.innerText = "Նկարը մշակվում և բեռնվում է ամպային բազա...";
    statusDiv.style.color = "#d4af37";
    
    // Անջատում ենք ավելացնելու կոճակը, մինչև նկարը պատրաստ լինի
    document.getElementById('addProdBtn').disabled = true;

    // Պատրաստում ենք ֆայլը ուղարկելու համար
    const formData = new FormData();
    formData.append("image", file);

    // Օգտագործում ենք ImgBB API անվճար հանրային բանալին
    const apiKey = "6d20715c116a502cf9e0cc0d39e08fcb"; 

    fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if(data.success) {
            uploadedImageUrl = data.data.url; // Ստանում ենք նկարի մաքուր 4K հղումը
            statusDiv.innerText = "✓ Նկարը հաջողությամբ բեռնվեց բազա";
            statusDiv.style.color = "#00ff00";
            label.innerText = "✓ Նկարը ընտրված է";
        } else {
            throw new Error("ImgBB upload failed");
        }
        // Միացնում ենք ավելացնելու կոճակը
        document.getElementById('addProdBtn').disabled = false;
    })
    .catch(error => {
        console.error("Error:", error);
        statusDiv.innerText = "Նկարի բեռնման սխալ, փորձեք կրկին:";
        statusDiv.style.color = "crimson";
        document.getElementById('addProdBtn').disabled = false;
    });
});

// ԱՊՐԱՆՔԻ ԱՎԵԼԱՑՈՒՄ ԲԱԶԱՅԻՆ
document.getElementById('addProdBtn').addEventListener('click', async () => {
    const name = document.getElementById('prodName').value;
    const brand = document.getElementById('prodBrand').value;
    const price = Number(document.getElementById('prodPrice').value);
    const stock = Number(document.getElementById('prodStock').value);
    const description = document.getElementById('prodDesc').value;

    if (!name || !brand || !price || !stock || !uploadedImageUrl) {
        alert("Խնդրում ենք լրացնել բոլոր դաշտերը և ընտրել նկար պատկերասրահից։");
        return;
    }

    try {
        await addDoc(collection(db, "products"), {
            name: name,
            brand: brand,
            price: price,
            stock: stock,
            image: uploadedImageUrl, // Բազա է գնում ImgBB-ի ստեղծած հղումը
            description: description,
            createdAt: new Date()
        });

        alert(`«${name}» օծանելիքը հաջողությամբ ավելացվեց բազա:`);
        
        // Ֆորմայի մաքրում
        document.getElementById('prodName').value = "";
        document.getElementById('prodBrand').value = "";
        document.getElementById('prodPrice').value = "";
        document.getElementById('prodStock').value = "";
        document.getElementById('prodDesc').value = "";
        document.getElementById('imagePreview').style.display = "none";
        document.getElementById('uploadStatus').style.display = "none";
        document.getElementById('fileLabel').innerText = "📸 Ընտրել նկարը պատկերասրահից";
        uploadedImageUrl = ""; 

    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Սխալ տեղի ունեցավ ապրանքը ավելացնելիս։");
    }
});

// ՊԱՏՎԵՐՆԵՐԻ ՍՏԱՑՈՒՄ ԻՐԱԿԱՆ ԺԱՄԱՆԱԿՈՒՄ
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

        let itemsHtml = "";
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                itemsHtml += `<div>• <strong>${item.name}</strong> — ${item.qty} հատ (${item.price} ֏)</div>`;
            });
        }

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

async function deleteOrder(id) {
    if (confirm("Ցանկանու՞մ եք ջնջել այս պատվերը պատմությունից:")) {
        try {
            await deleteDoc(doc(db, "orders", id));
        } catch (error) {
            alert("Չհաջողվեց ջնջել պատվերը. " + error);
        }
    }
}
window.deleteOrder = deleteOrder;