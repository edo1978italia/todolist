// admin-dashboard.js
// Dashboard admin: solo sintassi modular Firebase v9+ (import ES6)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import firebaseConfig from "./config.js";

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Mostra o nasconde contenuto admin in base al ruolo
function checkAdminAccess() {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      showLoginPanel();
      return;
    }
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().role === "admin") {
        showAdminPanel();
      } else {
        await signOut(auth);
        showLoginPanel();
        alert("Accesso riservato agli amministratori.");
      }
    } catch (e) {
      await signOut(auth);
      showLoginPanel();
      alert("Errore di accesso.");
    }
  });
}

// Mostra/nasconde i pannelli
function showAdminPanel() {
  document.getElementById('admin-login-panel').style.display = 'none';
  document.getElementById('admin-sidebar').style.display = '';
  document.getElementById('admin-main').style.display = '';
}
function showLoginPanel() {
  document.getElementById('admin-login-panel').style.display = '';
  document.getElementById('admin-sidebar').style.display = 'none';
  document.getElementById('admin-main').style.display = 'none';
}

// Gestione login form
window.addEventListener('DOMContentLoaded', () => {
  checkAdminAccess();
  const form = document.getElementById('adminLoginForm');
  if(form) form.onsubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    document.getElementById('adminLoginError').textContent = '';
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // L'onAuthStateChanged farà il resto
    } catch (err) {
      document.getElementById('adminLoginError').textContent = 'Login fallito: ' + (err.message || 'Controlla le credenziali');
    }
  };
  // Logout
  var btn = document.getElementById('logoutBtn');
  if(btn) btn.addEventListener('click', async function(e) {
    e.preventDefault();
    await signOut(auth);
    showLoginPanel();
  });
});

// --- GESTIONE UTENTI ---
let usersCache = [];
let currentSort = { key: 'displayName', dir: 1 };

async function loadUsers() {
  const userList = document.getElementById('userList');
  userList.innerHTML = '<tr><td colspan="6">Caricamento...</td></tr>';
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    usersCache = snapshot.docs.map(docu => ({ id: docu.id, ...docu.data() }));
    renderUserTable();
  } catch (e) {
    userList.innerHTML = '<tr><td colspan="6">Errore nel caricamento utenti</td></tr>';
  }
}

function renderUserTable() {
  const userList = document.getElementById('userList');
  if (!usersCache.length) {
    userList.innerHTML = '<tr><td colspan="6">Nessun utente trovato</td></tr>';
    return;
  }
  // Ordina
  const sorted = [...usersCache].sort((a, b) => {
    let v1 = a[currentSort.key] || '';
    let v2 = b[currentSort.key] || '';
    if (typeof v1 === 'string') v1 = v1.toLowerCase();
    if (typeof v2 === 'string') v2 = v2.toLowerCase();
    if (v1 < v2) return -1 * currentSort.dir;
    if (v1 > v2) return 1 * currentSort.dir;
    return 0;
  });
  userList.innerHTML = sorted.map(user => `
    <tr>
      <td><img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email || 'U') + '&background=232325&color=fff'}" class="user-avatar" alt="avatar" width="36" height="36"></td>
      <td>${user.displayName || '-'}</td>
      <td>${user.email || '-'}</td>
      <td><span class="user-role-badge user-role-${user.role || 'user'}">${user.role || 'user'}</span></td>
      <td>${user.status || 'attivo'}</td>
      <td><!-- Azioni future --></td>
    </tr>
  `).join('');
}

// Ordinamento colonne
function setupUserTableSort() {
  const ths = document.querySelectorAll('.user-table th');
  const keys = ['photoURL', 'displayName', 'email', 'role', 'status'];
  ths.forEach((th, idx) => {
    if(idx === 0 || idx === 5) return; // Salta avatar e azioni
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const key = keys[idx];
      if(currentSort.key === key) currentSort.dir *= -1;
      else { currentSort.key = key; currentSort.dir = 1; }
      renderUserTable();
    });
  });
}

// Carica utenti quando si accede alla sezione utenti
window.showSection = function(id) {
  document.querySelectorAll('#admin-main section').forEach(sec => sec.style.display = 'none');
  document.getElementById(id).style.display = '';
  document.querySelectorAll('#admin-sidebar button').forEach(btn => btn.classList.remove('active'));
  const btns = document.querySelectorAll('#admin-sidebar nav button');
  if(id === 'admin-users') {
    btns[0].classList.add('active');
    loadUsers();
  }
  if(id === 'admin-notes') btns[1].classList.add('active');
  if(id === 'admin-recipes') btns[2].classList.add('active');
  if(id === 'admin-notifications') btns[3].classList.add('active');
};

window.addEventListener('DOMContentLoaded', () => {
  checkAdminAccess();
  setupUserTableSort();
  // ...existing code...
});

// Funzione per cambiare sezione (come da HTML)
window.showSection = function(id) {
  document.querySelectorAll('#admin-main section').forEach(sec => sec.style.display = 'none');
  document.getElementById(id).style.display = '';
  document.querySelectorAll('#admin-sidebar button').forEach(btn => btn.classList.remove('active'));
  const btns = document.querySelectorAll('#admin-sidebar nav button');
  if(id === 'admin-users') btns[0].classList.add('active');
  if(id === 'admin-notes') btns[1].classList.add('active');
  if(id === 'admin-recipes') btns[2].classList.add('active');
  if(id === 'admin-notifications') btns[3].classList.add('active');
};

// Placeholder: logica per popolare tabella utenti, filtro gruppi, invio notifiche...
