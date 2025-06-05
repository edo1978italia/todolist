import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import firebaseConfig from "./config.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";


// Configura Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const db = getFirestore(app);


// 🔥 Funzione per caricare tutte le ricette da Firebase
function loadRecipes() {
    const recipeList = document.getElementById("recipeList");

    onSnapshot(collection(db, "ricette"), (snapshot) => {
    recipeList.innerHTML = "";
    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const recipeItem = `
            <li class="recipe-item" onclick="viewRecipe('${doc.id}')">
                <img src="${data.immagineUrl}" alt="${data.nome}" class="recipe-img">
                <span class="recipe-name">${data.nome}</span>
            </li>
        `;
        recipeList.innerHTML += recipeItem;
    });
});

}
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

document.addEventListener("DOMContentLoaded", function () {
        const logoutButton = document.getElementById("logoutButton");

        if (logoutButton) {
            logoutButton.addEventListener("click", logoutUser);
            console.log("✅ Pulsante logout registrato correttamente!");
        } else {
            console.warn("⚠ Pulsante logout non trovato!");
        }
    });



// 🔥 Funzione per filtrare le ricette
function filterRecipes() {
    const searchValue = document.getElementById("searchRecipe").value.toLowerCase();
    const categoryValue = document.getElementById("categoryFilter").value;

    document.querySelectorAll("#recipeList li").forEach((recipe) => {
        const recipeName = recipe.querySelector("h3").innerText.toLowerCase();
        const recipeCategory = recipe.querySelector("p").innerText.split(": ")[1];

        if (recipeName.includes(searchValue) && (categoryValue === "" || recipeCategory === categoryValue)) {
            recipe.style.display = "block";
        } else {
            recipe.style.display = "none";
        }
    });
}

// 🔥 Funzione per aprire la ricetta selezionata
function viewRecipe(recipeId) {
    window.location.href = `ricetta.html?id=${recipeId}`;
}

// Carica le ricette quando la pagina viene caricata
document.addEventListener("DOMContentLoaded", loadRecipes);

// 🔥 Gestione sidebar
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.left = sidebar.style.left === "0px" ? "-350px" : "0px";
};
