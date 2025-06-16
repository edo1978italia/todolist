import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🔥 Firebase inizializzato:", app);

document.addEventListener("DOMContentLoaded", async function () {
    const userPhotoContainer = document.getElementById("userPhotoContainer");
    const userEmailElement = document.getElementById("userEmail");
    const sidebarContainer = document.getElementById("sidebar-container");
    const openSidebarButton = document.getElementById("openSidebar");
    const logoutButton = document.getElementById("logoutButton"); // 🔥 Pulsante logout

    if (!userPhotoContainer || !userEmailElement || !sidebarContainer || !openSidebarButton || !logoutButton) {
        console.warn("⚠ Elementi necessari non trovati nel DOM!");
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userEmailElement.innerText = user.email;
            sidebarContainer.style.display = "block";
            openSidebarButton.style.display = "block";

            // 🔥 Aggiorna immagine profilo
            const avatarEl = document.getElementById("userAvatar");
            if (avatarEl) {
                try {
                    const userRef = doc(db, "users", user.uid);
                    const snap = await getDoc(userRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        if (data.photoURL) {
                            avatarEl.src = data.photoURL;
                        }
                    }
                } catch (err) {
                    console.warn("⚠ Errore nel recuperare la photoURL:", err);
                }
            }
        } else {
            console.warn("⚠ Utente non autenticato!");
            sidebarContainer.style.display = "none";
            openSidebarButton.style.display = "none";
            userEmailElement.innerText = "Non autenticato";

            // 🔥 Reimposta immagine default (se esiste)
            const avatarEl = document.getElementById("userAvatar");
            if (avatarEl) {
                avatarEl.src = "default.png";
            }
        }
    });

    // 🔥 Gestione logout - Nasconde sidebar e pulsante immediatamente
    logoutButton.addEventListener("click", async () => {
        try {
            await signOut(auth);
            console.log("✅ Logout completato!");

            sidebarContainer.style.display = "none"; // ✅ Nasconde sidebar
            openSidebarButton.style.display = "none"; // ✅ Nasconde pulsante
        } catch (error) {
            console.error("❌ Errore nel logout:", error);
        }
    });
});

// 🔥 Sidebar toggle
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
