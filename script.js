// Importa Firebase
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Gestione login
async function loginUser() {
    try {
        const email = document.getElementById("emailInput").value.trim();
        const password = document.getElementById("passwordInput").value.trim();

        if (!email || !password) {
            alert("Inserisci email e password!");
            return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login riuscito:", userCredential.user);

        sessionStorage.setItem("userLoggedIn", "true");
        sessionStorage.setItem("userEmail", userCredential.user.email);
        sessionStorage.setItem("userPhoto", userCredential.user.photoURL || "https://via.placeholder.com/80");

        // 🔥 Usa `replace()` invece di `href` per evitare un doppio caricamento
        window.location.replace("index.html");
    } catch (error) {
        console.error("Errore di login:", error);
        alert("Errore di login: " + error.message);
    }
}

window.loginUser = loginUser;

// Gestione logout
async function logoutUser() {
    try {
        await signOut(auth);
        sessionStorage.clear(); // 🔥 Cancella i dati di sessione
        localStorage.clear(); // 🔥 Se usato, cancella anche i dati memorizzati localmente
        window.location.replace("index.html"); // 🔥 Usa `replace()` per evitare il ritorno alla dashboard
    } catch (error) {
        console.error("Errore nel logout:", error);
        alert("Errore nel logout: " + error.message);
    }
}

window.logoutUser = logoutUser;

// Controllo login e gestione del pannello laterale
onAuthStateChanged(auth, (user) => {
    const authContainer = document.getElementById("authContainer");
    const mainContainer = document.getElementById("mainContainer");
    const welcomeMessage = document.getElementById("welcomeMessage");

    if (user) {
        // 🔥 Nasconde la login IMMEDIATAMENTE per evitare il flash
        authContainer.style.display = "none";

        // 🔥 Aggiunge un piccolo ritardo per mostrare la dashboard in modo fluido
        setTimeout(() => {
            mainContainer.style.display = "block";
            welcomeMessage.style.display = "block";
        }, 100); // 🔥 Regolabile per fluidità
    } else {
        authContainer.style.display = "block";
        mainContainer.style.display = "none";
        welcomeMessage.style.display = "none";
        sessionStorage.clear();
    }
});



// Controllo login in tutte le pagine private
document.addEventListener("DOMContentLoaded", function () {
    const authContainer = document.getElementById("authContainer");
    const mainContainer = document.getElementById("mainContainer");

    if (sessionStorage.getItem("userLoggedIn")) {
        authContainer.style.display = "none";
        mainContainer.style.display = "block";
        document.getElementById("userEmail").innerText = sessionStorage.getItem("userEmail");
        document.getElementById("userPhoto").src = sessionStorage.getItem("userPhoto");
    } else {
        authContainer.style.display = "block";
        mainContainer.style.display = "none";
        sessionStorage.clear(); // 🔥 Pulisce la sessione per evitare loop
    }
});


// Funzione per navigare tra le pagine
window.navigateTo = function (page) {
    window.location.href = page;
};

// 🔥 **Correzione della funzione per mostrare/nascondere il pannello laterale**
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    const sidebarLeft = window.getComputedStyle(sidebar).left;

    if (sidebarLeft === "-300px") {
        sidebar.style.left = "0px"; // 🔥 Mostra il pannello completamente
    } else {
        sidebar.style.left = "-300px"; // 🔥 Nasconde il pannello completamente
    }
};

// 🔥 **Aggiunta gestione logout dal pulsante nel pannello laterale**
document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser); // 🔥 Disconnette l'utente
    }
});
