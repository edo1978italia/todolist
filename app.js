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
import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
            li.setAttribute("data-content", docSnap.data().content);

            li.innerHTML = `
                <h3>${docSnap.data().title}</h3>
                <button class="editNoteButton" data-id="${docSnap.id}">✏ Modifica</button>
            `;
            noteList.appendChild(li);
        });

        // 🔥 Collega gli eventi ai pulsanti "Modifica"
        document.querySelectorAll(".editNoteButton").forEach(button => {
            button.addEventListener("click", (event) => {
                const noteId = event.target.getAttribute("data-id");
                openEditorModal(noteId);
            });
        });
    });
});

// 🔥 Gestione box modale per creazione e modifica note
function openEditorModal(noteId = null) {
    const modal = document.getElementById("noteEditorModal");
    const modalContent = modal.querySelector(".noteEditorContent"); 
    const titleInput = document.getElementById("noteEditorTitle");
    const saveButton = document.getElementById("saveNoteEditorButton");

    modal.style.display = "block";
    saveButton.setAttribute("data-id", noteId || "new");

    // 🔥 Inizializza Quill.js con una toolbar completa
    if (!window.quill) {
        window.quill = new Quill("#noteEditor", {
            theme: "snow",
            modules: {
                toolbar: [
                    [{ header: [1, 2, false] }],
                    ["bold", "italic", "underline", "strike"], 
                    [{ list: "ordered" }, { list: "bullet" }],
                    [{ script: "sub" }, { script: "super" }],
                    [{ indent: "-1" }, { indent: "+1" }],
                    [{ direction: "rtl" }],
                    [{ size: ["small", false, "large", "huge"] }], 
                    [{ color: [] }, { background: [] }],
                    [{ font: [] }],
                    [{ align: [] }],
                    ["link", "image"], 
                    ["clean"] 
                ]
            }
        });
        console.log("✅ Quill.js inizializzato con toolbar avanzata!");
    }

    if (noteId) {
        onSnapshot(doc(db, "notes", noteId), (docSnap) => {
            if (docSnap.exists()) {
                titleInput.value = docSnap.data().title || "";
                window.quill.root.innerHTML = docSnap.data().content || "<p>Inizia a scrivere qui...</p>";
            } else {
                console.error("❌ Nota non trovata!");
            }
        });
    } else {
        titleInput.value = "";
        window.quill.root.innerHTML = "<p>Inizia a scrivere qui...</p>";
    }
}

function closeEditorModal() {
    document.getElementById("noteEditorModal").style.display = "none";
}

// 🔥 Assicuriamoci che il tasto "X" chiuda il popup
document.addEventListener("DOMContentLoaded", () => {
    const closeButton = document.querySelector(".close");
    if (closeButton) {
        closeButton.addEventListener("click", () => {
            closeEditorModal();
        });
    } else {
        console.error("❌ Il tasto X non è stato trovato nel DOM!");
    }
});

// 🔥 Creazione nuova nota con apertura modale (senza salvarla subito)
document.getElementById("createNoteButton").addEventListener("click", () => {
    openEditorModal(); // 🔥 Apriamo il modale SENZA creare subito la nota
});

// 🔥 Salvataggio delle modifiche SOLO se l'utente ha scritto qualcosa
document.getElementById("saveNoteEditorButton").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("⚠ Devi essere loggato!");

    const noteId = document.getElementById("saveNoteEditorButton").getAttribute("data-id");
    const title = document.getElementById("noteEditorTitle").value.trim();
    const content = window.quill.root.innerHTML.trim();

    if (!title && content === "<p>Inizia a scrivere qui...</p>") {
        alert("⚠ Nota vuota! Non verrà salvata.");
        closeEditorModal();
        return;
    }

    if (noteId === "new") {
        const docRef = await addDoc(collection(db, "notes"), {
            title: title || "Nuova Nota",
            content: content,
            userId: user.uid,
            timestamp: new Date()
        });
        console.log("✅ Nuova nota creata con ID:", docRef.id);
    } else {
        await updateDoc(doc(db, "notes", noteId), {
            title: title,
            content: content,
            timestamp: new Date()
        });
        console.log("✅ Nota aggiornata con ID:", noteId);
    }

    alert("✅ Nota salvata!");
    closeEditorModal();
});
