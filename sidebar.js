import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🔥 Firebase inizializzato:", app);

document.addEventListener("DOMContentLoaded", async function () {
    const userPhotoContainer = document.getElementById("userPhotoContainer");
    const userEmailElement = document.getElementById("userEmail");
    const sidebarContainer = document.getElementById("sidebar-container");
    const openSidebarButton = document.getElementById("openSidebar"); // 🔥 Pulsante di apertura sidebar

    if (!userPhotoContainer || !userEmailElement || !sidebarContainer || !openSidebarButton) {
        console.warn("⚠ Elementi necessari non trovati nel DOM!");
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userEmailElement.innerText = user.email;
            sidebarContainer.style.display = "block"; // ✅ Mostra la sidebar se l'utente è loggato
            openSidebarButton.style.display = "block"; // ✅ Mostra il pulsante di apertura

            try {
                const userRef = doc(db, "utenti", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const data = userSnap.data();
                    console.log("📌 Dati utente Firestore ricevuti:", JSON.stringify(data, null, 2));

                    if (data.fotoProfilo) {
                        let imgElement = userPhotoContainer.querySelector("img");
                        if (!imgElement) {
                            imgElement = document.createElement("img");
                            imgElement.classList.add("user-photo");
                            userPhotoContainer.appendChild(imgElement);
                        }
                        imgElement.src = data.fotoProfilo;
                        imgElement.alt = "Foto profilo";
                    }
                }
            } catch (error) {
                console.error("❌ Errore nel recupero della foto profilo:", error);
            }
        } else {
            console.warn("⚠ Utente non autenticato!");

            // 🔥 Nasconde sidebar e pulsante di apertura dopo il logout
            sidebarContainer.style.display = "none";
            openSidebarButton.style.display = "none";
            userEmailElement.innerText = "Non autenticato";
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
