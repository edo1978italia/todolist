import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import firebaseConfig from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", function () {
    const userEmailElement = document.getElementById("userEmail");
    const userPhotoElement = document.getElementById("userPhoto");

    onAuthStateChanged(auth, async (user) => {
    if (user) {
        userEmailElement.innerText = user.email;

        try {
            const userRef = doc(db, "utenti", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                console.log("📌 Dati utente Firestore:", data); // 🔥 Debug

                if (data.fotoProfilo) {
                    console.log("🔄 Foto profilo trovata:", data.fotoProfilo);
                    userPhotoElement.src = data.fotoProfilo; // 🔥 Aggiorna correttamente la foto
                } else {
                    console.warn("⚠ Foto profilo non impostata.");
                    userPhotoElement.src = "https://via.placeholder.com/80";
                }
            } else {
                console.warn("⚠ Documento utente non trovato.");
                userPhotoElement.src = "https://via.placeholder.com/80";
            }
        } catch (error) {
            console.error("❌ Errore nel recupero della foto profilo:", error);
            userPhotoElement.src = "https://via.placeholder.com/80";
        }
    } else {
        userEmailElement.innerText = "Non autenticato";
        userPhotoElement.src = "https://via.placeholder.com/80";
    }
});


    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            console.log("Logout dal pannello laterale cliccato!");
            logoutUser();
        });
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
