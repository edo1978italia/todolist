// Importa Firebase
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

// 🔥 Recupero dati da Firebase per il widget delle ricette
import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs
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
        localStorage.setItem("userPhoto", userCredential.user.photoURL || "icone/default-avatar.png");

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
        const sidebarContainer = document.getElementById("sidebar-container");
        const openSidebarButton = document.getElementById("openSidebar");

        if (!userEmailElement) {
            console.warn("⚠ Elemento userEmail non trovato nel DOM. Attendo il caricamento...");
            return;
        }

        // 🔥 Aspetta Firebase Authentication e aggiorna email
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("✅ Utente autenticato:", user.email);
                if (sidebarContainer) sidebarContainer.style.display = "block"; // 🔥 Mostra la sidebar
                if (openSidebarButton) openSidebarButton.style.display = "block"; // 🔥 Mostra il pulsante di apertura
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
            const sidebarContainer = document.getElementById("sidebar-container");
            if (sidebarContainer) {
                sidebarContainer.innerHTML = data;
                // 🔥 Aspetta che gli elementi della sidebar siano presenti
                setTimeout(() => {
                    const userEmailElement = document.getElementById("userEmail");
                    if (userEmailElement) {
                        aggiornaEmail();
                    }
                }, 100);
            } else {
                console.warn("⚠ sidebar-container non trovato!");
            }
        })
        .catch((error) => console.error("Errore nel caricamento della sidebar:", error));
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

