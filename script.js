// Importa Firebase
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
onAuthStateChanged(auth, (user) => {
    const authContainer = document.getElementById("authContainer");
    const mainContainer = document.getElementById("mainContainer");
    const welcomeMessage = document.getElementById("welcomeMessage");

    if (user) {
        console.log("✅ Utente autenticato:", user.email);

        // 🔥 Memorizza i dati correttamente
        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", user.email);

        // 🔥 Aggiorna interfaccia
        authContainer.style.display = "none";
        mainContainer.style.display = "block";
        welcomeMessage.style.display = "block";

        if (window.location.pathname.includes("index.html")) {
            console.log("✅ Utente è già sulla pagina corretta, nessun reindirizzamento.");
        }
    } else {
        console.warn("⚠ Utente non autenticato.");

        // 🔥 Evita il loop controllando se la pagina è già `index.html`
        if (!localStorage.getItem("userLoggedIn") && !window.location.pathname.includes("index.html")) {
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        }
    }
});


// 🔥 Gestione logout
async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.clear();
        console.log("✅ Logout completato, utente disconnesso!");

        setTimeout(() => {
            if (!auth.currentUser) {
                console.log("✅ Conferma: utente disconnesso.");
                window.location.href = "index.html";
            } else {
                console.warn("⚠ L'utente risulta ancora autenticato, ricarico la pagina.");
                window.location.reload();
            }
        }, 1000);
    } catch (error) {
        console.error("❌ Errore nel logout:", error);
        alert("Errore nel logout: " + error.message);
    }
}

window.logoutUser = logoutUser;



// 🔥 Recupero email su tutte le pagine
document.addEventListener("DOMContentLoaded", function () {
    const userEmailElement = document.getElementById("userEmail");

    if (localStorage.getItem("userLoggedIn") && userEmailElement) {
        userEmailElement.innerText = localStorage.getItem("userEmail");
        console.log("✅ Email aggiornata in index.html:", localStorage.getItem("userEmail"));
    } else {
        console.warn("⚠ Elemento userEmail non trovato o utente non loggato!");
    }
});


// 🔥 Aggiunta gestione logout dal pulsante nel pannello laterale
document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
        console.log("✅ Pulsante logout registrato correttamente su questa pagina!");
    } else {
        console.warn("⚠ Pulsante logout non trovato su questa pagina!");
    }
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




