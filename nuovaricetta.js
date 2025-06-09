import {
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    deleteDoc
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

// 🔥 Inizializza Froala per ingredienti con tutte le funzionalità avanzate
document.addEventListener("DOMContentLoaded", () => {
    window.ingredientsEditor = new FroalaEditor("#ingredientsEditor", {
        toolbarInline: false,
        placeholderText: "Inserisci gli ingredienti...",
        charCounterCount: false,
        toolbarButtons: ["bold", "italic", "underline", "strikeThrough", "subscript", "superscript",
                         "fontFamily", "fontSize", "color", "inlineStyle", "paragraphFormat", "paragraphStyle",
                         "align", "formatOL", "formatUL", "outdent", "indent", "quote", "insertLink", "insertImage",
                         "insertVideo", "insertFile", "insertTable", "emoticons", "specialCharacters", "insertHR",
                         "fullscreen", "print", "downloadPDF", "selectAll", "codeView", "help", "undo", "redo"]
    });

    window.procedureEditor = new FroalaEditor("#froalaProcedure", {
        toolbarInline: false,
        placeholderText: "Inserisci la procedura...",
        charCounterCount: false,
        toolbarButtons: ["bold", "italic", "underline", "strikeThrough", "subscript", "superscript",
                         "fontFamily", "fontSize", "color", "inlineStyle", "paragraphFormat", "paragraphStyle",
                         "align", "formatOL", "formatUL", "outdent", "indent", "quote", "insertLink", "insertImage",
                         "insertVideo", "insertFile", "insertTable", "emoticons", "specialCharacters", "insertHR",
                         "fullscreen", "print", "downloadPDF", "selectAll", "codeView", "help", "undo", "redo"]
    });

    document.getElementById("uploadImageButton").addEventListener("click", () => {
        window.open("https://postimages.org/upload", "_blank");
    });

    loadRecipeForEdit();
});


// 🔥 Funzione per caricare i dettagli di una ricetta in caso di modifica
async function loadRecipeForEdit() {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id");

    if (!recipeId) {
        console.error("⚠ Nessun ID ricetta trovato!");
        return;
    }

    console.log("🔍 Caricamento ricetta con ID:", recipeId);

    const recipeRef = doc(db, "ricette", recipeId);
    const recipeSnap = await getDoc(recipeRef);

    if (!recipeSnap.exists()) {
        console.error("❌ La ricetta non esiste!");
        return;
    }

    const data = recipeSnap.data();
    console.log("✅ Ricetta caricata con successo:", data);

    document.getElementById("recipeName").value = data.nome || "";
    document.getElementById("recipeImageUrl").value = data.immagineUrl || "";
    document.getElementById("recipeCategory").value = data.categoria || "";
    document.getElementById("recipePreparationTime").value = data.preparazione || "";
    document.getElementById("recipeCookingTime").value = data.cottura || "";
    document.getElementById("recipeServings").value = data.dosi || "";
    document.getElementById("recipeDifficulty").value = data.difficolta || "";
    document.getElementById("procedureImageUrl").value = data.procedureImageUrl || "";

    window.ingredientsEditor.html.set(data.ingredienti || ""); 
    window.procedureEditor.html.set(data.procedura || "");
}

// 🔥 Funzione per salvare le modifiche alla ricetta
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
    const ingredienti = ingredientsEditor.html.get(); 
    const proceduraTesto = procedureEditor.html.get(); 
    const procedureImageUrl = document.getElementById("procedureImageUrl").value.trim();

    // 🔥 Converte il link immagine in un tag <img> con una classe responsiva
    const procedura = procedureImageUrl 
        ? `<img src="${procedureImageUrl}" alt="Immagine Ricetta" class="procedure-image"><br>${proceduraTesto}` 
        : proceduraTesto;

    const preparazione = document.getElementById("recipePreparationTime").value.trim();
    const cottura = document.getElementById("recipeCookingTime").value.trim();
    const dosi = document.getElementById("recipeServings").value.trim();

    if (!recipeId) {
        alert("❌ Errore: ID ricetta non trovato!");
        return;
    }

    try {
        await updateDoc(doc(db, "ricette", recipeId), { 
            nome, categoria, immagineUrl, difficolta, ingredienti, procedura, preparazione, cottura, dosi 
        });
        alert("✅ Ricetta modificata con successo!");
        window.location.href = "ricettelista.html"; // 🔥 Ora reindirizza alla lista ricette dopo il salvataggio
    } catch (error) {
        console.error("❌ Errore nel salvataggio:", error);
        alert("Errore nel salvataggio della ricetta.");
    }
}


// 🔥 Assicura che i pulsanti funzionino correttamente
document.getElementById("saveRecipeButton").addEventListener("click", saveRecipe);
document.getElementById("deleteRecipeButton").addEventListener("click", deleteRecipe);