// 🔥 Funzione per caricare i dati del gruppo (task, note, ricette)
async function loadGroupData(groupId) {
    if (!groupId) return;
    
    console.log("[SCRIPT] 🔄 Caricamento dati gruppo:", groupId);
    window._groupId = groupId; // Salva per uso successivo

    // 🔹 TASK PREVIEW
    const taskPreview = document.getElementById("taskPreview");
    if (taskPreview) {
        try {
            const taskSnap = await getDocs(
                query(collection(db, "tasks"), where("groupId", "==", groupId), orderBy("createdAt", "desc"), limit(3))
            );
            let html = "";
            if (taskSnap.empty) {
                html = "<li>❌ Nessun task disponibile</li>";
            } else {
                html = taskSnap.docs
                    .map((doc) => {
                        const task = doc.data();
                        const title = task.title || "Task senza nome";
                        const completed = task.completed ? "✅" : "⬜";
                        return `<li>${completed} ${title}</li>`;
                    })
                    .join("");
            }
            taskPreview.innerHTML = html;
        } catch (err) {
            console.error("❌ Errore nei task preview:", err);
            taskPreview.innerHTML = "<li>Errore nel caricamento</li>";
        }
    }

    // 🔹 NOTES PREVIEW
    const notesPreviewList = document.getElementById("notesPreviewList");
    if (notesPreviewList) {
        try {
            const noteSnap = await getDocs(
                query(collection(db, "notes"), where("groupId", "==", groupId), orderBy("timestamp", "desc"), limit(3))
            );
            let html = "";
            if (noteSnap.empty) {
                html = "<p>❌ Nessuna nota da mostrare</p>";
            } else {
                // Cache per gli avatar degli utenti per evitare chiamate multiple
                const userAvatarCache = new Map();
                
                const notePromises = noteSnap.docs.map(async (doc) => {
                    const note = doc.data();
                    const title = (note.title || "Senza titolo").slice(0, 15);
                    const content = (note.content || "").replace(/<[^>]+>/g, "").slice(0, 180);
                    
                    let avatarURL = "icone/default-avatar.png";
                    const createdBy = note.createdBy || {};
                    
                    // 🔥 Recupera l'avatar attuale dell'utente da Firestore invece di usare quello memorizzato
                    if (createdBy.uid) {
                        try {
                            if (userAvatarCache.has(createdBy.uid)) {
                                // Usa cache se disponibile
                                const cachedData = userAvatarCache.get(createdBy.uid);
                                avatarURL = cachedData.photoURL || "icone/default-avatar.png";
                            } else {
                                // Recupera da Firestore e metti in cache
                                const userRef = doc(db, "users", createdBy.uid);
                                const userSnap = await getDoc(userRef);
                                if (userSnap.exists()) {
                                    const userData = userSnap.data();
                                    avatarURL = userData.photoURL || "icone/default-avatar.png";
                                    userAvatarCache.set(createdBy.uid, { photoURL: userData.photoURL });
                                } else {
                                    // Fallback ai dati memorizzati nella nota
                                    avatarURL = createdBy.photoURL || "icone/default-avatar.png";
                                    userAvatarCache.set(createdBy.uid, { photoURL: createdBy.photoURL });
                                }
                            }
                        } catch (err) {
                            console.warn("⚠ Errore recupero avatar utente in preview:", err);
                            // Fallback ai dati memorizzati nella nota
                            avatarURL = createdBy.photoURL || "icone/default-avatar.png";
                        }
                    }
                    
                    const avatar = `<img src="${avatarURL}" class="note-preview-avatar">`;
                    
                    return `
            <div class="note-preview-box">
              <div class="note-preview-avatar-wrap">${avatar}</div>
              <h4 class="note-preview-title">${title}</h4>
              <p class="note-preview-content">${content}</p>
            </div>`;
                });
                
                const noteResults = await Promise.all(notePromises);
                html = noteResults.join("");
            }
            notesPreviewList.innerHTML = html;
        } catch (err) {
            console.error("❌ Errore nelle note preview:", err);
            notesPreviewList.innerHTML = "<p>Errore nel caricamento delle note</p>";
        }
    }

    // 🔹 RICETTE PREVIEW
    const ricettePreviewList = document.getElementById("latestRecipesList");
    if (ricettePreviewList) {
        try {
            const ricetteSnap = await getDocs(
                query(
                    collection(db, "ricette"),
                    where("groupId", "==", groupId),
                    orderBy("dataCreazione", "desc"),
                    limit(3)
                )
            );
            let html = "";
            if (ricetteSnap.empty) {
                html = "<p>❌ Nessuna ricetta da mostrare</p>";
            } else {
                html = ricetteSnap.docs
                    .map((doc) => {
                        const r = doc.data();
                        const img = r.immagineUrl || "placeholder.jpg";
                        const nome = r.nome || "Senza nome";
                        return `
            <div class="recipe-widget-item">
              <img src="${img}" alt="${nome}" class="recipe-widget-img">
              <p class="recipe-widget-name">${nome}</p>
            </div>`;
                    })
                    .join("");
            }
            ricettePreviewList.innerHTML = html;
        } catch (err) {
            console.error("❌ Errore nelle ricette preview:", err);
            ricettePreviewList.innerHTML = "<p>Errore nel caricamento delle ricette.</p>";
        }
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const userData = userSnap.data();
    const groupId = userData?.groupId;
    if (!groupId) return;

    // Carica i dati del gruppo usando la nuova funzione
    await loadGroupData(groupId);
});

// 🔄 Listener per sincronizzazione avatar tra tab/finestre
window.addEventListener('storage', (e) => {
  if (e.key === 'userAvatarUpdated' && e.newValue) {
    try {
      const data = JSON.parse(e.newValue);
      console.log("[SCRIPT] 🔄 Ricevuto aggiornamento avatar:", data.url);
      
      // Aggiorna avatar nella sidebar se presente
      const avatarEl = document.getElementById("userAvatar");
      if (avatarEl) {
        avatarEl.src = data.url;
        console.log("[SCRIPT] ✅ Avatar sidebar aggiornato");
      }
      
      // 🔥 Se siamo in una pagina di gruppo, refresh del dashboard per aggiornare i preview delle note
      if (window._groupId && typeof loadGroupData === 'function') {
        console.log("[SCRIPT] 🔄 Refresh dashboard gruppo per aggiornamento avatar...");
        setTimeout(() => {
          loadGroupData(window._groupId);
        }, 500); // Piccolo delay per permettere alla sincronizzazione Firebase di completarsi
      }
      
    } catch (err) {
      console.warn("[SCRIPT] ⚠️ Errore parsing avatar update:", err);
    }
  }
});
