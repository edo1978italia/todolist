document.body.classList.add("loading");

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
    doc,
    getDoc,
    where,
    getDocs,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import firebaseConfig from "./config.js";
import { notifyNoteCreated } from "./notifications.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ➕ per problema loading lento
// window.addEventListener("load", () => {
//     document.body.classList.remove("loading");
// });

// Rimuovi la classe loading solo quando tutto è pronto
window.removeLoading = function() {
  document.body.classList.remove("loading");
};

// window.addEventListener("DOMContentLoaded", () => {
//   setTimeout(() => {
//     window.removeLoading();
//   }, 200);
// });

// 🔥 Verifica sessione utente e aggiorna l'interfaccia
onAuthStateChanged(auth, async (user) => {
  const userEmailElement = document.getElementById("userEmail");

  if (!user) {
    console.warn("🚪 Non autenticato — redirect");
    window.location.href = "index.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    console.error("❌ Documento utente mancante");
    await signOut(auth);
    window.location.href = "index.html";
    return;
  }

  const data = userSnap.data();
  if (!data.groupId || data.groupId.trim() === "") {
    console.warn("🚫 Nessun groupId — redirect");
    window.location.href = "group-setup.html";
    return;
  }

  console.log("✅ Accesso consentito con groupId:", data.groupId);
  if (userEmailElement) userEmailElement.innerText = user.email;
  window._groupId = data.groupId;
  await populateCategorySelect("noteCategoryFilter", { includeAllOption: true });
  renderFilteredNotes(window._groupId);
  // Rimuovi loading solo dopo che utente e note sono pronte
  if (window._sidebarLoaded) window.removeLoading();
});

// 🔥 Sincronizzazione live delle note utente
document.addEventListener("DOMContentLoaded", () => {
  const categoryFilter = document.getElementById("noteCategoryFilter");

  if (categoryFilter) {
    categoryFilter.addEventListener("change", () => {
      if (window._groupId) {
        renderFilteredNotes(window._groupId);
      }
    });
  }
});


