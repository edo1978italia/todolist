// Importa Firebase
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const params = new URLSearchParams(window.location.search);
const recipeId = params.get("id");

if (recipeId) {
    document.body.classList.add("single-recipe"); // 🔥 Applica lo stile per la singola ricetta
}


// 🔥 Funzione per ottenere i dettagli della ricetta selezionata
// 🔥 Funzione per caricare le ricette
function loadRecipes() {
    const recipesContainer = document.getElementById("recipeListContainer");

    if (!recipesContainer) {
        console.warn("⚠ Elemento 'recipeListContainer' non trovato nel DOM!");
        return;
    }

    recipesContainer.innerHTML = "Caricamento...";

    getDocs(collection(db, "ricette")).then((querySnapshot) => {
        recipesContainer.innerHTML = ""; 

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const recipeElement = document.createElement("div");
            recipeElement.classList.add("recipe-card");

            recipeElement.innerHTML = `
                <div class="recipe-item">
                    <img class="recipe-img" src="${data.immagineUrl || 'placeholder.jpg'}" alt="${data.nome}">
                    <div class="recipe-info">
                        <h3 class="recipe-name">${data.nome}</h3>
                        <p class="recipe-category"><strong>Categoria:</strong> ${data.categoria}</p>
                    </div>
                    <button class="recipe-button" onclick="openRecipe('${doc.id}')">READ</button>

                </div>
            `;
            recipesContainer.appendChild(recipeElement);
        });
    });
}

function openRecipe(recipeId) {
    if (!recipeId) {
        alert("Errore: ID ricetta non trovato!");
        return;
    }
    window.location.href = `ricetta.html?id=${recipeId}`;
}

document.addEventListener("DOMContentLoaded", loadRecipes);


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

// 🔥 Funzione per aprire/chiudere la sidebar
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) {
        console.warn("⚠ Sidebar non trovata!");
        return;
    }

    sidebar.style.left = sidebar.style.left === "0px" ? "-350px" : "0px";
    console.log("🔄 Sidebar toggled:", sidebar.style.left);
};
// 🔥 Funzione per navigare tra le pagine dalla sidebar
window.navigateTo = function (page) {
    window.location.href = page;
};
