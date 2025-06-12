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

        snapshot.docs.forEach((docSnap, index) => {
            const data = docSnap.data();
            const timestamp = data.timestamp?.toDate?.();
            const dateStr = timestamp ? timestamp.toLocaleDateString("it-IT") : "—";
            const timeStr = timestamp
                ? timestamp.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
                : "";
            const userId = data.userId || "—";

            const li = document.createElement("div");
            li.classList.add("note-box", index % 2 === 0 ? "even" : "odd");
            li.setAttribute("data-content", data.content);
            li.setAttribute("data-id", docSnap.id);
            li.addEventListener("click", (e) => {
                if (!e.target.closest(".options-button") && !e.target.closest(".options-menu")) {
                    openEditorModal(docSnap.id);
                }
            });

            li.innerHTML = `
    <div class="note-content">
        <h3>${data.title}</h3>
        <div class="note-meta">🕒 ${dateStr} - ${timeStr}</div>
    </div>
    <div class="note-options">
        <button class="options-button" data-id="${docSnap.id}">⋮</button>
        <div class="options-menu" data-id="${docSnap.id}" style="display: none;">
            <button class="menu-delete">🗑 Delete</button>
        </div>
    </div>
`;
            noteList.appendChild(li);

            const menuButton = li.querySelector(".options-button");
            const optionsMenu = li.querySelector(".options-menu");

            menuButton.addEventListener("click", (event) => {
                event.stopPropagation();
                const isVisible = optionsMenu.style.display === "block";
                document.querySelectorAll(".options-menu").forEach((menu) => (menu.style.display = "none"));
                optionsMenu.style.display = isVisible ? "none" : "block";
            });

            document.addEventListener("click", () => {
                optionsMenu.style.display = "none";
            });

            optionsMenu.querySelector(".menu-delete").addEventListener("click", async () => {
                if (confirm("🗑 Do you want to delete the note?")) {
                    await deleteDoc(doc(db, "notes", docSnap.id));
                    console.log("✅ Nota eliminata:", docSnap.id);
                }
            });
        });
    });
});

