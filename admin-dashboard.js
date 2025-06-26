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
  showSection('admin-users');
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
let groupsMap = {};
let currentSort = { key: 'displayName', dir: 1 };
let searchTerm = '';

async function loadUsers() {
  const userList = document.getElementById('userList');
  userList.innerHTML = '<tr><td colspan="6">Caricamento...</td></tr>';
  try {
    // Carica utenti
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    usersCache = snapshot.docs.map(docu => ({ id: docu.id, ...docu.data() }));
    // Carica gruppi
    const groupsCol = collection(db, 'groups');
    const groupsSnap = await getDocs(groupsCol);
    groupsMap = {};
    groupsSnap.forEach(docu => {
      groupsMap[docu.id] = docu.data().name || '-';
    });
    renderUserTable();
  } catch (e) {
    userList.innerHTML = '<tr><td colspan="6">Errore nel caricamento utenti</td></tr>';
  }
}

function filterUsers() {
  if (!searchTerm) return usersCache;
  const term = searchTerm.toLowerCase();
  return usersCache.filter(user =>
    (user.displayName && user.displayName.toLowerCase().includes(term)) ||
    (user.email && user.email.toLowerCase().includes(term))
  );
}

function renderUserTable() {
  const userList = document.getElementById('userList');
  const filtered = filterUsers();
  const userCount = document.getElementById('userCount');
  if (userCount) userCount.textContent = `UtentiRegistrati: ${filtered.length}`;
  if (!filtered.length) {
    userList.innerHTML = '<tr><td colspan="6">Nessun utente trovato</td></tr>';
    return;
  }
  // Ordina
  const sorted = [...filtered].sort((a, b) => {
    let v1, v2;
    if (currentSort.key === 'groupId') {
      v1 = groupsMap[a.groupId] || '';
      v2 = groupsMap[b.groupId] || '';
    } else {
      v1 = a[currentSort.key] || '';
      v2 = b[currentSort.key] || '';
    }
    if (typeof v1 === 'string') v1 = v1.toLowerCase();
    if (typeof v2 === 'string') v2 = v2.toLowerCase();
    if (v1 < v2) return -1 * currentSort.dir;
    if (v1 > v2) return 1 * currentSort.dir;
    return 0;
  });
  userList.innerHTML = sorted.map((user, idx) => `
    <tr data-user-idx="${usersCache.findIndex(u => u.id === user.id)}">
      <td><img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email || 'U') + '&background=232325&color=fff'}" class="user-avatar" alt="avatar" width="36" height="36"></td>
      <td>${user.firstName || user.name || '-'}</td>
      <td>${user.lastName || user.lastname || '-'}</td>
      <td>${user.displayName || '-'}</td>
      <td>${user.email || '-'}</td>
      <td>${groupsMap[user.groupId] || '-'}</td>
      <td><span class="user-role-badge user-role-${user.role || 'user'}">${user.role || 'user'}</span></td>
      <td>${user.status || 'attivo'}</td>
      <td><!-- Azioni future --></td>
    </tr>
  `).join('');
  // Aggiungi click su ogni riga per aprire la scheda utente
  Array.from(userList.querySelectorAll('tr')).forEach(tr => {
    tr.addEventListener('click', function(e) {
      // Evita click su azioni future
      if (e.target.closest('button')) return;
      const idx = tr.getAttribute('data-user-idx');
      if (idx !== null) showUserDetailModal(usersCache[idx]);
    });
  });
}

