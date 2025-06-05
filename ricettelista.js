import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔥 Funzione per caricare tutte le ricette da Firebase
function loadRecipes() {
    const recipeList = document.getElementById("recipeList");

    onSnapshot(collection(db, "ricette"), (snapshot) => {
        recipeList.innerHTML = "";
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const recipeItem = `
                <li onclick="viewRecipe('${doc.id}')">
                    <h3>${data.nome}</h3>
                    <img src="${data.immagineUrl}" alt="${data.nome}" style="width: 100%; max-width: 200px;">
                    <p><strong>Categoria:</strong> ${data.categoria}</p>
                </li>
            `;
            recipeList.innerHTML += recipeItem;
        });
    });
}

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