function renderFilteredNotes(groupId) {
  const noteList = document.getElementById("noteList");
  const selected = document.getElementById("noteCategoryFilter")?.value || "";

  // 🧼 Cancella listener precedente se esiste
  if (window._noteUnsubscribe) window._noteUnsubscribe();

  const notesQuery = query(
    collection(db, "notes"),
    where("groupId", "==", groupId),
    orderBy("pinned", "desc"),
    orderBy("timestamp", "desc")
  );

  window._noteUnsubscribe = onSnapshot(notesQuery, async (snapshot) => {
    noteList.innerHTML = "";
    let noteCount = 0;
    
    // Cache per gli avatar degli utenti per evitare chiamate multiple
    const userAvatarCache = new Map();
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      if (selected && data.category !== selected) continue;

      noteCount++;

      const noteTitle = data.title || "Senza titolo";
      const noteContent = data.content ? data.content.replace(/<[^>]+>/g, "") : "No content";
      const shortTitle = noteTitle.length > 25 ? noteTitle.slice(0, 25) + "..." : noteTitle;
      const previewContent = noteContent.length > 180 ? noteContent.slice(0, 180) + "..." : noteContent;

      const li = document.createElement("div");
      li.classList.add("note-box", noteCount % 2 === 0 ? "even" : "odd");
      if (data.pinned) li.classList.add("pinned");

      li.setAttribute("data-content", data.content);
      li.setAttribute("data-id", docSnap.id);
      li.addEventListener("click", (event) => {
        if (event.target.closest(".options-button") || event.target.closest(".options-menu")) return;
        openEditorModal(docSnap.id);
      });

      const createdBy = data.createdBy || {};
      let avatarURL = "icone/default-avatar.png";
      let displayName = createdBy.displayName || "";

      // 🔥 Recupera l'avatar attuale dell'utente da Firestore invece di usare quello memorizzato
      if (createdBy.uid) {
        try {
          if (userAvatarCache.has(createdBy.uid)) {
            // Usa cache se disponibile
            const cachedData = userAvatarCache.get(createdBy.uid);
            avatarURL = cachedData.photoURL || "icone/default-avatar.png";
            displayName = cachedData.displayName || displayName;
          } else {
            // Recupera da Firestore e metti in cache
            const userRef = doc(db, "users", createdBy.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              avatarURL = userData.photoURL || "icone/default-avatar.png";
              displayName = userData.displayName || displayName;
              userAvatarCache.set(createdBy.uid, { photoURL: userData.photoURL, displayName: userData.displayName });
            } else {
              // Fallback ai dati memorizzati nella nota
              avatarURL = createdBy.photoURL || "icone/default-avatar.png";
              userAvatarCache.set(createdBy.uid, { photoURL: createdBy.photoURL, displayName: createdBy.displayName });
            }
          }
        } catch (err) {
          console.warn("⚠ Errore recupero avatar utente:", err);
          // Fallback ai dati memorizzati nella nota
          avatarURL = createdBy.photoURL || "icone/default-avatar.png";
        }
      }

      const avatarHTML = `<img class="note-avatar" src="${avatarURL}" alt="${displayName}" title="${displayName}" />`;

      li.innerHTML = `
<div class="note-box-inner">
  <div class="note-author">${avatarHTML}</div>
  <div class="note-content">
    <h3 class="note-preview-title">${shortTitle}</h3>
    <p class="note-preview-content">${previewContent}</p>
    <span class="note-category-label">.${data.category || "—"}</span>
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

      li.querySelector(".menu-delete").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("🗑 Do you really want to delete this note?")) {
          try {
            await deleteDoc(doc(db, "notes", docSnap.id));
            alert("✅ Note deleted!");
          } catch (error) {
            console.error("❌ Errore durante l'eliminazione:", error);
            alert("Errore durante l'eliminazione.");
          }
        }
      });

      li.querySelector(".menu-pin").addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await updateDoc(doc(db, "notes", docSnap.id), { pinned: !data.pinned });
        } catch (error) {
          console.error("❌ Errore nel fissare/sfissare:", error);
        }
      });

      const optionsBtn = li.querySelector(".options-button");
      const optionsMenu = li.querySelector(".options-menu");
      optionsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".options-menu").forEach((menu) => {
          if (menu !== optionsMenu) menu.style.display = "none";
        });
        optionsMenu.style.display = optionsMenu.style.display === "block" ? "none" : "block";
      });

      noteList.appendChild(li);
    }
    
    if (noteCount === 0) {
      noteList.innerHTML = '<div style="text-align:center;color:#888;padding:2em;">No notes found for this group/category.</div>';
    }
  }, (error) => {
    noteList.innerHTML = `<div style="color:red;">Errore nel caricamento delle note: ${error.message}</div>`;
  });
}


// 👉 Emoji picker per input titolo

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

    // 📂 Carica categorie nel menu modale
    populateCategorySelect("categorySelect", { includeNewOption: true });

    // 🧼 Pulizia + gestione visibilità input nuova categoria
    setTimeout(() => {
        const select = document.getElementById("categorySelect");
        const input = document.getElementById("newCategoryInput");

        if (input) {
            input.value = "";
            input.style.display = "none";
        }

        if (select && input) {
            // Rimuove eventuale listener precedente per evitare duplicazione
            select.removeEventListener("change", window._categoryChangeHandler);
            window._categoryChangeHandler = () => {
                input.style.display = select.value === "__new__" ? "block" : "none";
            };
            select.addEventListener("change", window._categoryChangeHandler);
        }
    }, 250);

    // 🆔 Collega ID nota al bottone Salva ed Elimina
    document.getElementById("saveNoteEditorButton").setAttribute("data-id", noteId || "new");
    document.getElementById("deleteNoteEditorButton").setAttribute("data-id", noteId || "new");

    // ✍️ Inizializza Quill se non già fatto
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
        // 🔄 Sincronizza nota esistente
        onSnapshot(doc(db, "notes", noteId), (docSnap) => {
            if (docSnap.exists()) {
                const noteData = docSnap.data();

                titleInput.value = noteData.title || "";
                window.quill.root.innerHTML = noteData.content || "<p></p>";

                const select = document.getElementById("categorySelect");
                const input = document.getElementById("newCategoryInput");

                if (select && input) {
                    setTimeout(() => {
                        select.value = noteData.category || "";
                        input.style.display = select.value === "__new__" ? "block" : "none";
                    }, 300); // Attendi popolamento
                }
            }
        });
    } else {
        // ✨ Nuova nota: reset campi
        titleInput.value = "";
        window.quill.setContents([]);
    }
}

// 🔄 Popola il filtro categorie nella home
async function populateCategorySelect(targetId, { includeNewOption = false, includeAllOption = false } = {}) {
    const select = document.getElementById(targetId);
    if (!select) {
        console.warn(`[populateCategorySelect] select non trovato per id: ${targetId}`);
        return;
    }
    select.innerHTML = "";
    // ➕ Placeholder per il modale nuova nota
    if (targetId === "categorySelect") {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Select a category";
        opt.disabled = true;
        opt.selected = true;
        select.appendChild(opt);
    }
    // ➕ All (solo per i filtri, es. noteCategoryFilter)
    if (includeAllOption) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "– All –";
        select.appendChild(opt);
    }
    try {
        // Filtra le categorie per groupId
        const groupId = window._groupId;
        if (!groupId) throw new Error("groupId non disponibile");
        const q = query(collection(db, "categories"), where("groupId", "==", groupId));
        const snap = await getDocs(q);
        let found = false;
        snap.forEach((doc) => {
            const name = doc.data().name;
            if (name) {
                found = true;
                const opt = document.createElement("option");
                opt.value = name;
                opt.textContent = name;
                select.appendChild(opt);
            }
        });
        if (!found) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "(Nessuna categoria)";
            select.appendChild(opt);
        }
        if (includeNewOption) {
            const opt = document.createElement("option");
            opt.value = "__new__";
            opt.textContent = "➕ Create new category";
            select.appendChild(opt);
        }
        console.log(`[populateCategorySelect] Categorie trovate: ${select.options.length}`);
    } catch (err) {
        console.error("❌ Errore caricamento categorie:", err);
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Errore caricamento categorie";
        select.appendChild(opt);
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
document.getElementById("saveNoteEditorButton").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("⚠ You must be logged in!");

    const noteId = document.getElementById("saveNoteEditorButton").getAttribute("data-id");
    const title = document.getElementById("noteEditorTitle").value.trim();
    const content = window.quill.root.innerHTML.trim();
    // 📂 Gestisce la categoria selezionata o nuova
    let category = document.getElementById("categorySelect")?.value || "";

    // 🔧 Se si sta creando una nuova categoria, la salviamo in "categories"
    const rawCategory = document.getElementById("categorySelect")?.value || "";
    category = rawCategory;

    if (rawCategory === "__new__") {
        const customValue = document.getElementById("newCategoryInput").value.trim();
        if (customValue) {
            category = customValue;
            try {
                console.log("📌 Nuova categoria da salvare:", category);
                const groupId = window._groupId;
                if (!groupId) throw new Error("groupId non disponibile");
                await addDoc(collection(db, "categories"), { name: category, groupId });
            } catch (err) {
                console.error("❌ Errore nel salvataggio della nuova categoria:", err);
            }
        }
    }

    if (!title || window.quill.getLength() <= 1) {
        alert("❌ Error: The title and body of the note must be filled in!");
        return;
    }
    if (!category || category === "") {
        alert("❌ Please select a category before saving.");
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
        
        // Se ancora non c'è photoURL, usa l'avatar di default
        if (!photoURL) photoURL = "icone/default-avatar.png";
    } catch (err) {
        console.warn("⚠ Impossibile recuperare dati da Firestore:", err);
        // Fallback all'avatar di default in caso di errore
        if (!photoURL) photoURL = "icone/default-avatar.png";
    }

    if (noteId === "new") {
        await addDoc(collection(db, "notes"), {
            title,
            content,
            pinned: false,
            timestamp: new Date(),
            category,
            groupId: window._groupId, // <--- AGGIUNTO groupId obbligatorio
            createdBy: {
                uid: user.uid,
                displayName,
                photoURL
            }
        });

        // 🔔 Invia notifica di creazione nota
        notifyNoteCreated(title);
    } else {
        await updateDoc(doc(db, "notes", noteId), {
            title,
            content,
            timestamp: new Date(),
            category
        });
    }

    // ✅ Aggiorna il filtro categorie nella home se presente
    const filter = document.getElementById("noteCategoryFilter");
    if (filter) await populateCategorySelect("noteCategoryFilter", { includeAllOption: true });

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
            const sidebarContainer = document.getElementById("sidebar-container");
            if (sidebarContainer) {
                sidebarContainer.innerHTML = data;
                if (typeof aggiornaEmail === "function") aggiornaEmail(); // 🔥 Aggiorna email utente se la funzione esiste
                window._sidebarLoaded = true;
                // Rimuovi loading solo dopo che sidebar e utente sono pronti
                if (window._groupId) window.removeLoading();
            } else {
                console.warn("⚠ sidebar-container non trovato!");
            }
        })
        .catch((error) => console.error("Errore nel caricamento della sidebar:", error));
});



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

// 👀 Mostra l'input testuale solo se si seleziona "nuova categoria"
document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("categorySelect");
    const input = document.getElementById("newCategoryInput");

    if (select && input) {
        select.addEventListener("change", () => {
            input.style.display = select.value === "__new__" ? "block" : "none";
        });
    }
});

// 🛠️ Apre il modale Gestione Categorie
// 📦 Funzione riutilizzabile per creare una riga categoria
// 📦 Funzione riutilizzabile: crea una riga <li> categoria
function renderCategoryRow(name, id) {
    const li = document.createElement("li");
    li.innerHTML = `
    <button data-id="${id}" class="delete-category-btn">🗑️</button>
    <span class="category-name" data-id="${id}" data-name="${name}">${name}</span>
    <button data-id="${id}" class="rename-category-btn">✏️</button>
  `;
    return li;
}

// 🛠️ Apre il modale categorie
document.getElementById("manageCategoriesBtn")?.addEventListener("click", async () => {
    const modal = document.getElementById("categoryManagerModal");
    const list = document.getElementById("categoryListPanel");
    const input = document.getElementById("newCategoryInputModal");
    if (!modal || !list || !input) return;
    list.innerHTML = "";
    input.value = "";
    try {
        const groupId = window._groupId;
        if (!groupId) throw new Error("groupId non disponibile");
        const q = query(collection(db, "categories"), where("groupId", "==", groupId));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
            const name = docSnap.data().name;
            const id = docSnap.id;
            const li = renderCategoryRow(name, id);
            list.appendChild(li);
        });
        modal.style.display = "flex";
    } catch (err) {
        console.error("❌ Errore caricamento categorie:", err);
        alert("Error loading categories.");
    }
});

// ❌ Chiude il modale
document.getElementById("closeCategoryManager")?.addEventListener("click", () => {
    document.getElementById("categoryManagerModal").style.display = "none";
});

// 🔒 Chiudi cliccando fuori dal contenuto
document.addEventListener("click", (event) => {
    const modal = document.getElementById("categoryManagerModal");
    const content = document.querySelector("#categoryManagerModal .modal-content");
    if (
        modal.style.display === "flex" &&
        !content.contains(event.target) &&
        !event.target.closest("#manageCategoriesBtn")
    ) {
        modal.style.display = "none";
    }
});

// 🗑️ Elimina categoria
// Tutti gli alert e conferme sono ora in inglese
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-category-btn")) {
        e.stopPropagation();
        const btn = e.target;
        const id = btn.getAttribute("data-id");
        const li = btn.closest("li");
        if (btn.disabled) return;
        console.log("[DEBUG] Click on delete category, id:", id);
        try {
            const catRef = doc(db, "categories", id);
            const catSnap = await getDoc(catRef);
            if (!catSnap.exists()) {
                alert("❌ Category not found in Firestore. Cannot delete.");
                return;
            }
        } catch (err) {
            alert("❌ Firestore connection error. Please try again.");
            return;
        }
        if (
            confirm(
                "🗑 Do you really want to delete this category?\nIf there are notes in this category, they will NOT be deleted."
            )
        ) {
            try {
                btn.disabled = true;
                await deleteDoc(doc(db, "categories", id));
                // Force refresh category list after deletion
                await populateCategorySelect("noteCategoryFilter", { includeAllOption: true });
                await populateCategorySelect("categorySelect", { includeNewOption: true });
                // Reload the category modal
                const list = document.getElementById("categoryListPanel");
                if (list) {
                    list.innerHTML = "";
                    const groupId = window._groupId;
                    const q = query(collection(db, "categories"), where("groupId", "==", groupId));
                    const snap = await getDocs(q);
                    snap.forEach((docSnap) => {
                        const name = docSnap.data().name;
                        const id = docSnap.id;
                        const li = renderCategoryRow(name, id);
                        list.appendChild(li);
                    });
                }
                alert("✅ Category deleted!");
            } catch (err) {
                console.error("❌ Error deleting category:", err);
                alert("Error while deleting: " + (err && err.message ? err.message : JSON.stringify(err)));
            } finally {
                btn.disabled = false;
            }
        }
    }
});

// ✏️ Rename: apre input o salva modifica
document.addEventListener("click", async (e) => {
    const target = e.target;

    // ✏️ Modalità modifica
    if (target.classList.contains("rename-category-btn") && target.textContent === "✏️") {
        const li = target.closest("li");
        const span = li.querySelector(".category-name");
        const oldName = span.textContent;
        const id = span.getAttribute("data-id");

        const input = document.createElement("input");
        input.type = "text";
        input.value = oldName;
        input.classList.add("rename-input");
        input.setAttribute("data-old-name", oldName);
        input.style.flex = "1";

        span.replaceWith(input);
        target.textContent = "💾";
    }

    // 💾 Salvataggio
    else if (target.classList.contains("rename-category-btn") && target.textContent === "💾") {
        const li = target.closest("li");
        const input = li.querySelector(".rename-input");
        const oldName = input.getAttribute("data-old-name");
        const newName = input.value.trim();
        const id = target.getAttribute("data-id");
        if (!newName || newName === oldName) {
            const restored = renderCategoryRow(oldName, id);
            li.replaceWith(restored);
            return;
        }
        try {
            await updateDoc(doc(db, "categories", id), { name: newName });
            // Update all notes in this group with the old category
            const groupId = window._groupId;
            const notesSnap = await getDocs(query(collection(db, "notes"), where("category", "==", oldName), where("groupId", "==", groupId)));
            const batch = writeBatch(db);
            notesSnap.forEach((docSnap) => {
                batch.update(doc(db, "notes", docSnap.id), { category: newName });
            });
            await batch.commit();
            await populateCategorySelect("noteCategoryFilter", { includeAllOption: true });
            await populateCategorySelect("categorySelect", { includeNewOption: true });
            const updatedLi = renderCategoryRow(newName, id);
            li.replaceWith(updatedLi);
            alert("✅ Category updated!");
        } catch (err) {
            console.error("❌ Error while renaming:", err);
            alert("Error while renaming.");
            const fallback = renderCategoryRow(oldName, id);
            li.replaceWith(fallback);
        }
    }
});

// ➕ Aggiunge nuova categoria
document.getElementById("addCategoryBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("newCategoryInputModal");
    const name = input.value.trim();
    if (!name) return alert("❌ Please enter a valid name for the category.");
    try {
        const groupId = window._groupId;
        if (!groupId) throw new Error("groupId non disponibile");
        const docRef = await addDoc(collection(db, "categories"), { name, groupId });
        // ✅ Aggiorna subito UI con nome
        const li = renderCategoryRow(name, docRef.id);
        document.getElementById("categoryListPanel").appendChild(li);
        // 🔄 Ricarica anche i menu a tendina
        await populateCategorySelect("noteCategoryFilter", { includeAllOption: true });
        await populateCategorySelect("categorySelect", { includeNewOption: true });
        input.value = "";
        alert("✅ Category added!");
    } catch (err) {
        console.error("❌ Error adding category:", err);
        alert("Error while saving.");
    }
});

// ➕ per problema loading lento
// window.addEventListener("load", () => {
//     document.body.classList.remove("loading");
// });

// Rimuovi la classe loading solo quando tutto è pronto
window.removeLoading = function() {
  document.body.classList.remove("loading");
};

window.addEventListener("DOMContentLoaded", () => {
  // Rimuovi loading solo dopo che il DOM è pronto e dopo un piccolo delay per sicurezza
  setTimeout(() => {
    window.removeLoading();
  }, 200);
});

// Utility per debug DOM categorie
function checkCategoryDomElements() {
    const btn = document.getElementById("manageCategoriesBtn");
    const modal = document.getElementById("categoryManagerModal");
    const list = document.getElementById("categoryListPanel");
    const input = document.getElementById("newCategoryInputModal");
    if (!btn) console.warn("[DEBUG] manageCategoriesBtn button not found!");
    if (!modal) console.warn("[DEBUG] categoryManagerModal modal not found!");
    if (!list) console.warn("[DEBUG] categoryListPanel list not found!");
    if (!input) console.warn("[DEBUG] newCategoryInputModal input not found!");
    return btn && modal && list && input;
}

// 🔄 Listener per sincronizzazione avatar tra tab/finestre
window.addEventListener('storage', (e) => {
  if (e.key === 'userAvatarUpdated' && e.newValue) {
    try {
      const data = JSON.parse(e.newValue);
      console.log("[NOTES-HOME] 🔄 Ricevuto aggiornamento avatar:", data.url);
      
      // Aggiorna avatar nella sidebar se presente
      const avatarEl = document.getElementById("userAvatar");
      if (avatarEl) {
        avatarEl.src = data.url;
        console.log("[NOTES-HOME] ✅ Avatar sidebar aggiornato");
      }
      
      // 🔥 Forza un refresh delle note per mostrare il nuovo avatar
      // Solo se siamo nella pagina delle note e abbiamo un gruppo attivo
      if (window._groupId && typeof loadNotes === 'function') {
        console.log("[NOTES-HOME] 🔄 Refresh delle note per aggiornamento avatar...");
        loadNotes(window._groupId);
      }
      
    } catch (err) {
      console.warn("[NOTES-HOME] ⚠️ Errore parsing avatar update:", err);
    }
  }
});
