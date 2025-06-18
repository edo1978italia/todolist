import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

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
