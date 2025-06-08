import {
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔥 Verifica autenticazione prima di caricare la pagina
onAuthStateChanged(auth, (user) => {
    if (!user) {
        alert("⚠ Devi essere autenticato per accedere a questa pagina!");
        window.location.href = "index.html";
    }
});

// 🔥 Inizializza Froala per ingredienti e procedura EDITABILI
document.addEventListener("DOMContentLoaded", () => {
    window.ingredientsEditor = new FroalaEditor('#ingredientsEditor', {
        toolbarInline: false,
        placeholderText: "Inserisci gli ingredienti...",
        charCounterCount: false
    });

    window.procedureEditor = new FroalaEditor('#procedureEditor', {
        toolbarInline: false,
        placeholderText: "Inserisci la procedura...",
        charCounterCount: false
    });

    loadRecipeForEdit();
});

// 🔥 Funzione per caricare i dettagli di una ricetta in caso di modifica
async function loadRecipeForEdit() {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id");

    if (!recipeId) return;

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
    document.getElementById("recipePreparationTime").value = data.preparazione;
    document.getElementById("recipeCookingTime").value = data.cottura;
    document.getElementById("recipeServings").value = data.dosi;
    document.getElementById("recipeDifficulty").value = data.difficolta;

    // 🔥 Assicura che Froala carichi il contenuto formattato
    ingredientsEditor.html.set(data.ingredienti || ""); 
    procedureEditor.html.set(data.procedura || "");
}

// 🔥 Funzione per salvare una ricetta con Froala
async function saveRecipe() {
    const user = auth.currentUser;
    if (!user) {
        alert("⚠ Devi essere autenticato per salvare una ricetta!");
        window.location.href = "index.html";
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id");

    const nome = document.getElementById("recipeName").value.trim();
    const categoria = document.getElementById("recipeCategory").value;
    const immagineUrl = document.getElementById("recipeImageUrl").value.trim();
    const difficolta = document.getElementById("recipeDifficulty").value;
    const ingredienti = ingredientsEditor.html.get(); // 🔥 Salva il contenuto formattato
    const procedura = procedureEditor.html.get(); // 🔥 Salva il contenuto formattato
    const preparazione = document.getElementById("recipePreparationTime").value.trim();
    const cottura = document.getElementById("recipeCookingTime").value.trim();
    const dosi = document.getElementById("recipeServings").value.trim();

    if (!nome || !procedura || !categoria || !ingredienti || !preparazione || !cottura || !dosi || !difficolta) {
        alert("⚠ Tutti i campi devono essere compilati correttamente!");
        return;
    }

    try {
        if (recipeId) {
            // 🔥 Modifica una ricetta esistente invece di crearne una nuova
            const recipeRef = doc(db, "ricette", recipeId);
            await updateDoc(recipeRef, { 
                nome, categoria, immagineUrl, difficolta, ingredienti, procedura, preparazione, cottura, dosi 
            });
            alert("✅ Ricetta modificata con successo!");
        } else {
            // 🔥 Creazione di una nuova ricetta
            const docRef = await addDoc(collection(db, "ricette"), { 
                nome, categoria, immagineUrl, difficolta, ingredienti, procedura, preparazione, cottura, dosi 
            });
            alert("✅ Ricetta aggiunta con successo!");
        }

        window.location.href = "ricettelista.html"; // 🔥 Ritorna alla lista dopo il salvataggio

    } catch (error) {
        console.error("❌ Errore nel salvataggio della ricetta:", error);
        alert("Errore nel salvataggio della ricetta: " + error.message);
    }
}

// 🔥 Assicura che il pulsante salvi la ricetta correttamente
document.getElementById("saveRecipeButton").addEventListener("click", () => saveRecipe());
