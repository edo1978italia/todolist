import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import firebaseConfig from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", function () {
    const userEmailElement = document.getElementById("userEmail");
    const userPhotoElement = document.getElementById("userPhoto"); // 🔥 Recupera l'elemento foto profilo

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userEmailElement.innerText = user.email;

            // 🔥 Recupera la foto profilo da Firebase Firestore
            const userRef = doc(db, "utenti", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.fotoProfilo) {
                    userPhotoElement.src = data.fotoProfilo; // 🔥 Assicura che l'immagine venga aggiornata
                } else {
                    console.warn("⚠ Nessun link foto profilo trovato!");
                }
            } else {
                console.warn("⚠ Nessun documento utente trovato in Firestore!");
            }
        } else {
            userEmailElement.innerText = "Non autenticato";
            userPhotoElement.src = "https://via.placeholder.com/80"; // 🔥 Usa immagine di default
        }
    });
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
