import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { initNotifications, destroyNotifications, markAllAsRead } from "./notifications.js";

console.log("🔥 Avvio sidebar.js...");

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Esegui il codice solo dopo che il DOM della sidebar è realmente pronto
function initializeSidebar() {
  console.log("[✓] DOM caricato o sidebar disponibile");

  // Aspetta che gli elementi siano disponibili nel DOM
  const waitForElements = () => {
    const avatarEl = document.getElementById("userAvatar");
    const emailEl = document.getElementById("userEmail");
    const nameEl = document.getElementById("welcomeMessage");
    const logoutBtn = document.getElementById("logoutButton");

    console.log("[DEBUG] Elementi sidebar trovati:", {
      avatar: !!avatarEl,
      email: !!emailEl,
      name: !!nameEl,
      logout: !!logoutBtn
    });

    if (avatarEl && emailEl && nameEl) {
      startSidebarLogic(avatarEl, emailEl, nameEl, logoutBtn);
    } else {
      console.log("[DEBUG] Elementi non ancora pronti, riprovo tra 100ms...");
      setTimeout(waitForElements, 100);
    }
  };

  waitForElements();
}

function startSidebarLogic(avatarEl, emailEl, nameEl, logoutBtn) {
  console.log("[✓] Avvio logica sidebar con elementi pronti");

  onAuthStateChanged(auth, async (user) => {
    console.log("[DEBUG] onAuthStateChanged triggerato");

    if (!user) {
      console.warn("⚠ Nessun utente autenticato");
      return;
    }

    console.log("[DEBUG] Utente:", user.uid, user.email);
    if (emailEl) emailEl.textContent = user.email;

    console.log("[DEBUG] avatarEl trovato?", !!avatarEl);
    console.log("[DEBUG] nameEl trovato?", !!nameEl);

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      const data = snap.data();

      console.log("[DEBUG] Dati da Firestore:", data);

      // Carica avatar iniziale
      console.log("[DEBUG] photoURL da Firestore:", data?.photoURL);
      console.log("[DEBUG] avatarEl disponibile:", !!avatarEl);
      
      if (data?.photoURL && avatarEl) {
        avatarEl.src = data.photoURL;
        console.log("✅ Foto caricata:", data.photoURL);
        console.log("[DEBUG] Avatar src impostato a:", avatarEl.src);
      } else if (avatarEl) {
        avatarEl.src = "icone/default-avatar.png";
        console.log("✅ Foto di default caricata");
        console.log("[DEBUG] Avatar src impostato a:", avatarEl.src);
      } else {
        console.warn("⚠ Elemento avatar mancante - ID userAvatar non trovato");
      }

      // Carica nome/nickname iniziale
      if (data?.nickname && nameEl) {
        nameEl.textContent = "Welcome, " + data.nickname;
        console.log("Nome mostrato:", data.nickname);
      } else if (data?.displayName && nameEl) {
        nameEl.textContent = "Welcome, " + data.displayName;
        console.log("Nome mostrato:", data.displayName);
      } else if (nameEl) {
        nameEl.textContent = "Welcome, " + (user.email?.split("@")[0] || "User");
      } else {
        console.warn("⚠ Nessun nome trovato o elemento mancante");
      }

      // 🔄 Aggiungi listener real-time DOPO il caricamento iniziale
      onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const updatedData = docSnap.data();
          console.log("[DEBUG] Aggiornamento real-time dati utente:", updatedData);

          // Aggiorna solo se diverso dall'attuale
          if (avatarEl && updatedData?.photoURL !== avatarEl.src) {
            if (updatedData?.photoURL) {
              avatarEl.src = updatedData.photoURL;
              console.log("✅ Avatar aggiornato via Firestore:", updatedData.photoURL);
            } else {
              avatarEl.src = "icone/default-avatar.png";
              console.log("✅ Avatar reset a default");
            }
          }

          // Aggiorna nome se cambiato
          if (nameEl) {
            const newName = updatedData?.nickname || updatedData?.displayName || user.email?.split("@")[0] || "User";
            const expectedText = "Welcome, " + newName;
            if (nameEl.textContent !== expectedText) {
              nameEl.textContent = expectedText;
              console.log("✅ Nome aggiornato via Firestore:", newName);
            }
          }
        }
      }, (error) => {
        console.error("❌ Errore listener utente:", error);
      });

      // ✅ Inizializza sistema notifiche SOLO se abbiamo i dati del gruppo
      if (data?.groupId) {
        console.log("🔔 Inizializzazione notifiche per gruppo:", data.groupId);
        console.log("📅 Dati utente per timestamp ingresso:", {
          joinedAt: data.joinedAt,
          createdAt: data.createdAt,
          groupJoinedAt: data.groupJoinedAt
        });
        
        // Usa la data di ingresso nel gruppo se disponibile, altrimenti data corrente
        let userJoinedAt = null;
        if (data.joinedAt) {
          userJoinedAt = data.joinedAt;
        } else if (data.groupJoinedAt) {
          userJoinedAt = data.groupJoinedAt;
        } else if (data.createdAt) {
          userJoinedAt = data.createdAt;
        }
        
        console.log("🕒 Data ingresso utilizzata:", userJoinedAt);
        
        // 🎭 Usa nickname se disponibile, altrimenti firstName, poi displayName come fallback
        const userName = data.nickname || data.firstName || data.displayName || "Utente";
        console.log("👤 Nome utente per notifiche:", userName);
        
        initNotifications(user.uid, userName, data.groupId, userJoinedAt);
      } else {
        console.warn("⚠ Nessun gruppo trovato per l'utente, notifiche non inizializzate");
      }
    } catch (err) {
      console.error("[DEBUG] Errore durante recupero dati:", err);
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        // Distruggi le notifiche prima del logout
        console.log("🔔 Distruzione notifiche...");
        destroyNotifications();
        
        await signOut(auth);
        console.log("✅ Logout eseguito");
        window.location.href = "index.html";
      } catch (error) {
        console.error("❌ Errore durante il logout:", error);
      }
    });
  }

  const toggleBtn = document.getElementById("openSidebar");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      toggleSidebar();
    });
  }
}

