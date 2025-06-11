// Importa Firebase
import {
    getFirestore,
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    doc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔥 Inizializza Quill.js UNA SOLA VOLTA
let quill;
document.addEventListener("DOMContentLoaded", () => {
    if (!window.quill) {
        window.quill = new Quill("#editor", { theme: "snow" });
        console.log("✅ Quill.js inizializzato!");
    }
});

// 🔥 Sincronizzazione live delle note utente
document.addEventListener("DOMContentLoaded", () => {
    const noteList = document.getElementById("noteList");

    onSnapshot(query(collection(db, "notes"), orderBy("timestamp", "desc")), (snapshot) => {
        console.log("✅ Lista aggiornata con", snapshot.docs.length, "note.");

        noteList.innerHTML = ""; // 🔄 Reset lista
        snapshot.docs.forEach((docSnap) => {
            console.log("📌 Nota ricevuta:", docSnap.data());

            const li = document.createElement("li");
            li.classList.add("note-box");
            li.setAttribute("data-content", docSnap.data().content); // ✅ Salva contenuto per la ricerca

            li.innerHTML = `
                <h3>${docSnap.data().title}</h3>
                <button onclick="openModal('${docSnap.id}')">✏ Modifica</button>
            `;
            noteList.appendChild(li);
        });
    });
});

// 🔥 Gestione box modale per creazione e modifica note
function openEditorModal(noteId) {
    const modal = document.getElementById("noteEditorModal");
    const titleInput = document.getElementById("noteEditorTitle");
    const saveButton = document.getElementById("saveNoteEditorButton");

    modal.style.display = "block";
    saveButton.setAttribute("data-id", noteId);

    // 🔥 Inizializza Quill.js SOLO se non è già attivo
    if (!window.quill) {
        window.quill = new Quill("#noteEditor", { theme: "snow" });
        console.log("✅ Quill.js inizializzato!");
    } else {
        console.log("⚡ Quill.js già attivo!");
    }

    // 🔥 Recuperiamo i dati della nota da Firestore
    onSnapshot(doc(db, "notes", noteId), (docSnap) => {
        if (docSnap.exists()) {
            titleInput.value = docSnap.data().title || "Nuova Nota";
            quill.root.innerHTML = docSnap.data().content || "<p>Inizia a scrivere qui...</p>";
        } else {
            console.error("❌ Nota non trovata in Firestore!");
        }
    });
}


function closeEditorModal() {
    document.getElementById("noteEditorModal").style.display = "none";
}

// 🔥 Creazione nuova nota con apertura modale
document.getElementById("createNoteButton").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("⚠ Devi essere loggato!");

    const docRef = await addDoc(collection(db, "notes"), {
        title: "",
        content: "",
        userId: user.uid,
        timestamp: new Date()
    });

    console.log("✅ Nuova nota creata con ID:", docRef.id);
    openEditorModal(docRef.id); // 🔥 Apriamo direttamente il box modale con editor e titolo
});



// 🔥 Salvataggio delle modifiche
document.getElementById("saveNoteEditorButton").addEventListener("click", async () => {
    const noteId = document.getElementById("saveNoteEditorButton").getAttribute("data-id");
    const title = document.getElementById("noteEditorTitle").value;
    const content = quill.root.innerHTML;

    await updateDoc(doc(db, "notes", noteId), {
        title: title,
        content: content,
        timestamp: new Date()
    });

    alert("✅ Nota salvata!");
    closeEditorModal();
});

