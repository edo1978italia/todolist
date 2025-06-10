import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import firebaseConfig from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔥 FOTO PROFILO E EMAIL UTENTE
document.addEventListener("DOMContentLoaded", async function () {
    const userPhotoContainer = document.getElementById("userPhotoContainer");
    const userEmailElement = document.getElementById("userEmail");

    if (!userPhotoContainer || !userEmailElement) {
        console.warn("⚠ Elemento 'userPhotoContainer' o 'userEmail' non trovato nel DOM!");
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userEmailElement.innerText = user.email;

            try {
                const userRef = doc(db, "utenti", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const data = userSnap.data();
                    console.log("📌 Dati utente Firestore ricevuti:", JSON.stringify(data, null, 2));

                    if (data.fotoProfilo) {
                        console.log("🔄 Foto profilo trovata:", data.fotoProfilo);

                        // 🔥 Verifica se c'è già un'immagine, se sì, aggiorna solo il `src`
                        let imgElement = userPhotoContainer.querySelector("img");
                        if (!imgElement) {
                            imgElement = document.createElement("img");
                            imgElement.classList.add("user-photo");
                            userPhotoContainer.appendChild(imgElement);
                        }
                        imgElement.src = data.fotoProfilo;
                        imgElement.alt = "Foto profilo";

                    } else {
                        console.warn("⚠ Foto profilo non impostata!");
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

// 🔥 Sidebar toggle
document.addEventListener("DOMContentLoaded", function () {
    const openSidebarButton = document.getElementById("openSidebar");
    if (openSidebarButton) {
        openSidebarButton.addEventListener("click", toggleSidebar);
    }
});

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