// 🔁 Tentativo automatico con timeout se il DOM è già pronto
function waitForSidebarElements(maxAttempts = 10, interval = 100) {
  let attempts = 0;
  const check = setInterval(() => {
    const avatarEl = document.getElementById("userAvatar");
    const nameEl = document.getElementById("welcomeMessage");
    const emailEl = document.getElementById("userEmail");

    if (avatarEl && nameEl && emailEl) {
      clearInterval(check);
      initializeSidebar();
    } else if (++attempts >= maxAttempts) {
      clearInterval(check);
      console.warn("⚠ Timeout: elementi sidebar non trovati");
    }
  }, interval);
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  waitForSidebarElements();
} else {
  document.addEventListener("DOMContentLoaded", waitForSidebarElements);
}

window.toggleSidebar = function () {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.style.left = sidebar.style.left === "0px" ? "-300px" : "0px";
    console.log("🔁 Toggle sidebar:", sidebar.style.left);
  } else {
    console.warn("⚠ Sidebar non trovata");
  }
};

// ✅ Collega subito i pulsanti di toggle, senza attendere eventi DOM
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("openSidebar");
const closeBtn = document.getElementById("closeSidebar");

if (toggleBtn && sidebar) {
  toggleBtn.addEventListener("click", toggleSidebar);
}

if (closeBtn && sidebar) {
  closeBtn.addEventListener("click", toggleSidebar);
}

// ✅ Chiusura automatica sidebar se clicco esterno
document.addEventListener("click", function (event) {
  const sidebar = document.getElementById("sidebar");
  const openButton = document.getElementById("openSidebar");

  // Se sidebar non è visibile, non fare nulla
  if (!sidebar || sidebar.style.left !== "0px") return;

  // Se il click è dentro la sidebar o sul pulsante di apertura, ignora
  if (sidebar.contains(event.target) || openButton.contains(event.target)) return;

  // Altrimenti, chiudi la sidebar
  sidebar.style.left = "-300px";
});

// ===== FUNZIONI MODAL NOTIFICHE =====

// Funzione per aprire il modal delle notifiche
window.openNotifications = function() {
  const modal = document.getElementById("notificationsModal");
  if (modal) {
    modal.style.display = "flex";
  }
};

// Funzione per chiudere il modal delle notifiche  
window.closeNotifications = function() {
  const modal = document.getElementById("notificationsModal");
  if (modal) {
    modal.style.display = "none";
  }
};

// Funzione per segnare tutte le notifiche come lette
window.markAllAsRead = function() {
  markAllAsRead();
};

// Inizializza il modal delle notifiche
function initializeNotificationsModal() {
  const modal = document.getElementById("notificationsModal");
  if (modal) {
    // Chiudi il modal se si clicca fuori
    modal.addEventListener("click", function(e) {
      if (e.target === modal) {
        closeNotifications();
      }
    });
  }
}

// Inizializza il modal quando la sidebar è pronta
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initializeNotificationsModal, 200);
});

// 🔄 Listener per sincronizzazione avatar tra tab/finestre
window.addEventListener('storage', (e) => {
  if (e.key === 'userAvatarUpdated' && e.newValue) {
    try {
      const data = JSON.parse(e.newValue);
      console.log("[SIDEBAR] 🔄 Ricevuto aggiornamento avatar:", data.url);
      
      // Aggiorna avatar nella sidebar
      const avatarEl = document.getElementById("userAvatar");
      if (avatarEl) {
        avatarEl.src = data.url;
        console.log("[SIDEBAR] ✅ Avatar aggiornato");
      }
    } catch (err) {
      console.warn("[SIDEBAR] ⚠️ Errore parsing avatar update:", err);
    }
  }
});
