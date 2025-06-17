import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

console.log("🔥 Avvio sidebar.js...");

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Esegui il codice solo dopo che il DOM della sidebar è realmente pronto
function initializeSidebar() {
  console.log("[✓] DOM caricato o sidebar disponibile");

  const avatarEl = document.getElementById("userAvatar");
  const emailEl = document.getElementById("userEmail");
  const nameEl = document.getElementById("welcomeMessage");
  const logoutBtn = document.getElementById("logoutButton");

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

      if (data?.photoURL && avatarEl) {
        avatarEl.src = data.photoURL;
        console.log("Foto caricata:", data.photoURL);
      } else {
        console.warn("⚠ Nessuna foto trovata o elemento mancante");
      }

      if (data?.displayName && nameEl) {
        nameEl.textContent = "Welcome, " + data.displayName;
        console.log("Nome mostrato:", data.displayName);
      } else {
        console.warn("⚠ Nessun nome trovato o elemento mancante");
      }
    } catch (err) {
      console.error("[DEBUG] Errore durante recupero dati:", err);
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
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


// Attiva subito il pulsante toggle, anche prima dei dati utente
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("openSidebar");
  const closeBtn = document.getElementById("closeSidebar");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      toggleSidebar();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      toggleSidebar();
    });
  }
});
