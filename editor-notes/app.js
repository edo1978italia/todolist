import { auth, db } from "../firebase.js";
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from "firebase/firestore";

// 🔥 Controlla se l'utente è autenticato e carica la sidebar e le note
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        document.body.innerHTML = "<h2>⚠ Devi essere loggato per accedere alle note!</h2>";
        setTimeout(() => window.location.href = "../login.html", 2000);
        return;
    }

    await loadSidebar(); // ✅ Carica la sidebar
    loadNotes(user.uid); // ✅ Mostra solo le note dell'utente autenticato
});

// 🔥 Carica la sidebar dinamicamente
async function loadSidebar() {
    try {
        const response = await fetch("../sidebar.html");
        const sidebarContent = await response.text();
        document.getElementById("sidebar-container").innerHTML = sidebarContent;

        // 🔥 Dopo il caricamento, assicuriamoci che `sidebar.js` sia eseguito
        const script = document.createElement("script");
        script.src = "../sidebar.js";
        document.body.appendChild(script);

        updateUserInfo(); // 🔥 Aggiorna le informazioni utente nella sidebar

    } catch (error) {
        console.error("❌ Errore nel caricamento della sidebar:", error);
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
            <a href="note.html?id=${docSnap.id}">${docSnap.data().title}</a>
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
    window.location.href = `note.html?id=${docRef.id}`;
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
        console.log("✅ Pulsante logout registrato correttamente!");
    } else {
        console.warn("⚠ Pulsante logout non trovato!");
    }
});

// 🔥 Funzione logout
window.logoutUser = async function () {
    try {
        await auth.signOut();
        localStorage.clear();
        console.log("✅ Logout completato!");

        setTimeout(() => {
            window.location.href = "../login.html";
        }, 1000);
    } catch (error) {
        console.error("❌ Errore nel logout:", error);
        alert("Errore nel logout: " + error.message);
    }
};
