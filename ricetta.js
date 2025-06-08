import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import firebaseConfig from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const params = new URLSearchParams(window.location.search);
const recipeId = params.get("id");

async function loadRecipeDetails() {
    if (!recipeId) {
        alert("Errore: ID ricetta non trovato!");
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
}

document.addEventListener("DOMContentLoaded", loadRecipeDetails);


