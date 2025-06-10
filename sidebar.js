import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import firebaseConfig from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔥 FOTO PROFILO
document.addEventListener("DOMContentLoaded", async function () {
    const userPhotoContainer = document.getElementById("userPhotoContainer");
    const userEmailElement = document.getElementById("userEmail");

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userEmailElement.innerText = user.email;

            try {
                const userRef = doc(db, "utenti", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const data = userSnap.data();
                    console.log("📌 Dati utente Firestore:", data);

                    if (data.fotoProfilo) {
                        console.log("🔄 Foto profilo trovata:", data.fotoProfilo);

                        const imgElement = document.createElement("img");
                        imgElement.src = data.fotoProfilo;
                        imgElement.alt = "Foto profilo";
                        imgElement.classList.add("user-photo");

                        userPhotoContainer.innerHTML = ""; // 🔥 Pulisce eventuali contenuti precedenti
                        userPhotoContainer.appendChild(imgElement); // 🔥 Inserisce la foto
                    } else {
                        console.warn("⚠ Foto profilo non impostata.");
                    }
                } else {
                    console.warn("⚠ Documento utente non trovato.");
                }
            } catch (error) {
                console.error("❌ Errore nel recupero della foto profilo:", error);
            }
        } else {
            console.warn("⚠ Utente non autenticato!");
            userEmailElement.innerText = "Non autenticato";
        }
    });
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "utenti", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            console.log("📌 Dati utente Firestore:", JSON.stringify(data, null, 2)); // 🔥 Stampa i dati in formato leggibile

            if (data.fotoProfilo) {
                console.log("🔄 Foto profilo trovata:", data.fotoProfilo);
            } else {
                console.warn("⚠ Foto profilo non impostata!");
            }
        } else {
            console.warn("⚠ Documento utente non trovato.");
        }
    } else {
        console.warn("⚠ Utente non autenticato!");
    }
});



// 🔥 Verifica che il codice venga eseguito quando `sidebar.html` è aperto direttamente
document.addEventListener("DOMContentLoaded", function () {
    const openSidebarButton = document.getElementById("openSidebar");
    if (openSidebarButton) {
        openSidebarButton.addEventListener("click", toggleSidebar);
    }
});

// 🔥 Funzione per aprire/chiudere la sidebar
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) {
        console.warn("⚠ Sidebar non trovata!");
        return;
    }
    sidebar.style.left = sidebar.style.left === "0px" ? "-300px" : "0px";
    console.log("🔄 Sidebar toggled:", sidebar.style.left);
};

// 🔥 Debug: Logga i pulsanti cliccati
document.querySelectorAll("nav button").forEach((button) => {
    button.addEventListener("click", function () {
        console.log("Pulsante cliccato:", button.innerText);
    });
});
