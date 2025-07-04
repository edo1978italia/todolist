// Importa Firebase
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const params = new URLSearchParams(window.location.search);
const recipeId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  const userEmailElement = document.getElementById("userEmail");
  const mainContainer = document.getElementById("mainContainer");

  if (!user) {
    console.warn("🚪 Utente non autenticato — redirect");
    window.location.href = "index.html";
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error("❌ Documento utente assente");
      await signOut(auth);
      window.location.href = "index.html";
      return;
    }

    const data = userSnap.data();
    if (!data.groupId || data.groupId.trim() === "") {
      console.warn("🚧 Nessun groupId — redirect a group-setup.html");
      window.location.href = "group-setup.html";
      return;
    }

    console.log("✅ Accesso abilitato con groupId:", data.groupId);
    if (userEmailElement) userEmailElement.innerText = user.email;
    if (mainContainer) mainContainer.style.display = "block";

    loadRecipes(data.groupId); // ⬅️ chiamata filtrata

  } catch (err) {
    console.error("💥 Errore nel controllo utente:", err);
    await signOut(auth);
    window.location.href = "index.html";
  }
});

if (recipeId) {
    document.body.classList.add("single-recipe"); // 🔥 Applica lo stile per la singola ricetta
}


// 🔥 Funzione per caricare le ricette
import { query, orderBy } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

async function loadRecipes() {
    const recipesContainer = document.getElementById("recipeListContainer");

    if (!recipesContainer) {
        console.warn("⚠ Elemento 'recipeListContainer' non trovato nel DOM!");
        return;
    }

    recipesContainer.innerHTML = "Caricamento...";

    try {
        const recipesQuery = query(collection(db, "ricette"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(recipesQuery);

        recipesContainer.innerHTML = "";

        if (querySnapshot.empty) {
            recipesContainer.innerHTML = "<p>❌ Nessuna ricetta disponibile!</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const recipeElement = document.createElement("div");
            recipeElement.classList.add("recipe-card");
            recipeElement.dataset.category = data.categoria;

            recipeElement.innerHTML = `
                <div class="recipe-item">
                    <img class="recipe-img" src="${data.immagineUrl || 'placeholder.jpg'}" alt="${data.nome}">
                    <div class="recipe-info">
                        <h3 class="recipe-name">${data.nome}</h3>
                        <p class="recipe-category"><strong>Category:</strong> ${data.categoria}</p>
                        <p class="recipe-difficulty"><strong>Difficulty:</strong> ${data.difficolta}</p>
                    </div>
                    <button class="recipe-button" onclick="openRecipe('${doc.id}')">READ</button>
                </div>
            `;
            recipesContainer.appendChild(recipeElement);
        });
    } catch (error) {
        console.error("❌ Errore nel caricamento delle ricette:", error);
        recipesContainer.innerHTML = "<p>Errore nel caricamento delle ricette.</p>";
    }
}

document.addEventListener("DOMContentLoaded", loadRecipes);


window.openRecipe = function (recipeId) {
    if (!recipeId) {
        alert("Errore: ID ricetta non trovato!");
        return;
    }
    window.location.href = `ricetta.html?id=${recipeId}`;
};

document.addEventListener("DOMContentLoaded", loadRecipes);

// 🔥 Funzione Filtro
function filterRecipes() {
    const searchTerm = document.getElementById("searchRecipe").value.toLowerCase().trim();
    const selectedCategory = document.getElementById("categoryFilter").value.trim().toLowerCase();
    const recipes = document.querySelectorAll(".recipe-card");

    console.log(`🔍 Categoria selezionata: '${selectedCategory}'`); // 🔥 Debug

    recipes.forEach(recipe => {
        const recipeName = recipe.querySelector(".recipe-name").innerText.toLowerCase();
        const recipeCategory = recipe.dataset.category?.trim().toLowerCase();

        console.log(`🧩 Ricetta: '${recipeName}' | Categoria salvata: '${recipeCategory}'`); // 🔥 Debug

        const matchesSearch = searchTerm ? recipeName.includes(searchTerm) : true;
        const matchesCategory = selectedCategory ? recipeCategory === selectedCategory : true;

        recipe.style.display = matchesSearch && matchesCategory ? "block" : "none";
    });
}




window.filterRecipes = filterRecipes; // 🔥 Rende la funzione accessibile dall'HTML

// 🔥 Gestione logout
async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.clear();
        console.log("✅ Logout completato, utente disconnesso!");

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
    } catch (error) {
        console.error("❌ Errore nel logout:", error);
        alert("Errore nel logout: " + error.message);
    }
}

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





// 🔥 Gestione sidebar
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.left = sidebar.style.left === "0px" ? "-350px" : "0px";
};

// 🔥 Navigazione tra le pagine
window.navigateTo = function (page) {
    window.location.href = page;
};

// 🔥 Caricamento dinamico della sidebar
document.addEventListener("DOMContentLoaded", () => {
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) {
        console.warn("⚠ sidebar-container non trovato!");
        return;
    }

    fetch("sidebar.html")
        .then((res) => res.text())
        .then((html) => {
            sidebarContainer.innerHTML = html;
            console.log("[✓] Sidebar inserita nel DOM");

            // ✅ Aspetta il ciclo successivo prima di eseguire sidebar.js
            requestAnimationFrame(() => {
                const script = document.createElement("script");
                script.type = "module";
                script.src = "sidebar.js";
                script.onload = () => console.log("[✓] sidebar.js caricato correttamente");
                document.body.appendChild(script);
            });
        })
        .catch((err) => {
            console.error("❌ Errore nel caricamento di sidebar.html:", err);
        });
});