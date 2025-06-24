// Importa Firebase
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

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
onAuthStateChanged(auth, async (user) => {
    const authContainer = document.getElementById("authContainer");
    const mainContainer = document.getElementById("mainContainer");
    const welcomeMessage = document.getElementById("welcomeMessage");
    const userEmailElement = document.getElementById("userEmail");

    if (user) {
        console.log("✅ Utente autenticato:", user.email);

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            console.log("📄 Documento utente:", data);

            if (!data.groupId || data.groupId.trim() === "") {
                console.warn("🔁 Nessun groupId trovato — redirect a group-setup.html");
                window.location.href = "group-setup.html";
                return;
            }

            // ✅ Tutto ok → Mostra contenuti
            if (userEmailElement) {
                userEmailElement.innerText = user.email;
                console.log("📩 Email impostata su:", user.email);
            }

            authContainer.style.display = "none";
            mainContainer.style.display = "block";
            if (welcomeMessage) welcomeMessage.style.display = "block";
        } else {
            console.error("❌ Documento Firestore mancante — logout forzato");
            await signOut(auth);
            window.location.reload();
        }
    } else {
        console.log("🔒 Nessun utente loggato — mostra form login");
        authContainer.style.display = "block";
        mainContainer.style.display = "none";
        if (welcomeMessage) welcomeMessage.style.display = "none";
    }
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
            taskPreview.innerHTML = "<li>❌ No products to show!</li>";
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
            latestRecipesList.innerHTML = "<p>❌ No recipes to show!</p>";
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
            notesPreviewList.innerHTML = "<p>❌ No notes to show!</p>";
        } else {
            notesPreviewList.innerHTML = notesArray
                .map((note) => {
                    const noteTitle = note.title || "Senza titolo";

                    // 🔥 Limita il titolo a 25 caratteri con ".." se troppo lungo
                    const shortTitle = noteTitle.length > 15 ? noteTitle.slice(0, 15) + ".." : noteTitle;

                    // 🔥 Limita il contenuto della nota a 2 righe visibili nel widget
                    const previewContent = note.content
                        ? note.content.replace(/<[^>]+>/g, "").slice(0, 180) // 🔥 Mantiene circa 180 caratteri per evitare il taglio visivo
                        : "No content";

                    return `
  <div class="note-preview-box">
    <div class="note-preview-avatar-wrap">
      ${
          note.createdBy?.photoURL
              ? `<img src="${note.createdBy.photoURL}" alt="Avatar" class="note-preview-avatar">`
              : `<div class="note-preview-avatar-placeholder">👤</div>`
      }
    </div>
    <h4 class="note-preview-title">${shortTitle}</h4>
    <p class="note-preview-content">${previewContent}</p>
  </div>
`;
                })
                .join("");
        }
    } catch (error) {
        console.error("❌ Errore nel recupero delle note:", error);
        notesPreviewList.innerHTML = "<p>Errore nel caricamento delle note.</p>";
    }
});

// 🔄 Gestione navigazione e apertura sidebar
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        const isVisible = sidebar.style.left === "0px";
        sidebar.style.left = isVisible ? "-350px" : "0px";
        console.log("🔁 Sidebar toggled:", sidebar.style.left);
    } else {
        console.warn("⚠ Sidebar non trovata");
    }
};

window.navigateTo = function (page) {
    window.location.href = page;
};

// 🔁 Espone aggiornaEmail globalmente
window.aggiornaEmail = function aggiornaEmail() {
    const userEmailElement = document.getElementById("userEmail");
    const sidebarContainer = document.getElementById("sidebar-container");
    const openSidebarButton = document.getElementById("openSidebar");

    if (!userEmailElement) {
        console.warn("⚠ Elemento userEmail non trovato nel DOM. Attendo il caricamento...");
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            userEmailElement.innerText = user.email;
            if (sidebarContainer) sidebarContainer.style.display = "block";
            if (openSidebarButton) openSidebarButton.style.display = "block";
        } else {
            if (sidebarContainer) {
                sidebarContainer.innerHTML = "";
                sidebarContainer.style.display = "none";
            }
            if (openSidebarButton) openSidebarButton.style.display = "none";
            console.log("✅ Sidebar e pulsante rimossi correttamente dopo il logout!");
        }
    });
};

// 📥 Carica dinamicamente sidebar e sidebar.js
const sidebarContainer = document.getElementById("sidebar-container");

if (sidebarContainer) {
    fetch("sidebar.html")
        .then((res) => res.text())
        .then((html) => {
            sidebarContainer.innerHTML = html;
            console.log("[✓] Sidebar inserita nel DOM");

            requestAnimationFrame(() => {
                const script = document.createElement("script");
                script.type = "module";
                script.src = "sidebar.js";
                script.onload = () => {
                    console.log("[✓] sidebar.js caricato correttamente");
                    if (typeof aggiornaEmail === "function") aggiornaEmail();
                };
                document.body.appendChild(script);
            });
        })
        .catch((err) => {
            console.error("❌ Errore nel caricamento di sidebar.html:", err);
        });
}
