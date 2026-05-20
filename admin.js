import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    deleteDoc,
    updateDoc
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

let finalImageBase64 = ""; // Այստեղ կպահվի ավելացվող սեղմված նկարի կոդը
let editImageBase64 = "";  // Այստեղ կպահվի խմբագրվող նկարի կոդը
let currentEditingProductId = null; // Խմբագրվող ապրանքի ID-ն

// 1. ՆԿԱՐԸ ՊԱՏԿԵՐԱՍՐԱՀԻՑ ԸՆՏՐԵԼՈՒ ԵՎ ԱՎՏՈՄԱՏ ՍԵՂՄԵԼՈՒ (COMPRESS) ՖՈՒՆԿՑԻԱՆ (ԱՎԵԼԱՑՄԱՆ ՀԱՄԱՐ)
document.getElementById('prodImageFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('uploadStatus');
    const label = document.getElementById('fileLabel');
    statusDiv.style.display = "block";
    statusDiv.innerText = "Նկարը օպտիմալացվում և սեղմվում է...";
    statusDiv.style.color = "#d4af37";

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const MAX_WIDTH = 600;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            finalImageBase64 = canvas.toDataURL('image/jpeg', 0.7);

            const preview = document.getElementById('imagePreview');
            preview.src = finalImageBase64;
            preview.style.display = "block";
            
            statusDiv.innerText = "✓ Նկարը պատրաստ է (Օպտիմալացված)";
            statusDiv.style.color = "#00ff00";
            label.innerText = "✓ Նկարը ընտրված է";
        };
        img.src = event.target.result;
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
        await addDoc(collection(db, "products"), {
            name: name,
            brand: brand,
            price: price,
            stock: stock,
            image: finalImageBase64,
            description: description,
            createdAt: new Date()
        });

        alert(`«${name}» օծանելիքը հաջողությամբ ավելացվեց բազա:`);
        
        // Մաքրում ենք դաշտերը
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

// 3. ԱՊՐԱՆՔՆԵՐԻ ՍՏԱՑՈՒՄ ԻՐԱԿԱՆ ԺԱՄԱՆԱԿՈՒՄ (REAL-TIME ԼՍՈՂ)
const productsCollectionRef = collection(db, "products");
const prodQuery = query(productsCollectionRef, orderBy("createdAt", "desc"));

onSnapshot(prodQuery, (snapshot) => {
    const tableBody = document.getElementById('adminProductsList');
    if (!tableBody) return; // Ապահովության համար, եթե ID-ն սխալ լինի HTML-ում
    
    tableBody.innerHTML = "";

    if (snapshot.empty) {
        tableBody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#888;'>Ապրանքներ չկան</td></tr>";
        return;
    }

    snapshot.forEach((productDoc) => {
        const product = productDoc.data();
        const productId = productDoc.id;

        // Պահում ենք տվյալները կոճակի մեջ որպես attribute՝ մոդալում հեշտ բացելու համար
        tableBody.innerHTML += `
            <tr id="product-${productId}">
                <td><img src="${product.image || 'assets/no-image.png'}" width="50" height="50" style="object-fit:cover; border-radius:4px;"></td>
                <td><strong>${product.name}</strong></td>
                <td>${product.brand}</td>
                <td>${product.price} ֏</td>
                <td>${product.stock} հատ</td>
                <td>
                    <button class="btn-edit" onclick="editProduct('${productId}', \`${encodeURIComponent(JSON.stringify(product))}\`)" style="background:transparent; border:none; cursor:pointer; font-size:16px; margin-right:10px;">✏️</button>
                    <button class="btn-delete" onclick="deleteProduct('${productId}', '${product.name}')" style="background:transparent; border:none; cursor:pointer; font-size:16px;">🗑️</button>
                </td>
            </tr>
        `;
    });
});

// 4. ԱՊՐԱՆՔ ՋՆՋԵԼՈՒ ՖՈՒՆԿՑԻԱՆ
async function deleteProduct(id, name) {
    if (confirm(`Վստա՞հ եք, որ ցանկանում եք ջնջել «${name}» ապրանքը բազայից:`)) {
        try {
            await deleteDoc(doc(db, "products", id));
            alert("Ապրանքը հաջողությամբ ջնջվեց։");
        } catch (error) {
            console.error("Error deleting product: ", error);
            alert("Չհաջողվեց ջնջել ապրանքը. " + error.message);
        }
    }
}

