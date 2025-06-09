import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const params = new URLSearchParams(window.location.search);
const recipeId = params.get("id");

async function loadRecipeDetails() {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id");

    if (!recipeId) {
        alert("Errore: ID ricetta non trovato!");
        console.error("ID Ricetta mancante!");
        return;
    }

    try {
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
        document.getElementById("recipePreparationTime").innerText = data.preparazione;
        document.getElementById("recipeCookingTime").innerText = data.cottura;
        document.getElementById("recipeServings").innerText = data.dosi;
        document.getElementById("recipeDifficulty").innerText = data.difficolta || "Non specificata";

        // 🔥 Ora gestiamo Froala per ingredienti e procedura
        document.getElementById("ingredientsEditor").innerHTML = data.ingredienti || "<p>Nessun ingrediente disponibile</p>";
        document.getElementById("procedureEditor").innerHTML = data.procedura || "<p>Nessuna procedura disponibile</p>";

        // 🔥 Adatta tutte le immagini nel blocco Preparazione
        const procedureEditor = document.getElementById("procedureEditor");
        procedureEditor.querySelectorAll("img").forEach(img => {
            img.classList.add("procedure-image");
        });

    } catch (error) {
        console.error("❌ Errore nel caricamento della ricetta:", error);
        alert("Errore nel caricamento della ricetta. Controlla le autorizzazioni.");
    }
}

// 🔥 Controlla se l'utente è autenticato prima di caricare la ricetta
onAuthStateChanged(auth, (user) => {
    if (!user) {
        alert("⚠ Devi essere autenticato per visualizzare questa ricetta!");
        window.location.href = "index.html"; // 🔥 Reindirizza alla pagina di login
    } else {
        loadRecipeDetails(); // 🔥 Carica la ricetta solo se l'utente è autenticato
    }
});

window.goBack = function() {
    window.location.href = "ricettelista.html";
};

window.editRecipe = function() {
    if (!recipeId) {
        alert("Errore: ID ricetta non trovato!");
        return;
    }
    window.location.href = `nuovaricetta.html?id=${recipeId}`;
};
