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

// temporaneo
import { getDocs, updateDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

async function patchOldNotesWithAuthorData() {
  const notesSnapshot = await getDocs(collection(db, "notes"));

  for (const noteSnap of notesSnapshot.docs) {
    const note = noteSnap.data();

    if (note.createdBy || !note.userId) continue;

    const userRef = doc(db, "users", note.userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) continue;

    const userData = userSnap.data();
    const updatedBy = {
      uid: note.userId,
      displayName: userData.displayName || "",
      photoURL: userData.photoURL || ""
    };

    await updateDoc(doc(db, "notes", noteSnap.id), {
      createdBy: updatedBy
    });

    console.log(`✅ Nota ${noteSnap.id} aggiornata con createdBy`);
  }

  console.log("✨ Tutte le note legacy sono state patchate");
}


window.patchOldNotesWithAuthorData = patchOldNotesWithAuthorData;

// 🔥 FINE TEMPORANEO




// 🔥 Sincronizzazione live delle note utente
document.addEventListener("DOMContentLoaded", () => {
    const noteList = document.getElementById("noteList");

    onSnapshot(query(collection(db, "notes"), orderBy("pinned", "desc"), orderBy("timestamp", "desc")), (snapshot) => {
        noteList.innerHTML = ""; // 🔄 Reset lista

        snapshot.docs.forEach((docSnap, index) => {
            const data = docSnap.data();
            const noteTitle = data.title || "Senza titolo";
            const noteContent = data.content ? data.content.replace(/<[^>]+>/g, "") : "No content";

            // 🔥 Limita il titolo a 25 caratteri con "..."
            const shortTitle = noteTitle.length > 25 ? noteTitle.slice(0, 25) + "..." : noteTitle;

            // 🔥 Limita il contenuto della nota per evitare overflow
            const previewContent = noteContent.length > 180 ? noteContent.slice(0, 180) + "..." : noteContent;

            const li = document.createElement("div");
            li.classList.add("note-box", index % 2 === 0 ? "even" : "odd");
            if (data.pinned) li.classList.add("pinned");

            li.setAttribute("data-content", data.content);
            li.setAttribute("data-id", docSnap.id);
            li.addEventListener("click", (event) => {
                if (event.target.closest(".options-button") || event.target.closest(".options-menu")) {
                    return; // 🔥 Non aprire l'editor se clicco su pulsanti/menu
                }
                openEditorModal(docSnap.id);
            });

            const createdBy = data.createdBy || {};
            const avatarHTML = createdBy.photoURL
                ? `<img class="note-avatar" src="${createdBy.photoURL}" alt="${createdBy.displayName || ""}" title="${createdBy.displayName || ""}" />`
                : `<div class="note-avatar-placeholder">👤</div>`;

            li.innerHTML = `
  <div class="note-box-inner">
    <div class="note-author">
      ${avatarHTML}
    </div>
    <div class="note-content">
      <h3 class="note-preview-title">${shortTitle}</h3>
      <p class="note-preview-content">${previewContent}</p>
      <div class="note-meta">
        🕒 ${data.timestamp?.toDate?.().toLocaleString("it-IT") || "—"}
        ${data.pinned ? ' <span class="pin-indicator" title="Nota fissata">📌</span>' : ""}
      </div>
    </div>
    <div class="note-options">
      <button class="options-button" data-id="${docSnap.id}">⋮</button>
      <div class="options-menu" data-id="${docSnap.id}" style="display: none;">
        <button class="menu-pin">${data.pinned ? "Unpin" : "Pin"}</button>
        <button class="menu-delete">🗑 Delete</button>
      </div>
    </div>
  </div>
`;

            const deleteButton = li.querySelector(".menu-delete");

            deleteButton.addEventListener("click", async (event) => {
                event.stopPropagation(); // 🔥 Impedisce che venga aperta la nota

                if (confirm("🗑 Vuoi davvero eliminare questa nota?")) {
                    try {
                        await deleteDoc(doc(db, "notes", docSnap.id));
                        alert("✅ Nota eliminata con successo!");
                    } catch (error) {
                        console.error("❌ Errore durante l'eliminazione:", error);
                        alert("Errore durante l'eliminazione.");
                    }
                }
            });

            noteList.appendChild(li);
            // Bottone PIN/UNPIN
            const pinBtn = li.querySelector(".menu-pin");

            pinBtn.addEventListener("click", async (event) => {
                event.stopPropagation();
                const noteRef = doc(db, "notes", docSnap.id);
                try {
                    await updateDoc(noteRef, { pinned: !data.pinned });
                } catch (error) {
                    console.error("❌ Errore nel fissare/sfissare la nota:", error);
                }
            });

            const optionsBtn = li.querySelector(".options-button");
            const optionsMenu = li.querySelector(".options-menu");

            optionsBtn.addEventListener("click", (event) => {
                event.stopPropagation(); // 🔥 Blocca il click del box
                // 🔁 Chiude altri eventuali menu aperti
                document.querySelectorAll(".options-menu").forEach((menu) => {
                    if (menu !== optionsMenu) menu.style.display = "none";
                });

                optionsMenu.style.display = optionsMenu.style.display === "block" ? "none" : "block";
            });
        });
    });
});

document.addEventListener("click", (event) => {
    if (!event.target.closest(".options-menu") && !event.target.closest(".options-button")) {
        document.querySelectorAll(".options-menu").forEach((menu) => {
            menu.style.display = "none";
        });
    }
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
        alert("❌ Error: This note is not saved yet!");
        return;
    }

    if (confirm("🗑 Do you want to delete this note permanently?")) {
        try {
            await deleteDoc(doc(db, "notes", noteId));
            alert("✅ Note deleted!");
            document.getElementById("noteEditorModal").style.display = "none";
        } catch (error) {
            console.error("❌ Error deleting:", error);
            alert("Error deleting note.");
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
import { getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

document.getElementById("saveNoteEditorButton").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("⚠ You must be logged in!");

    const noteId = document.getElementById("saveNoteEditorButton").getAttribute("data-id");
    const title = document.getElementById("noteEditorTitle").value.trim();
    const content = window.quill.root.innerHTML.trim();

    if (!title || window.quill.getLength() <= 1) {
        alert("❌ Error: The title and body of the note must be filled in!");
        return;
    }

    // 🔥 🔎 Recupera dati utente anche da Firestore (fallback se photoURL è nullo)
    let displayName = user.displayName || "";
    let photoURL = user.photoURL || "";

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;

        if (!displayName && userData?.displayName) displayName = userData.displayName;
        if (!photoURL && userData?.photoURL) photoURL = userData.photoURL;
    } catch (err) {
        console.warn("⚠ Impossibile recuperare dati da Firestore:", err);
    }

    if (noteId === "new") {
        await addDoc(collection(db, "notes"), {
            title,
            content,
            pinned: false,
            timestamp: new Date(),
            createdBy: {
                uid: user.uid,
                displayName,
                photoURL
            }
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

// 🔥 Gestione sidebar
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.left = sidebar.style.left === "0px" ? "-350px" : "0px";
};

// 🔥 Navigazione tra le pagine
window.navigateTo = function (page) {
    window.location.href = page;
};

// 🔥 Caricamento dinamico della sidebar
document.addEventListener("DOMContentLoaded", () => {
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) {
        console.warn("⚠ sidebar-container non trovato!");
        return;
    }

    fetch("sidebar.html")
        .then((res) => res.text())
        .then((html) => {
            sidebarContainer.innerHTML = html;
            console.log("[✓] Sidebar inserita nel DOM");

            // ✅ Aspetta il ciclo successivo prima di eseguire sidebar.js
            requestAnimationFrame(() => {
                const script = document.createElement("script");
                script.type = "module";
                script.src = "sidebar.js";
                script.onload = () => console.log("[✓] sidebar.js caricato correttamente");
                document.body.appendChild(script);
            });
        })
        .catch((err) => {
            console.error("❌ Errore nel caricamento di sidebar.html:", err);
        });
});
