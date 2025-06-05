// Importa Firebase
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔥 Funzione per ottenere i dettagli della ricetta selezionata
async function loadRecipe() {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id"); // Ottiene l'ID dalla URL

    if (!recipeId) {
        alert("ID ricetta non trovato!");
        return;
    }

    const recipeRef = doc(db, "ricette", recipeId);
    const recipeSnap = await getDoc(recipeRef);

    if (!recipeSnap.exists()) {
        alert("La ricetta non esiste!");
        return;
    }

    const data = recipeSnap.data();

    document.getElementById("recipeTitle").innerText = data.nome;
    document.getElementById("recipeImage").src = data.immagineUrl || "placeholder.jpg";
    document.getElementById("recipeCategory").innerText = data.categoria;
    document.getElementById("recipeIngredients").innerText = data.ingredienti.join(", ");
    document.getElementById("recipePreparationTime").innerText = data.preparazione;
    document.getElementById("recipeCookingTime").innerText = data.cottura;
    document.getElementById("recipeServings").innerText = data.dosi;
    document.getElementById("recipeProcedure").innerText = data.procedura;

    // 🔥 Modifica la ricetta
    document.getElementById("editRecipeButton").onclick = () => {
        window.location.href = `nuovaricetta.html?id=${recipeId}`;
    };
}

// 🔥 Verifica sessione utente e aggiorna l'interfaccia
onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.warn("⚠ Utente non autenticato, reindirizzamento in corso...");
        setTimeout(() => {
            window.location.replace("index.html");
        }, 1000);
    } else {
        console.log("✅ Utente autenticato:", user.email);
    }
});

// 🔥 Gestione logout (versione più sicura)
async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.clear();
        console.log("✅ Logout completato, utente disconnesso!");

        setTimeout(() => {
            if (!auth.currentUser) {
                console.log("✅ Conferma: utente disconnesso.");
                window.location.href = "index.html"; // 🔥 Reindirizzamento dopo la disconnessione
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

// 🔥 Registra il pulsante logout al caricamento della pagina
document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
        console.log("✅ Pulsante logout registrato correttamente!");
    } else {
        console.warn("⚠ Pulsante logout non trovato!");
    }
});

window.logoutUser = logoutUser;

// 🔥 Gestione della sidebar
document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        const sidebarToggle = document.getElementById("sidebarToggle");
        const sidebar = document.getElementById("sidebar");

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener("click", () => {
                sidebar.style.left = sidebar.style.left === "0px" ? "-350px" : "0px";
                console.log("🔄 Sidebar toggle:", sidebar.style.left);
            });
        } else {
            console.warn("⚠ Sidebar o pulsante toggle non trovati!");
        }
    }, 500);
});



// 🔥 Carica la ricetta quando la pagina viene aperta
document.addEventListener("DOMContentLoaded", loadRecipe);
