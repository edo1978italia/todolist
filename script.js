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

// 🆕 Real-time listener per aggiornamenti avatar di tutti gli utenti del gruppo (per widget note)
function setupAvatarRealTimeListener(groupId) {
  // Query per tutti gli utenti del gruppo
  const usersQuery = query(collection(db, "users"), where("groupId", "==", groupId));
  
  // Listener per cambiamenti in tempo reale
  window._dashboardAvatarUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
    // 🆕 Inizializza la cache globale se non esiste
    if (!window.userAvatarCache) window.userAvatarCache = {};
    
    // 🆕 PRIMA volta: carica TUTTI gli avatar nella cache
    if (!snapshot.metadata.fromCache || snapshot.docChanges().length === snapshot.docs.length) {
      console.log("[SCRIPT] 🔄 Caricamento iniziale avatar nella cache globale...");
      snapshot.docs.forEach((doc) => {
        const userId = doc.id;
        const userData = doc.data();
        if (userData.photoURL) {
          window.userAvatarCache[userId] = userData.photoURL;
          console.log(`[SCRIPT] 📦 Avatar caricato in cache per ${userId}:`, userData.photoURL);
        }
      });
      
      // 🚀 IMPORTANTE: Segnala che la cache è pronta
      window._avatarCacheReady = true;
      console.log("[SCRIPT] ✅ Cache avatar pronta!");
      
      // 🔥 Se il widget note è già in attesa, forza il refresh ora che abbiamo gli avatar
      if (window._waitingForAvatarCache) {
        console.log("[SCRIPT] 🔄 Widget note era in attesa, refresh ora...");
        window._waitingForAvatarCache = false;
        // Ricarica il widget note ora che la cache è pronta
        if (window._groupId) {
          setTimeout(() => {
            const event = new CustomEvent('avatarCacheReady');
            window.dispatchEvent(event);
          }, 100);
        }
      }
    }
    
    // Gestisce i cambiamenti successivi
    snapshot.docChanges().forEach((change) => {
      if (change.type === "modified") {
        const userId = change.doc.id;
        const userData = change.doc.data();
        
        // Controlla se è cambiato l'avatar
        if (userData.photoURL) {
          console.log(`[SCRIPT] 🔄 Avatar aggiornato per utente ${userId}:`, userData.photoURL);
          
          // 🆕 Aggiorna la cache globale
          window.userAvatarCache[userId] = userData.photoURL;
          
          // Aggiorna tutti gli avatar di questo utente nel widget note
          updateUserAvatarInNoteWidget(userId, userData.photoURL);
          
          // 🆕 Il widget note ora è real-time, quindi si aggiorna automaticamente
          // Non serve più forzare il refresh manuale
        }
      }
    });
  }, (error) => {
    console.error("❌ Errore listener avatar real-time in dashboard:", error);
  });
}

// 🆕 Aggiorna avatar di un utente specifico nel widget note
function updateUserAvatarInNoteWidget(userId, newAvatarURL) {
  const noteAvatars = document.querySelectorAll('.note-preview-avatar');
  let updated = false;
  
  noteAvatars.forEach(avatar => {
    if (avatar.dataset.userId === userId) {
      avatar.src = newAvatarURL;
      updated = true;
      console.log(`[SCRIPT] ✅ Avatar aggiornato nel widget note per utente ${userId}`);
    }
  });
  
  // Se non abbiamo trovato avatar da aggiornare, potrebbe essere che il widget note non sia ancora caricato
  // o che l'utente non abbia note visibili. In questo caso, non facciamo nulla
  if (!updated) {
    console.log(`[SCRIPT] ℹ️ Nessun avatar trovato nel widget note per utente ${userId}`);
  }
}

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
        // 🆕 Pulisci listener avatar real-time
        if (window._dashboardAvatarUnsubscribe) {
            window._dashboardAvatarUnsubscribe();
            window._dashboardAvatarUnsubscribe = null;
        }
        
        // 🆕 Pulisci listener widget note real-time
        if (window._notesWidgetUnsubscribe) {
            window._notesWidgetUnsubscribe();
            window._notesWidgetUnsubscribe = null;
        }
        
        // 🆕 Pulisci variabili di sincronizzazione
        window._avatarCacheReady = false;
        window._waitingForAvatarCache = false;
        window.userAvatarCache = null;
        
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


