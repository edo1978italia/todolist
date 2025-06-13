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
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
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

    modal.style.display = "block";

    document.getElementById("saveNoteEditorButton").setAttribute("data-id", noteId || "new");
    document.getElementById("deleteNoteEditorButton").setAttribute("data-id", noteId || "new");

    if (!window.quill) {
        window.quill = new Quill("#noteEditor", {
            theme: "snow",
            placeholder: "Write your note here...",
            modules: {
                toolbar: [
                    ["emoji"],
                    [{ header: [1, 2, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    [{ indent: "-1" }, { indent: "+1" }],
                    [{ direction: "rtl" }],
                    [{ color: [] }, { background: [] }],
                    [{ align: [] }],
                    ["link", "image"],
                    ["clean"]
                ],
                "emoji-toolbar": true,
                "emoji-textarea": false,
                "emoji-shortname": true
            }
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

// 🔥 Mostra/Nasconde il menu del modale
document.addEventListener("DOMContentLoaded", () => {
    const optionsButton = document.getElementById("noteOptionsButton");
    const optionsMenu = document.getElementById("noteOptionsMenu");

    optionsButton.addEventListener("click", (event) => {
        event.stopPropagation();
        optionsMenu.style.display = optionsMenu.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", () => {
        optionsMenu.style.display = "none";
    });
});

// 🔥 Gestione eliminazione note dal modale
document.getElementById("deleteNoteEditorButton").addEventListener("click", async () => {
    const noteId = document.getElementById("saveNoteEditorButton").getAttribute("data-id");

    if (!noteId || noteId === "new") {
        alert("❌ Errore: questa nota non è ancora salvata!");
        return;
    }

    if (confirm("🗑 Vuoi eliminare questa nota definitivamente?")) {
        try {
            await deleteDoc(doc(db, "notes", noteId));
            alert("✅ Nota eliminata!");
            document.getElementById("noteEditorModal").style.display = "none";
        } catch (error) {
            console.error("❌ Errore eliminazione:", error);
            alert("Errore durante la cancellazione della nota.");
        }
    }
});



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

    // 🔥 Nuova validazione: entrambi i campi devono essere compilati
    if (!title || window.quill.getText().trim() === "") {
        alert("❌ Error: The title and body of the note must be filled in!");
        return;
    }

    if (noteId === "new") {
        await addDoc(collection(db, "notes"), {
            title,
            content,
            userId: user.uid,
            timestamp: new Date()
        });
    } else {
        await updateDoc(doc(db, "notes", noteId), {
            title,
            content,
            timestamp: new Date()
        });
    }

    alert("✅ Note saved successfully!");
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


// 🔥 Gestione logout
async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.clear();
        console.log("✅ Logout completato, utente disconnesso!");

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
    } catch (error) {
        console.error("❌ Errore nel logout:", error);
        alert("Errore nel logout: " + error.message);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
        console.log("✅ Pulsante logout registrato correttamente!");
    } else {
        console.warn("⚠ Pulsante logout non trovato!");
    }
});

window.logoutUser = logoutUser;

// 🔥 Gestione della sidebar con caricamento email utente
document.addEventListener("DOMContentLoaded", function () {
    fetch("sidebar.html")
        .then((response) => response.text())
        .then((data) => {
            document.getElementById("sidebarContainer").innerHTML = data;
            updateUserInfo(); // 🔥 Chiama la funzione solo dopo aver caricato la sidebar
        })
        .catch((error) => console.error("Errore nel caricamento della sidebar:", error));
});

function updateUserInfo() {
    const userEmailElement = document.getElementById("userEmail");
    if (!userEmailElement) {
        console.warn("⚠ Elemento userEmail non trovato!");
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            userEmailElement.innerText = user.email;
        } else {
            userEmailElement.innerText = "Non autenticato";
        }
    });
}

// 🔥 Funzione per aprire/chiudere la sidebar
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) {
        console.warn("⚠ Sidebar non trovata!");
        return;
    }

    sidebar.style.left = sidebar.style.left === "0px" ? "-350px" : "0px";
    console.log("🔄 Sidebar toggled:", sidebar.style.left);
};

// 🔥 Funzione per navigare tra le pagine dalla sidebar
window.navigateTo = function (page) {
    window.location.href = page;
};