// 🔥 Gestione box modale per creazione e modifica note
function openEditorModal(noteId = null) {
    const modal = document.getElementById("noteEditorModal");
    const titleInput = document.getElementById("noteEditorTitle");
    const saveButton = document.getElementById("saveNoteEditorButton");

    modal.style.display = "block";
    saveButton.setAttribute("data-id", noteId || "new");

    if (!window.quill) {
        window.quill = new Quill("#noteEditor", {
            theme: "snow",
            placeholder: "Write your note here...",
            modules: {
                toolbar: [
                    [{ header: [1, 2, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    [{ indent: "-1" }, { indent: "+1" }],
                    [{ direction: "rtl" }],
                    [{ color: [] }, { background: [] }],
                    [{ align: [] }],
                    ["link", "image"],
                    ["clean"]
                ]
            }
        });

        console.log("✅ Quill inizializzato");

        // ✅ Inserisci bottone emoji tra toolbar e editor
        const container = document.querySelector("#noteEditor .ql-container");
        const toolbar = container?.querySelector(".ql-toolbar");
        const editor = container?.querySelector(".ql-editor");

        if (toolbar && editor && !document.getElementById("emojiEditorBtn")) {
            const emojiWrapper = document.createElement("div");
            emojiWrapper.className = "editor-toolbar-extension";
            emojiWrapper.innerHTML = `<button id="emojiEditorBtn" title="Emoji">😊</button>`;
            toolbar.insertAdjacentElement("afterend", emojiWrapper);
        }

        // ➕ Collega picker al bottone appena creato
        document.addEventListener("click", (e) => {
            if (!emojiPickerForQuill.contains(e.target) && !e.target.closest("#emojiEditorBtn")) {
                emojiPickerForQuill.style.display = "none";
            }
        });

        document.addEventListener("click", () => {
            const btn = document.getElementById("emojiEditorBtn");
            btn?.addEventListener("click", () => {
                const rect = btn.getBoundingClientRect();
                const pickerWidth = 300;
                const spaceRight = window.innerWidth - rect.left;

                emojiPickerForQuill.style.left =
                    spaceRight < pickerWidth ? `${rect.right - pickerWidth}px` : `${rect.left}px`;
                emojiPickerForQuill.style.top = `${rect.bottom + 8}px`;
                emojiPickerForQuill.style.display = emojiPickerForQuill.style.display === "block" ? "none" : "block";
            });
        });
    }

    if (noteId) {
        onSnapshot(doc(db, "notes", noteId), (docSnap) => {
            if (docSnap.exists()) {
                titleInput.value = docSnap.data().title || "";
                window.quill.root.innerHTML = docSnap.data().content || "<p></p>";
            }
        });
    } else {
        titleInput.value = "";
        window.quill.setContents([]);
    }
}

function closeEditorModal() {
    document.getElementById("noteEditorModal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
    const closeButton = document.querySelector(".close");
    if (closeButton) {
        closeButton.addEventListener("click", () => {
            closeEditorModal();
        });
    }
});

// 🔥 Crea nuova nota solo alla conferma
document.getElementById("createNoteButton").addEventListener("click", () => {
    openEditorModal();
});

// 🔥 Salvataggio delle modifiche SOLO se la nota non è vuota
document.getElementById("saveNoteEditorButton").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("⚠ You must be logged in!");

    const noteId = document.getElementById("saveNoteEditorButton").getAttribute("data-id");
    const title = document.getElementById("noteEditorTitle").value.trim();
    const content = window.quill.root.innerHTML.trim();

    if (!title && window.quill.getText().trim() === "") {
        alert("⚠ Empty note! It will not be saved!");
        closeEditorModal();
        return;
    }

    if (noteId === "new") {
        await addDoc(collection(db, "notes"), {
            title: title || "New Note",
            content: content,
            userId: user.uid,
            timestamp: new Date()
        });
    } else {
        await updateDoc(doc(db, "notes", noteId), {
            title: title,
            content: content,
            timestamp: new Date()
        });
    }

    alert("✅ Saved!");
    closeEditorModal();
});

// 🔍 Cerca note in tempo reale per titolo o contenuto
document.getElementById("searchNotes").addEventListener("input", () => {
    const searchTerm = document.getElementById("searchNotes").value.toLowerCase();
    const noteBoxes = document.querySelectorAll(".note-box");

    noteBoxes.forEach((box) => {
        const title = box.querySelector("h3")?.textContent.toLowerCase() || "";
        const content = box.getAttribute("data-content")?.toLowerCase() || "";

        const matches = title.includes(searchTerm) || content.includes(searchTerm);
        box.style.display = matches ? "flex" : "none";
    });
});

// 👉 Emoji picker per input titolo
const emojiPicker = document.createElement("emoji-picker");
emojiPicker.style.position = "absolute";
emojiPicker.style.display = "none";
emojiPicker.style.zIndex = "9999";
document.body.appendChild(emojiPicker);

const emojiBtn = document.getElementById("emojiTitleBtn");
const titleInput = document.getElementById("noteEditorTitle");

emojiBtn.addEventListener("click", (event) => {
    const rect = emojiBtn.getBoundingClientRect();
    emojiPicker.style.left = `${rect.left}px`;
    emojiPicker.style.top = `${rect.bottom + 8}px`;
    emojiPicker.style.display = "block";
});

emojiPicker.addEventListener("emoji-click", (event) => {
    const emoji = event.detail.unicode;
    const start = titleInput.selectionStart;
    const end = titleInput.selectionEnd;
    const value = titleInput.value;
    titleInput.value = value.slice(0, start) + emoji + value.slice(end);
    titleInput.selectionStart = titleInput.selectionEnd = start + emoji.length;
    titleInput.focus();
    emojiPicker.style.display = "none";
});

document.addEventListener("click", (e) => {
    if (!emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
        emojiPicker.style.display = "none";
    }
});

// 👉 Emoji picker per input NOTA
const emojiEditorBtn = document.getElementById("emojiEditorBtn");

emojiEditorBtn?.addEventListener("click", () => {
    const rect = emojiEditorBtn.getBoundingClientRect();
    const pickerWidth = 300;
    const spaceRight = window.innerWidth - rect.left;

    emojiPickerForQuill.style.left = spaceRight < pickerWidth ? `${rect.right - pickerWidth}px` : `${rect.left}px`;
    emojiPickerForQuill.style.top = `${rect.bottom + 8}px`;
    emojiPickerForQuill.style.display = emojiPickerForQuill.style.display === "block" ? "none" : "block";
});