// 🔥 Widget Home: preview delle 3 liste più recenti (stile note-preview)
async function renderListsPreviewWidget(groupId) {
  const container = document.getElementById("listsPreviewContainer");
  if (!container || !groupId) return;
  container.innerHTML = '<div style="text-align:center;color:#888;">Loading...</div>';

  try {
    // Prendi le 3 liste più recenti (modificate)
    // NB: Firestore non permette due orderBy se non sono sempre presenti entrambi i campi e indicizzati
    // Qui usiamo solo updatedAt (se presente su tutte le liste), altrimenti solo createdAt
    // Fallback: ordina solo per createdAt (più compatibile se mancano updatedAt)
    const q = query(
      collection(db, "lists"),
      where("groupId", "==", groupId),
      orderBy("createdAt", "desc"),
      limit(3)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      container.innerHTML = '<div style="text-align:center;color:#888;">No lists to show</div>';
      return;
    }
    // Per ogni lista, conta i task
    const listHtmls = await Promise.all(snap.docs.map(async (docSnap) => {
      const list = docSnap.data();
      const listId = docSnap.id;
      // Conta i task
      const qTasks = query(collection(db, "tasks"), where("groupId", "==", groupId), where("listId", "==", listId));
      const snapTasks = await getDocs(qTasks);
      const taskCount = snapTasks.size;
      // Data
      let dateStr = "";
      if (list.updatedAt && list.updatedAt.toDate) {
        const d = list.updatedAt.toDate();
        dateStr = d.toLocaleDateString();
      } else if (list.createdAt && list.createdAt.toDate) {
        const d = list.createdAt.toDate();
        dateStr = d.toLocaleDateString();
      }
      // HTML box stile note-preview
      return `<div class="note-preview-box" data-list-id="${listId}">
        <div class="note-preview-title">${list.name || '(No title)'}
          <span class="list-preview-badge">${taskCount}</span>
        </div>
        <div class="list-preview-date">${dateStr}</div>
      </div>`;
    }));
    container.innerHTML = listHtmls.join("");

    // Click: vai alla lista
    container.querySelectorAll('.note-preview-box').forEach(box => {
      box.addEventListener('click', function() {
        const listId = this.getAttribute('data-list-id');
        if (listId) window.location.href = `todolist.html#${listId}`;
      });
    });
  } catch (err) {
    container.innerHTML = '<div style="color:red;">Error loading lists</div>';
    console.error("[WIDGET LISTS] Errore:", err);
  }
}

// Inizializza il widget preview liste in home
document.addEventListener("DOMContentLoaded", function () {
  // Se il container non esiste (per sicurezza), non fare nulla
  if (!document.getElementById("listsPreviewContainer")) return;
});

// Aggiorna il widget quando autenticato e groupId disponibile
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();
  const groupId = userData?.groupId;
  if (!groupId) return;
  renderListsPreviewWidget(groupId);
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

    // 🆕 Avvia real-time listener per aggiornamenti avatar (se non già attivo)
    if (!window._dashboardAvatarUnsubscribe) {
        setupAvatarRealTimeListener(groupId);
    }

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
                        // 🔧 Supporta sia 'name' che 'title' per compatibilità
                        const title = task.name || task.title || "Task senza nome";
                        // 🎨 Applica classe CSS 'completed' se il task è completato (senza icone)
                        const completedClass = task.completed ? ' class="completed"' : '';
                        return `<li${completedClass}>${title}</li>`;
                    })
                    .join("");
            }
            taskPreview.innerHTML = html;
        } catch (err) {
            console.error("❌ Errore nei task preview:", err);
            taskPreview.innerHTML = "<li>Errore nel caricamento</li>";
        }
    }

    // 🔹 NOTES PREVIEW con REAL-TIME listener
    setupNotesWidgetRealTime(groupId);

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

