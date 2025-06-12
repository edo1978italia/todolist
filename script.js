// Importa Firebase
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";

// 🔥 Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔥 Gestione login
async function loginUser() {
    try {
        const email = document.getElementById("emailInput").value.trim();
        const password = document.getElementById("passwordInput").value.trim();

        if (!email || !password) {
            alert("Inserisci email e password!");
            return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("✅ Login riuscito:", userCredential.user);

        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", userCredential.user.email);
        localStorage.setItem("userPhoto", userCredential.user.photoURL || "https://via.placeholder.com/80");

        window.location.replace("index.html");
    } catch (error) {
        console.error("❌ Errore di login:", error);
        alert("Errore di login: " + error.message);
    }
}

window.loginUser = loginUser;

// 🔥 Controllo login e aggiornamento interfaccia
document.addEventListener("DOMContentLoaded", function () {
    const authContainer = document.getElementById("authContainer");
    const mainContainer = document.getElementById("mainContainer");
    const welcomeMessage = document.getElementById("welcomeMessage");

    if (localStorage.getItem("userLoggedIn") === "true") {
        console.log("✅ Utente già loggato, bypasso il login!");
        authContainer.style.display = "none";
        mainContainer.style.display = "block";
        welcomeMessage.style.display = "block";
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ Utente autenticato:", user.email);
            localStorage.setItem("userLoggedIn", "true");
            localStorage.setItem("userEmail", user.email);

            authContainer.style.display = "none";
            mainContainer.style.display = "block";
            welcomeMessage.style.display = "block";
        } else {
            console.warn("⚠ Utente non autenticato.");
            authContainer.style.display = "block";
            mainContainer.style.display = "none";
            welcomeMessage.style.display = "none";
        }
    });
});

// 🔥 Gestione logout
async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.clear();
        console.log("✅ Logout completato, utente disconnesso!");
        window.location.href = "index.html";
    } catch (error) {
        console.error("❌ Errore nel logout:", error);
        alert("Errore nel logout: " + error.message);
    }
}

window.logoutUser = logoutUser;

// 🔥 Recupero email su tutte le pagine
document.addEventListener("DOMContentLoaded", function () {
    const userEmailElement = document.getElementById("userEmail");

    if (localStorage.getItem("userLoggedIn") && userEmailElement) {
        userEmailElement.innerText = localStorage.getItem("userEmail");
        console.log("✅ Email aggiornata in index.html:", localStorage.getItem("userEmail"));
    } else {
        console.warn("⚠ Elemento userEmail non trovato o utente non loggato!");
    }
});

// 🔥 Aggiunta gestione logout dal pulsante nel pannello laterale
document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
        console.log("✅ Pulsante logout registrato correttamente su questa pagina!");
    } else {
        console.warn("⚠ Pulsante logout non trovato su questa pagina!");
    }
});

// 🔥 Recupero email su tutte le pagine
document.addEventListener("DOMContentLoaded", () => {
    function aggiornaEmail() {
        const userEmailElement = document.getElementById("userEmail");

        if (!userEmailElement) {
            console.warn("⚠ Elemento userEmail non trovato nel DOM. Attendo il caricamento...");
            return;
        }

        // 🔥 Aspetta Firebase Authentication e aggiorna email
        onAuthStateChanged(auth, (user) => {
            const sidebarContainer = document.getElementById("sidebarContainer");
            const openSidebarButton = document.getElementById("openSidebar");

            if (user) {
                console.log("✅ Utente autenticato:", user.email);

                sidebarContainer.style.display = "block"; // 🔥 Mostra la sidebar
                openSidebarButton.style.display = "block"; // 🔥 Mostra il pulsante di apertura
            } else {
                console.warn("⚠ Utente non autenticato, rimuoviamo sidebar e pulsante!");

                // 🔥 Rimuove completamente il contenuto della sidebar
                if (sidebarContainer) {
                    sidebarContainer.innerHTML = "";
                    sidebarContainer.style.display = "none";
                }

                if (openSidebarButton) {
                    openSidebarButton.style.display = "none";
                }

                console.log("✅ Sidebar e pulsante rimossi correttamente dopo il logout!");
            }
        });
    }

    // 🔄 Aspetta il caricamento della sidebar PRIMA di aggiornare l'email
    fetch("sidebar.html")
        .then((response) => response.text())
        .then((data) => {
            document.getElementById("sidebarContainer").innerHTML = data;

            // 🔥 Aspetta che gli elementi della sidebar siano presenti
            setTimeout(() => {
                const userEmailElement = document.getElementById("userEmail");
                if (userEmailElement) {
                    aggiornaEmail(); // ✅ Ora aggiorna l'email
                } else {
                    console.error("❌ Elemento 'userEmail' ancora non trovato!");
                }
            }, 500);

            console.log("✅ Sidebar caricata e email aggiornata!");
        })
        .catch((error) => console.error("❌ Errore nel caricamento della sidebar:", error));
});

