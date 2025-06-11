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


// 🔥 Controlla se l'utente è autenticato e carica la sidebar e le note
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        document.body.innerHTML = "<h2>⚠ Devi essere loggato per accedere alle note!</h2>";
        setTimeout(() => window.location.href = "todolist.html", 2000);
        return;
    }

    await loadSidebar(); // ✅ Carica la sidebar
    loadNotes(user.uid); // ✅ Mostra solo le note dell'utente autenticato
});

// 🔥 Carica la sidebar dinamicamente
async function loadSidebar() {
    try {
        const response = await fetch("sidebar.html");
        const sidebarContent = await response.text();
        document.getElementById("sidebar-container").innerHTML = sidebarContent;

        // 🔥 Dopo il caricamento, assicuriamoci che `sidebar.js` sia eseguito
        const script = document.createElement("script");
        script.src = "sidebar.js";
        document.body.appendChild(script);

        setTimeout(() => {
            initializeSidebarEvents(); // 🔥 Connetti gli eventi ai pulsanti dopo il caricamento
        }, 500);

        updateUserInfo(); // 🔥 Aggiorna le informazioni utente nella sidebar

    } catch (error) {
        console.error("❌ Errore nel caricamento della sidebar:", error);
    }
}

// 🔥 Inizializza gli eventi della sidebar
function initializeSidebarEvents() {
    const openSidebarButton = document.getElementById("openSidebar");
    if (openSidebarButton) {
        openSidebarButton.addEventListener("click", () => {
            const sidebar = document.getElementById("sidebar");
            if (sidebar) {
                sidebar.classList.toggle("active");
            }
        });
    }

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
    }
}

// 🔥 Recupera e mostra le note dell'utente autenticato
async function loadNotes(userId) {
    const noteList = document.getElementById("noteList");
    noteList.innerHTML = "";

    const q = query(collection(db, "notes"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <a href="nuovaricetta.html?id=${docSnap.id}">${docSnap.data().title}</a>
            <button onclick="deleteNote('${docSnap.id}')">🗑 Elimina</button>
        `;
        noteList.appendChild(li);
    });
}

// 🔥 Crea una nuova nota
async function createNewNote() {
    const user = auth.currentUser;
    if (!user) {
        alert("⚠ Devi essere loggato per creare una nota!");
        return;
    }

    const docRef = await addDoc(collection(db, "notes"), {
        title: "Nuova Nota",
        content: "",
        userId: user.uid
    });
    window.location.href = `nuovaricetta.html?id=${docRef.id}`;
}

// 🔥 Elimina una nota
async function deleteNote(noteId) {
    if (confirm("Sei sicuro di voler eliminare questa nota?")) {
        await deleteDoc(doc(db, "notes", noteId));
        loadNotes(auth.currentUser.uid); // 🔄 Aggiorna la lista dopo l'eliminazione
    }
}

// 🔥 Aggiorna l'email dell'utente nella sidebar
function updateUserInfo() {
    const userEmailElement = document.getElementById("userEmail");
    if (!userEmailElement) {
        console.warn("⚠ Elemento userEmail non trovato!");
        return;
    }

    auth.onAuthStateChanged((user) => {
        userEmailElement.innerText = user ? user.email : "Non autenticato";
    });
}

// 🔥 Gestione logout
document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
    }
});

// 🔥 Funzione logout
window.logoutUser = async function () {
    try {
        await auth.signOut();
        localStorage.clear();
        console.log("✅ Logout completato!");
        setTimeout(() => {
            window.location.href = "todolist.html";
        }, 1000);
    } catch (error) {
        console.error("❌ Errore nel logout:", error);
        alert("Errore nel logout: " + error.message);
    }
};
