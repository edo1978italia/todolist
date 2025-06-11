// Importa Firebase
import {
    getFirestore,
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    doc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔥 Inizializza Quill.js per la gestione delle note
let quill;
document.addEventListener("DOMContentLoaded", () => {
    quill = new Quill("#editor", {
        theme: "snow"
    });
});

// 🔥 Sincronizzazione live delle note utente
document.addEventListener("DOMContentLoaded", () => {
    const noteList = document.getElementById("noteList");

    onSnapshot(collection(db, "notes"), (snapshot) => {
        noteList.innerHTML = ""; // 🔄 Reset della lista per aggiornamenti live

        snapshot.docs.forEach((docSnap) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <input type="checkbox" class="noteCheckbox" style="display: none;" data-id="${docSnap.id}">
                <a href="#" onclick="editNote('${docSnap.id}', '${docSnap.data().title}', '${docSnap.data().content}')">${docSnap.data().title}</a>
            `;
            noteList.appendChild(li);
        });
    });
});

// 🔥 Creazione nuova nota
document.getElementById("createNoteButton").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("⚠ Devi essere loggato!");

    // 🔥 Crea una nuova nota in Firestore
    const docRef = await addDoc(collection(db, "notes"), {
        title: "Nuova Nota",
        content: "",
        userId: user.uid,
        timestamp: new Date()
    });

    console.log("✅ Nuova nota creata con ID:", docRef.id);

    // 🔥 Attiva l'editor Quill.js e imposta il nuovo ID
    editNote(docRef.id, "Nuova Nota");
});

function editNote(noteId, title) {
    const editorContainer = document.getElementById("editorContainer");
    const saveButton = document.getElementById("saveNoteButton");

    if (!editorContainer || !saveButton) {
        console.error("❌ Elementi dell'editor non trovati!");
        return;
    }

    // 🔥 Mostra l'editor
    editorContainer.style.display = "block";
    saveButton.setAttribute("data-id", noteId);
    
    // 🔥 Inizializza Quill.js SOLO quando necessario
    if (!window.quill) {
        window.quill = new Quill("#editor", { theme: "snow" });
        console.log("✅ Quill.js inizializzato!");
    }

    // 🔥 Imposta il titolo della nuova nota
    quill.setText(title);
}

// 🔥 Modifica nota esistente
function editNote(noteId, title) {
    document.getElementById("editorContainer").style.display = "block";
    document.getElementById("saveNoteButton").setAttribute("data-id", noteId);
    quill.setContents([{ insert: title + "\n" }]);
}

// 🔥 Salvataggio automatico delle modifiche in Firestore
document.getElementById("saveNoteButton").addEventListener("click", async () => {
    const noteId = document.getElementById("saveNoteButton").getAttribute("data-id");
    const content = quill.root.innerHTML;

    await updateDoc(doc(db, "notes", noteId), {
        content: content,
        timestamp: new Date()
    });

    alert("✅ Nota salvata!");
    document.getElementById("editorContainer").style.display = "none";
});

// 🔥 Abilita selezione multipla per eliminazione
document.getElementById("selectModeButton").addEventListener("click", function () {
    const checkboxes = document.querySelectorAll(".noteCheckbox");
    const isSelecting = this.innerText === "🔲 Selezione";

    checkboxes.forEach((cb) => cb.style.display = isSelecting ? "inline-block" : "none");
    this.innerText = isSelecting ? "🗑 Cancella" : "🔲 Selezione";
});

// 🔥 Cancella note selezionate
document.getElementById("selectModeButton").addEventListener("click", async function () {
    if (this.innerText !== "🗑 Cancella") return;

    const selectedNotes = document.querySelectorAll(".noteCheckbox:checked");
    if (selectedNotes.length === 0) return alert("⚠ Nessuna nota selezionata!");

    if (!confirm("Sei sicuro di voler eliminare le note selezionate?")) return;

    selectedNotes.forEach(async (cb) => {
        await deleteDoc(doc(db, "notes", cb.dataset.id));
    });

    alert("✅ Note cancellate!");
});