// 🆕 Funzione dedicata per refresh del widget note con REAL-TIME listener
function setupNotesWidgetRealTime(groupId) {
  const notesPreviewList = document.getElementById("notesPreviewList");
  if (!notesPreviewList || !groupId) return;
  
  console.log("[SCRIPT] 🔄 Setup real-time listener per widget note...");
  
  // 🔥 REAL-TIME listener per le note del gruppo (come in notes-home.js)
  const notesQuery = query(
    collection(db, "notes"), 
    where("groupId", "==", groupId), 
    orderBy("timestamp", "desc"), 
    limit(3)
  );
  
  // 🆕 Cleanup del listener precedente se esiste
  if (window._notesWidgetUnsubscribe) {
    window._notesWidgetUnsubscribe();
  }
  
  // 🆕 Listener per quando la cache avatar è pronta
  window.addEventListener('avatarCacheReady', () => {
    console.log("[SCRIPT] 🔄 Cache avatar pronta, refresh widget note...");
    // Il listener onSnapshot si riattiva automaticamente
  });
  
  window._notesWidgetUnsubscribe = onSnapshot(notesQuery, async (snapshot) => {
    try {
      console.log("[SCRIPT] 🔄 Aggiornamento real-time widget note...");
      
      // 🚀 Se la cache avatar non è ancora pronta, aspetta
      if (!window._avatarCacheReady) {
        console.log("[SCRIPT] ⏳ Cache avatar non pronta, aspetto...");
        window._waitingForAvatarCache = true;
        // Mostra un placeholder temporaneo
        notesPreviewList.innerHTML = "<p>🔄 Caricamento note...</p>";
        return;
      }
      
      let html = "";
      if (snapshot.empty) {
        html = "<p>❌ Nessuna nota da mostrare</p>";
      } else {
        const notePromises = snapshot.docs.map(async (doc) => {
          const note = doc.data();
          const title = (note.title || "Senza titolo").slice(0, 15);
          
          // Estrae solo la prima riga di testo puro
          let noteContent = "No content";
          if (note.content) {
            try {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = note.content;
              
              const allElements = tempDiv.children;
              let firstElementText = "";
              
              for (let i = 0; i < allElements.length; i++) {
                const element = allElements[i];
                const elementText = (element.textContent || element.innerText || "").trim();
                if (elementText) {
                  firstElementText = elementText;
                  break;
                }
              }
              
              if (!firstElementText) {
                const allText = tempDiv.textContent || tempDiv.innerText || '';
                firstElementText = allText.trim().substring(0, 60);
              }
              
              if (firstElementText.length > 60) {
                const lastSpaceIndex = firstElementText.lastIndexOf(' ', 60);
                const cutIndex = lastSpaceIndex > 30 ? lastSpaceIndex : 60;
                firstElementText = firstElementText.substring(0, cutIndex).trim() + "...";
              }
              
              noteContent = firstElementText.replace(/\s+/g, " ").trim();
              
            } catch (err) {
              console.warn("🔍 Errore parsing HTML in preview:", err);
              noteContent = note.content.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().substring(0, 60) + "...";
            }
          }
          
          let avatarURL = "icone/default-avatar.png";
          const createdBy = note.createdBy || {};
          
          // 🔥 ORA che la cache è pronta, usala SEMPRE
          if (createdBy.uid) {
            if (window.userAvatarCache && window.userAvatarCache[createdBy.uid]) {
              avatarURL = window.userAvatarCache[createdBy.uid];
              console.log(`[SCRIPT] ✅ Avatar da cache pronta per ${createdBy.uid}:`, avatarURL);
            } else {
              // Solo se proprio non trovato in cache (raro)
              avatarURL = createdBy.photoURL || "icone/default-avatar.png";
              console.log(`[SCRIPT] ⚠️ Avatar fallback per ${createdBy.uid}:`, avatarURL);
            }
          }
          
          const avatar = `<img src="${avatarURL}" class="note-preview-avatar" data-user-id="${createdBy.uid || ''}">`;
          
          return `
            <div class="note-preview-box">
              <div class="note-preview-avatar-wrap">${avatar}</div>
              <h4 class="note-preview-title">${title}</h4>
              <p class="note-preview-content">${noteContent}</p>
            </div>`;
        });
        
        const noteResults = await Promise.all(notePromises);
        html = noteResults.join("");
      }
      
      notesPreviewList.innerHTML = html;
      console.log("[SCRIPT] ✅ Widget note aggiornato con cache avatar pronta");
      
    } catch (err) {
      console.error("❌ Errore real-time widget note:", err);
      notesPreviewList.innerHTML = "<p>Errore nel caricamento delle note</p>";
    }
  }, (error) => {
    console.error("❌ Errore listener real-time widget note:", error);
  });
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
      
      // 🔥 Aggiorna la cache globale con il nuovo avatar
      if (window._groupId) {
        console.log("[SCRIPT] 🔄 Avatar aggiornato via localStorage per gruppo:", window._groupId);
        
        // 🆕 Aggiorna la cache globale con il nuovo avatar
        if (!window.userAvatarCache) window.userAvatarCache = {};
        
        // 🆕 IMPORTANTE: aggiungiamo l'userId se disponibile nei dati
        if (data.userId) {
          window.userAvatarCache[data.userId] = data.url;
          console.log(`[SCRIPT] ✅ Cache avatar aggiornata per utente ${data.userId}:`, data.url);
          
          // Aggiorna immediatamente gli avatar nel widget se presenti
          updateUserAvatarInNoteWidget(data.userId, data.url);
        }
        
        console.log("[SCRIPT] ✅ Widget note real-time si aggiornerà automaticamente");
      }
      
    } catch (err) {
      console.warn("[SCRIPT] ⚠️ Errore parsing avatar update:", err);
    }
  }
});