// 5. ԽՄԲԱԳՐՄԱՆ ՄՈԴԱԼ ՊԱՏՈՒՀԱՆԻ ԲԱՑՈՒՄ ԵՎ ՏՎՅԱԼՆԵՐԻ ԼՐԱՑՈՒՄ
function editProduct(id, encodedData) {
    currentEditingProductId = id;
    const product = JSON.parse(decodeURIComponent(encodedData));

    // Լրացնում ենք մոդալի input-ների արժեքները
    document.getElementById('editProdName').value = product.name;
    document.getElementById('editProdBrand').value = product.brand;
    document.getElementById('editProdPrice').value = product.price;
    document.getElementById('editProdStock').value = product.stock;
    document.getElementById('editProdDesc').value = product.description || "";
    
    // Ցուցադրում ենք ընթացիկ նկարը մոդալի նախադիտման մեջ
    const preview = document.getElementById('editImagePreview');
    if (preview) {
        preview.src = product.image;
        preview.style.display = "block";
    }
    
    // Լռելյայն հին նկարն ենք պահում, եթե նորը չընտրվի
    editImageBase64 = product.image;

    // Բացում ենք մոդալը (դասական ոճի փոփոխություն կամ CSS դասի ավելացում)
    const modal = document.getElementById('editProductModal');
    if (modal) modal.style.display = "flex";
}

// 6. ԽՄԲԱԳՐՎՈՂ ՆԿԱՐԻ ՍԵՂՄՈՒՄԸ (COMPRESS) ԵՐԲ ՆՈՐ ՆԿԱՐ ԵՆ ԸՆՏՐՈՒՄ ՄՈԴԱԼՈՒՄ
const editImageInput = document.getElementById('editProdImageFile');
if (editImageInput) {
    editImageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const MAX_WIDTH = 600;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                editImageBase64 = canvas.toDataURL('image/jpeg', 0.7);

                const preview = document.getElementById('editImagePreview');
                if (preview) preview.src = editImageBase64;
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 7. ՓՈՓՈԽՈՒԹՅՈՒՆՆԵՐԻ ՊԱՀՊԱՆՈՒՄ (UPDATE)
const saveEditBtn = document.getElementById('saveEditProdBtn');
if (saveEditBtn) {
    saveEditBtn.addEventListener('click', async () => {
        if (!currentEditingProductId) return;

        const name = document.getElementById('editProdName').value;
        const brand = document.getElementById('editProdBrand').value;
        const price = Number(document.getElementById('editProdPrice').value);
        const stock = Number(document.getElementById('editProdStock').value);
        const description = document.getElementById('editProdDesc').value;

        if (!name || !brand || !price || !stock || !editImageBase64) {
            alert("Խնդրում ենք լրացնել բոլոր պարտադիր դաշտերը։");
            return;
        }

        try {
            const productDocRef = doc(db, "products", currentEditingProductId);
            await updateDoc(productDocRef, {
                name: name,
                brand: brand,
                price: price,
                stock: stock,
                image: editImageBase64,
                description: description
            });

            alert("Ապրանքի տվյալները հաջողությամբ թարմացվեցին:");
            closeEditModal();

        } catch (error) {
            console.error("Error updating document: ", error);
            alert("Սխալ տեղի ունեցավ տվյալները թարմացնելիս։");
        }
    });
}

// 8. ՄՈԴԱԼ ՊԱՏՈՒՀԱՆԻ ՓԱԿՈՒՄ
function closeEditModal() {
    const modal = document.getElementById('editProductModal');
    if (modal) modal.style.display = "none";
    currentEditingProductId = null;
    editImageBase64 = "";
    const fileInput = document.getElementById('editProdImageFile');
    if (fileInput) fileInput.value = ""; // Մաքրում ենք ընտրված ֆայլը
}


// 9. ՊԱՏՎԵՐՆԵՐԻ ՍՏԱՑՈՒՄ ԻՐԱԿԱՆ ԺԱՄԱՆԱԿՈՒՄ (REAL-TIME)
const ordersCollectionRef = collection(db, "orders");
const q = query(ordersCollectionRef, orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    const container = document.getElementById('ordersListContainer');
    if (!container) return;
    
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

// 10. ՊԱՏՎԵՐ ՋՆՋԵԼՈՒ ՖՈՒՆԿՑԻԱՆ
async function deleteOrder(id) {
    if (confirm("Ցանկանու՞մ եք ջնջել այս պատվերը պատմությունից:")) {
        try {
            await deleteDoc(doc(db, "orders", id));
        } catch (error) {
            alert("Չհաջողվեց ջնջել պատվերը. " + error);
        }
    }
}

// ԳԼՈԲԱԼ ԿԱՊԵՐ (WINDOW OBJECT)՝ HTML ONCLICK-ԵՐԻ ՀԱՄԱՐ
window.deleteOrder = deleteOrder;
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;
window.closeEditModal = closeEditModal;
