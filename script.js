// Importa Firebase
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";

// 🔥 Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔥 Gestione login
async function loginUser() {
    try {
        const email = document.getElementById("emailInput").value.trim();
        const password = document.getElementById("passwordInput").value.trim();

        if (!email || !password) {
            alert("Inserisci email e password!");
            return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("✅ Login riuscito:", userCredential.user);

        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", userCredential.user.email);
        localStorage.setItem("userPhoto", userCredential.user.photoURL || "https://via.placeholder.com/80");

        window.location.replace("index.html");
    } catch (error) {
        console.error("❌ Errore di login:", error);
        alert("Errore di login: " + error.message);
    }
}

window.loginUser = loginUser;

// 🔥 Controllo login e aggiornamento interfaccia
document.addEventListener("DOMContentLoaded", function () {
    const authContainer = document.getElementById("authContainer");
    const mainContainer = document.getElementById("mainContainer");
    const welcomeMessage = document.getElementById("welcomeMessage");

    if (localStorage.getItem("userLoggedIn") === "true") {
        console.log("✅ Utente già loggato, bypasso il login!");
        authContainer.style.display = "none";
        mainContainer.style.display = "block";
        welcomeMessage.style.display = "block";
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ Utente autenticato:", user.email);
            localStorage.setItem("userLoggedIn", "true");
            localStorage.setItem("userEmail", user.email);

            authContainer.style.display = "none";
            mainContainer.style.display = "block";
            welcomeMessage.style.display = "block";
        } else {
            console.warn("⚠ Utente non autenticato.");
            authContainer.style.display = "block";
            mainContainer.style.display = "none";
            welcomeMessage.style.display = "none";
        }
    });
});

// 🔥 Gestione logout
async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.clear();
        console.log("✅ Logout completato, utente disconnesso!");
        window.location.href = "index.html";
    } catch (error) {
        console.error("❌ Errore nel logout:", error);
        alert("Errore nel logout: " + error.message);
    }
}

window.logoutUser = logoutUser;

// 🔥 Funzione di riduzione delle immagini con Canvas
function riduciImmagine(url, callback) {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // 🔥 Evita problemi di CORS
    img.src = url;
    img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Imposta una nuova dimensione (50% più piccola)
        canvas.width = img.width * 0.5;
        canvas.height = img.height * 0.5;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Converti l'immagine in un formato compresso (JPEG con qualità ridotta)
        const nuovaImmagine = canvas.toDataURL("image/jpeg", 0.6);

        callback(nuovaImmagine);
    };
}

// 🔄 Applica la riduzione alle immagini nel widget delle ricette
document.addEventListener("DOMContentLoaded", async () => {
    setTimeout(() => {
        const immaginiRicette = document.querySelectorAll(".recipe-widget-img");

        immaginiRicette.forEach((img) => {
            riduciImmagine(img.src, (immagineRidotta) => {
                img.src = immagineRidotta;
                console.log("✅ Immagine ottimizzata:", img.src);
            });
        });
    }, 500); // 🔥 Attendi il caricamento prima di ridurre le immagini
});

// 🔥 Gestione sidebar
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.left = sidebar.style.left === "0px" ? "-350px" : "0px";
};

// 🔥 Navigazione tra le pagine
window.navigateTo = function (page) {
    window.location.href = page;
};

// 🔥 Recupero dati da Firebase per il widget della lista To-Do
document.addEventListener("DOMContentLoaded", function () {
    const taskPreview = document.getElementById("taskPreview");

    onSnapshot(collection(db, "tasks"), (snapshot) => {
        let tasksArray = snapshot.docs.map((doc) => doc.data());

        if (tasksArray.length === 0) {
            taskPreview.innerHTML = "<li>❌ Nessun prodotto nella lista!</li>";
        } else {
            taskPreview.innerHTML = tasksArray
                .slice(0, 3)
                .map((task) => {
                    const isCompleted = task.completed ? "checked" : "";
                    return `<li class="${isCompleted}">${task.name}</li>`;
                })
                .join("");
        }
    });
});