// 🔥 Gestione sidebar
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.left = sidebar.style.left === "0px" ? "-350px" : "0px";
};

// 🔥 Navigazione tra le pagine
window.navigateTo = function (page) {
    window.location.href = page;
};

// 🔥 Recupero dati da Firebase per il widget della lista To-Do
document.addEventListener("DOMContentLoaded", function () {
    const taskPreview = document.getElementById("taskPreview");

    onSnapshot(collection(db, "tasks"), (snapshot) => {
        let tasksArray = snapshot.docs.map((doc) => doc.data());

        if (tasksArray.length === 0) {
            taskPreview.innerHTML = "<li>❌ Nessun prodotto nella lista!</li>";
        } else {
            taskPreview.innerHTML = tasksArray
                .slice(0, 3)
                .map((task) => {
                    const isCompleted = task.completed ? "checked" : "";
                    return `<li class="${isCompleted}">${task.name}</li>`;
                })
                .join("");
        }
    });
});

// 🔥 Recupero dati da Firebase per il widget delle ricette
import { query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
    const latestRecipesList = document.getElementById("latestRecipesList");

    if (!latestRecipesList) {
        console.error("❌ Elemento 'latestRecipesList' non trovato nel DOM!");
        return;
    }

    try {
        const recipesQuery = query(collection(db, "ricette"), orderBy("timestamp", "desc"), limit(3)); // 🔥 Ordina per timestamp
        const querySnapshot = await getDocs(recipesQuery);

        let recipesArray = querySnapshot.docs.map((doc) => doc.data());

        if (recipesArray.length === 0) {
            latestRecipesList.innerHTML = "<p>❌ Nessuna ricetta disponibile!</p>";
        } else {
            latestRecipesList.innerHTML = recipesArray
                .map(
                    (recipe) => `
                    <div class="recipe-widget-item">
                        <img src="${recipe.immagineUrl || "placeholder.jpg"}" alt="${recipe.nome}" class="recipe-widget-img">
                        <p class="recipe-widget-name">${recipe.nome}</p>
                    </div>
                `
                )
                .join("");
        }
    } catch (error) {
        console.error("❌ Errore nel recupero delle ricette:", error);
        latestRecipesList.innerHTML = "<p>Errore nel caricamento delle ricette.</p>";
    }
});

// 🔥 Recupero dati da Firebase per il widget della lista To-Do
document.addEventListener("DOMContentLoaded", async function () {
  const notesPreviewList = document.getElementById("notesPreviewList");

  if (!notesPreviewList) {
    console.error("❌ Elemento 'notesPreviewList' non trovato nel DOM!");
    return;
  }

  try {
    const notesQuery = query(collection(db, "notes"), orderBy("timestamp", "desc"), limit(3));
    const notesSnapshot = await getDocs(notesQuery);

    const notesArray = notesSnapshot.docs.map((doc) => doc.data());

    if (notesArray.length === 0) {
      notesPreviewList.innerHTML = "<p>❌ Nessuna nota disponibile.</p>";
    } else {
      notesPreviewList.innerHTML = notesArray
        .map(
          (note) => `
          <div class="note-preview-box">
            <h4 class="note-preview-title">${note.title || "Senza titolo"}</h4>
            <p class="note-preview-content">${note.content?.replace(/<[^>]+>/g, "").slice(0, 120) || ""}...</p>
          </div>
        `
        )
        .join("");
    }
  } catch (error) {
    console.error("❌ Errore nel recupero delle note:", error);
    notesPreviewList.innerHTML = "<p>Errore nel caricamento delle note.</p>";
  }
});
