import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔥 Funzione per aggiungere una nuova ricetta
async function addRecipe() {
    const nome = document.getElementById("recipeName").value.trim();
    const ingredienti = document.getElementById("recipeIngredients").value.split(",").map(ing => ing.trim());
    const preparazione = document.getElementById("recipePreparationTime").value.trim();
    const cottura = document.getElementById("recipeCookingTime").value.trim();
    const dosi = document.getElementById("recipeServings").value.trim();
    const procedura = document.getElementById("recipeProcedure").value.trim();
    const categoria = document.getElementById("recipeCategory").value.trim();
    const immagineUrl = document.getElementById("recipeImageUrl").value.trim();

    if (!nome || !procedura) {
        alert("Nome e procedura sono obbligatori!");
        return;
    }

    try {
        await addDoc(collection(db, "ricette"), {
            nome,
            ingredienti,
            preparazione: preparazione || "0",
            cottura: cottura || "0",
            dosi: dosi || "1",
            procedura,
            categoria: categoria || "Senza categoria",
            immagineUrl: immagineUrl || ""
        });
        alert("Ricetta aggiunta con successo!");
        loadRecipes(); // 🔥 Ricarica le ricette dopo l'aggiunta
    } catch (error) {
        console.error("Errore nell'aggiunta della ricetta:", error);
    }
}

// 🔥 Funzione per recuperare e visualizzare le ricette salvate
function loadRecipes() {
    const recipeList = document.getElementById("recipeList");

    onSnapshot(collection(db, "ricette"), (snapshot) => {
        recipeList.innerHTML = "";
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const recipeItem = `
                <li>
                    <h3>${data.nome}</h3>
                    <img src="${data.immagineUrl}" alt="${data.nome}" style="width: 100%; max-width: 300px;">
                    <p><strong>Categoria:</strong> ${data.categoria}</p>
                    <p><strong>Ingredienti:</strong> ${data.ingredienti.join(", ")}</p>
                    <p><strong>Preparazione:</strong> ${data.preparazione} min</p>
                    <p><strong>Cottura:</strong> ${data.cottura} min</p>
                    <p><strong>Dosi per:</strong> ${data.dosi} persone</p>
                    <p><strong>Procedura:</strong> ${data.procedura}</p>
                </li>
            `;
            recipeList.innerHTML += recipeItem;
        });
    });
}

// 🔥 Carica le ricette quando la pagina viene caricata
document.addEventListener("DOMContentLoaded", loadRecipes);
