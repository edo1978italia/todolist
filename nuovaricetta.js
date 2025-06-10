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
        console.warn("⚠ Nessun ID ricetta trovato! Creazione di una nuova ricetta.");
        return; // 🔥 Ora il codice non blocca la pagina se si sta creando una nuova ricetta
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
    let recipeId = params.get("id");

    const nome = document.getElementById("recipeName").value.trim();
    const categoria = document.getElementById("recipeCategory").value;
    const immagineUrl = document.getElementById("recipeImageUrl").value.trim();
    const difficolta = document.getElementById("recipeDifficulty").value;
    const ingredienti = ingredientsEditor.html.get(); 
    const procedura = procedureEditor.html.get();
    const preparazione = document.getElementById("recipePreparationTime").value.trim();
    const cottura = document.getElementById("recipeCookingTime").value.trim();
    const dosi = document.getElementById("recipeServings").value.trim();

    if (!recipeId) {
        console.log("🔍 Creazione di una nuova ricetta...");
        try {
            const docRef = await addDoc(collection(db, "ricette"), { 
                nome, categoria, immagineUrl, difficolta, ingredienti, procedura, preparazione, cottura, dosi,
                timestamp: serverTimestamp() // 🔥 Aggiunge il timestamp
            });
            recipeId = docRef.id;
            console.log("✅ Nuova ricetta salvata con ID:", recipeId);
        } catch (error) {
            console.error("❌ Errore nella creazione della ricetta:", error);
            alert("Errore nel salvataggio della nuova ricetta.");
            return;
        }
    } else {
        try {
            await updateDoc(doc(db, "ricette", recipeId), { 
                nome, categoria, immagineUrl, difficolta, ingredienti, procedura, preparazione, cottura, dosi,
                timestamp: serverTimestamp() // 🔥 Aggiorna il timestamp
            });
            console.log("✅ Ricetta aggiornata con successo!");
        } catch (error) {
            console.error("❌ Errore nell'aggiornamento della ricetta:", error);
            alert("Errore nel salvataggio della ricetta.");
            return;
        }
    }

    alert("✅ Ricetta salvata con successo!");
    window.location.href = "ricettelista.html";
}


async function deleteRecipe() {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id");

    if (!recipeId) {
        alert("❌ Errore: ID ricetta non trovato!");
        return;
    }

    try {
        await deleteDoc(doc(db, "ricette", recipeId));
        alert("✅ Ricetta eliminata con successo!");
        window.location.href = "ricettelista.html"; // 🔥 Reindirizza alla lista ricette dopo l'eliminazione
    } catch (error) {
        console.error("❌ Errore nell'eliminazione della ricetta:", error);
        alert("Errore nell'eliminazione della ricetta.");
    }
}


window.deleteRecipe = deleteRecipe; // 🔥 Rende la funzione accessibile dall'HTML

window.goBack = function() {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id");
    
    if (!recipeId) {
        alert("Errore: ID ricetta non trovato!");
        return;
    }

    window.location.href = `ricetta.html?id=${recipeId}`;
};

// 🔥 Assicura che i pulsanti funzionino correttamente
document.getElementById("saveRecipeButton").addEventListener("click", saveRecipe);
document.getElementById("deleteRecipeButton").addEventListener("click", deleteRecipe);
