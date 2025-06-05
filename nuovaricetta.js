import { getFirestore, collection, doc, addDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔥 Funzione per caricare i dettagli di una ricetta in caso di modifica
// 🔥 Verifica che l'utente sia loggato prima di salvare la ricetta
async function saveRecipe(recipeId = null) {
    const user = auth.currentUser;
    if (!user) {
        alert("⚠ Devi essere autenticato per salvare una ricetta!");
        window.location.href = "index.html"; // 🔥 Reindirizza alla pagina di login
        return;
    }

    const nome = document.getElementById("recipeName").value.trim();
    const ingredientiRaw = document.getElementById("recipeIngredients").value.trim();
    const preparazione = document.getElementById("recipePreparationTime").value.trim();
    const cottura = document.getElementById("recipeCookingTime").value.trim();
    const dosi = document.getElementById("recipeServings").value.trim();
    const proceduraRaw = document.getElementById("recipeProcedure").value.trim();
    const categoria = document.getElementById("recipeCategory").value;
    const immagineUrl = document.getElementById("recipeImageUrl").value.trim();

    if (!nome || !proceduraRaw || !categoria || !ingredientiRaw || !preparazione || !cottura || !dosi) {
        alert("⚠ Tutti i campi devono essere compilati correttamente!");
        return;
    }

    // 🔥 Corretta gestione dei campi multi-riga
    const ingredienti = ingredientiRaw.split("\n").map(ing => ing.trim()).filter(ing => ing.length > 0);
    const procedura = proceduraRaw.split("\n").map(step => step.trim()).filter(step => step.length > 0);

    try {
        if (recipeId) {
            // 🔥 Modifica ricetta esistente
            const recipeRef = doc(db, "ricette", recipeId);
            await updateDoc(recipeRef, {
                nome, ingredienti, preparazione, cottura, dosi, procedura, categoria, immagineUrl
            });
            alert("✅ Ricetta modificata con successo!");
        } else {
            // 🔥 Aggiunta nuova ricetta
            await addDoc(collection(db, "ricette"), {
                nome, ingredienti, preparazione, cottura, dosi, procedura, categoria, immagineUrl
            });
            alert("✅ Ricetta aggiunta con successo!");
        }
        window.location.href = "ricettelista.html"; // 🔥 Torna alla lista delle ricette
    } catch (error) {
        console.error("❌ Errore nel salvataggio della ricetta:", error);
        alert("Errore nel salvataggio della ricetta: " + error.message);
    }
}

// 🔥 Rende la funzione globale per `nuovaricetta.html`
window.saveRecipe = saveRecipe;

// 🔥 Carica la ricetta per la modifica se l'ID è presente
document.addEventListener("DOMContentLoaded", loadRecipeForEdit);
