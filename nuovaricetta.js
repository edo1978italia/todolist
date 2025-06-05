import { getFirestore, collection, doc, addDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔥 Funzione per caricare i dettagli di una ricetta in caso di modifica
async function loadRecipeForEdit() {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id"); // Ottiene l'ID dalla URL

    if (!recipeId) return; // Se non c'è ID, si tratta di una nuova ricetta

    document.getElementById("pageTitle").innerText = "Modifica Ricetta";

    const recipeRef = doc(db, "ricette", recipeId);
    const recipeSnap = await getDoc(recipeRef);

    if (!recipeSnap.exists()) {
        alert("La ricetta non esiste!");
        return;
    }

    const data = recipeSnap.data();
    document.getElementById("recipeName").value = data.nome;
    document.getElementById("recipeImageUrl").value = data.immagineUrl;
    document.getElementById("recipeCategory").value = data.categoria;
    document.getElementById("recipeIngredients").value = data.ingredienti.join(", ");
    document.getElementById("recipePreparationTime").value = data.preparazione;
    document.getElementById("recipeCookingTime").value = data.cottura;
    document.getElementById("recipeServings").value = data.dosi;
    document.getElementById("recipeProcedure").value = data.procedura;

    document.getElementById("saveRecipeButton").onclick = () => saveRecipe(recipeId);
}

// 🔥 Funzione per salvare/modificare una ricetta in Firebase
async function saveRecipe(recipeId = null) {
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
        if (recipeId) {
            // 🔥 Modifica ricetta esistente
            const recipeRef = doc(db, "ricette", recipeId);
            await updateDoc(recipeRef, {
                nome, ingredienti, preparazione, cottura, dosi, procedura, categoria, immagineUrl
            });
            alert("Ricetta modificata con successo!");
        } else {
            // 🔥 Aggiunta nuova ricetta
            await addDoc(collection(db, "ricette"), {
                nome, ingredienti, preparazione, cottura, dosi, procedura, categoria, immagineUrl
            });
            alert("Ricetta aggiunta con successo!");
        }
        window.location.href = "ricettelista.html"; // 🔥 Torna alla lista delle ricette
    } catch (error) {
        console.error("Errore nel salvataggio della ricetta:", error);
    }
}

// 🔥 Rende la funzione globale per `nuovaricetta.html`
window.saveRecipe = saveRecipe;

// 🔥 Carica la ricetta per la modifica se l'ID è presente
document.addEventListener("DOMContentLoaded", loadRecipeForEdit);