function showUserDetailModal(user) {
  const modal = document.getElementById('userDetailModal');
  const content = document.getElementById('userDetailContent');
  if (!modal || !content) return;
  // Calcola nome gruppo e numero utenti
  let groupName = groupsMap[user.groupId] || '-';
  let groupUserCount = '';
  if (user.groupId && groupName !== '-') {
    const count = usersCache.filter(u => u.groupId === user.groupId).length;
    groupUserCount = ` - ${count} utente${count === 1 ? '' : 'i'}`;
    if(count !== 1) groupUserCount = ` - ${count} utenti`;
  }
  // Costruisci HTML dettagliato
  let html = `<div style='text-align:center;margin-bottom:18px;'>
    <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email || 'U') + '&background=232325&color=fff'}" alt="avatar" style="width:64px;height:64px;border-radius:50%;border:2px solid #6ec1e4;box-shadow:0 2px 8px #0005;object-fit:cover;aspect-ratio:1/1;">
    <div style='font-size:1.2em;font-weight:600;margin-top:8px;'>${user.displayName || '-'}</div>
    <div style='color:#6ec1e4;font-size:0.98em;'>${user.email || '-'}</div>
  </div>`;
  html += '<table class="user-detail-table" style="width:100%;border-collapse:collapse;font-size:1em;">';
  // Ordine richiesto
  const fieldOrder = [
    ['Nome', user.firstName || user.name || '-'],
    ['Cognome', user.lastName || user.lastname || '-'],
    ['Nickname', user.displayName || '-'],
    ['Data di nascita', user.birthdate || user.birthDate || '-'],
    ['Età', user.age || '-'],
    ['Nazione', user.country || '-'],
    ['Email', user.email || '-'],
    ['Gruppo', groupName + groupUserCount],
    ['Ruolo', user.role || 'user'],
    ['Stato', user.status || 'attivo'],
    ['ID Utente', user.id || '-'],
    ['Creato il', (() => {
      let v = user.createdAt || user.created_at || user.created || null;
      if (v && typeof v === 'object' && v.seconds && v.nanoseconds) {
        const d = new Date(v.seconds * 1000);
        return d.toLocaleString('it-IT');
      } else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
        try { return new Date(v).toLocaleString('it-IT'); } catch(e) { return v; }
      } else if (v) {
        return v;
      } else {
        return '-';
      }
    })()]
  ];
  fieldOrder.forEach(([label, val]) => {
    html += `<tr><td>${label}</td><td style='padding:4px 0;'>${val}</td></tr>`;
  });
  // Mostra tutti i campi extra non già elencati
  const shown = ['firstName','name','lastName','lastname','displayName','birthdate','birthDate','age','country','email','groupId','role','status','id','uid','photoURL','createdAt','created_at','created'];
  Object.keys(user).forEach(k => {
    if (!shown.includes(k)) {
      let v = user[k];
      // Formatta date Firestore Timestamp o stringhe ISO
      if (v && typeof v === 'object' && v.seconds && v.nanoseconds) {
        const d = new Date(v.seconds * 1000);
        v = d.toLocaleString('it-IT');
      } else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
        try { v = new Date(v).toLocaleString('it-IT'); } catch(e) {}
      }
      html += `<tr><td>${k}</td><td style='padding:4px 0;'>${v}</td></tr>`;
    }
  });
  html += '</table>';
  content.innerHTML = html;
  modal.style.display = 'flex';
}
// Chiudi modal
window.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('closeUserDetail');
  if (closeBtn) closeBtn.onclick = () => {
    document.getElementById('userDetailModal').style.display = 'none';
  };
  // Chiudi cliccando sfondo
  const modal = document.getElementById('userDetailModal');
  if (modal) modal.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });
});

// Ordinamento colonne
function setupUserTableSort() {
  const ths = document.querySelectorAll('.user-table th');
  // Mappa colonne -> chiavi user/gruppo
  const keys = [
    null, // Avatar (non ordinabile)
    'firstName', // Name
    'lastName',  // Lastname
    'displayName', // Nickname
    'email',
    'groupId', // Gruppo (user.groupId, ma mostriamo nome)
    'role',
    'status',
    null // Azioni (non ordinabile)
  ];
  ths.forEach((th, idx) => {
    if (keys[idx] === null) return; // Salta avatar e azioni
    th.style.cursor = 'pointer';
    th.onclick = () => {
      // Se già ordinato per questa colonna, inverte la direzione
      if (currentSort.key === keys[idx]) {
        currentSort.dir *= -1;
      } else {
        currentSort.key = keys[idx];
        currentSort.dir = 1;
      }
      renderUserTable();
      // Aggiorna indicatori visuali (es: freccia su/giù)
      ths.forEach((t, i) => {
        t.classList.remove('sorted-asc', 'sorted-desc');
        if (i === idx) t.classList.add(currentSort.dir === 1 ? 'sorted-asc' : 'sorted-desc');
      });
    };
  });
}

// Carica utenti quando si accede alla sezione utenti
window.showSection = function(id) {
  // Nasconde tutte le sezioni principali
  document.querySelectorAll('#admin-main section').forEach(sec => sec.style.display = 'none');

  // Mostra la sezione richiesta
  document.getElementById(id).style.display = '';

  // Rimuove classe active da tutti i bottoni
  document.querySelectorAll('#admin-sidebar button').forEach(btn => btn.classList.remove('active'));

  // Rende attivo il bottone corrispondente
  const btns = document.querySelectorAll('#admin-sidebar nav button');
  if (id === 'admin-users') {
    btns[0].classList.add('active');
    loadUsers(); // ✅ carica gli utenti
  }
  if (id === 'admin-notes') {
    btns[1].classList.add('active');
    // loadNoteStats(); // se vuoi caricare statistiche note
  }
  if (id === 'admin-recipes') {
    btns[2].classList.add('active');
    // loadRecipeStats(); // se vuoi caricare statistiche ricette
  }
  if (id === 'admin-notifications') {
    btns[3].classList.add('active');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  checkAdminAccess();
  setupUserTableSort();
  // Ricerca live utenti
  const searchInput = document.getElementById('userSearch');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchTerm = e.target.value;
      renderUserTable();
    });
  }
});

// Funzione per cambiare sezione (come da HTML)

// Placeholder: logica per popolare tabella utenti, filtro gruppi, invio notifiche...
