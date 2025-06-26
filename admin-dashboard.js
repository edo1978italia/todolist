// admin-dashboard.js
// Controllo accesso admin e placeholder logica dashboard

// Inizializza Firebase se necessario (usa config.js)
if (typeof firebase === 'undefined') {
  alert('Firebase non caricato!');
}

const auth = firebase.auth();
const db = firebase.firestore();

// Mostra o nasconde contenuto admin in base al ruolo
function checkAdminAccess() {
  auth.onAuthStateChanged(async user => {
    if (!user) {
      // Logout forzato anche lato dashboard se non autenticato
      window.location.href = 'login.html'; // oppure index.html se preferisci
      return;
    }
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists && userDoc.data().role === 'admin') {
        document.body.style.display = '';
        // Qui puoi chiamare funzioni per popolare utenti/notifiche
      } else {
        alert('Accesso riservato agli amministratori.');
        window.location.href = 'login.html';
      }
    } catch (e) {
      alert('Errore di accesso.');
      window.location.href = 'login.html';
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  document.body.style.display = 'none'; // nasconde tutto finché non verificato
  checkAdminAccess();
});

// Placeholder: logica per popolare tabella utenti, filtro gruppi, invio notifiche...
// Da implementare nelle prossime fasi
