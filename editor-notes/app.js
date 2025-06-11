import { auth, db } from "../firebase.js";
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from "firebase/firestore";

// 🔥 Carica la sidebar dinamicamente
async function loadSidebar() {
    const response = await fetch("../sidebar.html");
    const sidebarContent = await response.text();
    document.getElementById("sidebar-container").innerHTML = sidebarContent;

    // 🔥 Assicura che gli script della sidebar vengano ricaricati
    const script = document.createElement("script");
    script.src = "../sidebar.js";
    document.body.appendChild(script);
}

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
