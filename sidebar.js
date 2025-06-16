import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

console.log("🔥 Inizio esecuzione sidebar.js...");

const app = initializeApp(firebaseConfig);
console.log("[✓] Firebase inizializzato:", app);

const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async function () {
    console.log("[✓] DOM completamente caricato");

    const userPhotoContainer = document.getElementById("userPhotoContainer");
    const userEmailElement = document.getElementById("userEmail");
    const sidebarContainer = document.getElementById("sidebar-container");
    const openSidebarButton = document.getElementById("openSidebar");
    const logoutButton = document.getElementById("logoutButton");

    if (!userPhotoContainer || !userEmailElement || !sidebarContainer || !openSidebarButton || !logoutButton) {
        console.warn("⚠ Elementi necessari non trovati nel DOM!");
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        console.log("[✓] Evento onAuthStateChanged attivato");

        if (user) {
            console.log("[✓] Utente autenticato:", user.email);

            userEmailElement.innerText = user.email;
            sidebarContainer.style.display = "block";
            openSidebarButton.style.display = "block";

            const avatarEl = document.getElementById("userAvatar");
            if (avatarEl) {
                console.log("[✓] Elemento avatar trovato nel DOM");

                // 🔥 Usa prima la foto di Firebase Auth, poi il fallback Firestore
                avatarEl.src = user.photoURL || "default.png"; 
                console.log("[✓] Foto impostata da auth.currentUser:", user.photoURL);

                try {
                    console.log("[✓] Tentativo di recupero dati utente da Firestore...");
                    const userRef = doc(db, "users", user.uid);
                    const snap = await getDoc(userRef);
                    const data = snap.data();

                    if (data?.photoURL) {
                        avatarEl.src = data.photoURL; // 🔥 Aggiornamento forzato
                        console.log("[✓] Foto aggiornata da Firestore:", data.photoURL);
                    } else {
                        console.warn("⚠ Nessuna photoURL trovata in Firestore, mantiene default.");
                    }
                } catch (err) {
                    console.error("❌ Errore nel recuperare la photoURL:", err);
                }
            } else {
                console.warn("⚠ Avatar non trovato nel DOM!");
            }
        } else {
            console.warn("⚠ Nessun utente autenticato!");
            sidebarContainer.style.display = "none";
            openSidebarButton.style.display = "none";
            userEmailElement.innerText = "Non autenticato";

            const avatarEl = document.getElementById("userAvatar");
            if (avatarEl) {
                avatarEl.src = "default.png";
                console.log("[✓] Foto impostata su default.");
            }
        }
    });

    logoutButton.addEventListener("click", async () => {
        console.log("[✓] Bottone Logout cliccato");
        try {
            await signOut(auth);
            console.log("✅ Logout completato!");
            sidebarContainer.style.display = "none";
            openSidebarButton.style.display = "none";
        } catch (error) {
            console.error("❌ Errore nel logout:", error);
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const openSidebarButton = document.getElementById("openSidebar");
    if (openSidebarButton) {
        openSidebarButton.addEventListener("click", () => {
            toggleSidebar();
            console.log("✅ Click rilevato e sidebar aperta!");
        });
    }
});

window.toggleSidebar = function () {
    console.log("[✓] Funzione toggleSidebar attivata");
    const sidebar = document.getElementById("sidebar");

    if (!sidebar) {
        console.warn("⚠ Sidebar non trovata!");
        return;
    }

    sidebar.style.left = sidebar.style.left === "0px" ? "-300px" : "0px";
    console.log("🔄 Sidebar toggled:", sidebar.style.left);
};

document.querySelectorAll("nav button").forEach((button) => {
    button.addEventListener("click", function () {
        console.log("Pulsante navigazione cliccato:", button.innerText);
    });
});
