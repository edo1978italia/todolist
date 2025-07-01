// Importa Firebase
import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    getDoc,
    query, // ✅ AGGIUNGI QUESTO
    where, // ✅ E QUESTO
    serverTimestamp,
    getDocs,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variabile per il listener Firestore
let unsubscribeTasks = null;
let unsubscribeLists = null;
let selectedListId = null;
let selectedListDocRef = null;
let selectedListName = null;
let currentGroupId = null; // <-- aggiunto

// UI references
const listSelectorContainer = document.getElementById("listSelectorContainer");
const userListsUl = document.getElementById("userLists");
const addListButton = document.getElementById("addListButton");
const mainContainer = document.getElementById("mainContainer");
const backToListsButton = document.getElementById("backToListsButton");

// 🔥 Debug Firebase
console.log("Firebase inizializzato correttamente?", app ? "✅ Sì" : "❌ No");


// 🔥 Gestione login e caricamento liste, con supporto selezione automatica da hash
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (unsubscribeTasks) unsubscribeTasks();
        window.location.replace("index.html");
        return;
    }
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            window.location.href = "group-setup.html";
            return;
        }
        const data = userSnap.data();
        if (!data || !data.groupId || data.groupId.trim() === "") {
            window.location.href = "group-setup.html";
            return;
        }
        currentGroupId = data.groupId;
        window.currentGroupId = data.groupId;
        // Mostra solo il selettore liste, nascondi il mainContainer
        if (listSelectorContainer) listSelectorContainer.style.display = "block";
        if (mainContainer) mainContainer.style.display = "none";
        // Svuota la lista visiva
        if (userListsUl) userListsUl.innerHTML = '<li style="color:#888;">(Nessuna lista trovata o caricamento...)</li>';

        // Se c'è un hash nell'URL, prova a selezionare direttamente la lista
        const hash = window.location.hash;
        let autoSelectListId = null;
        if (hash && hash.length > 1) {
            autoSelectListId = hash.substring(1);
        }

        listenUserLists(currentGroupId);

        // Dopo che le liste sono caricate, seleziona la lista se hash presente
        if (autoSelectListId) {
            // Attendi che le liste siano caricate (snapshot async), poi seleziona
            const trySelect = () => {
                const el = document.querySelector(`.user-list-item .list-title-text`);
                // Se non ci sono ancora elementi, riprova tra poco
                if (!userListsUl || userListsUl.children.length === 0) {
                    setTimeout(trySelect, 100);
                    return;
                }
                // Cerca la lista con l'id giusto
                const li = Array.from(userListsUl.children).find(li => {
                    // Trova il nameSpan e confronta l'id
                    const nameSpan = li.querySelector('.list-title-text');
                    // L'id della lista è nel closure di createListBox, quindi serve un workaround:
                    // Aggiungiamo data-list-id su nameSpan
                    return nameSpan && nameSpan.dataset && nameSpan.dataset.listId === autoSelectListId;
                });
                if (li) {
                    // Simula il click sull'intero box
                    li.click();
                } else {
                    // Se non trovata, riprova tra poco (magari snapshot non ancora arrivato)
                    setTimeout(trySelect, 100);
                }
            };
            trySelect();
        }
    } catch (error) {
        window.location.href = "index.html";
    }
});

 // 🔓 Logout sicuro
    async function logoutUser() {
        try {
            await auth.signOut();
            console.log("✅ Logout completato");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 500);
        } catch (error) {
            console.error("Errore logout:", error);
            alert("Errore nel logout: " + error.message);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        const logoutButton = document.getElementById("logoutButton");
        if (logoutButton) {
            logoutButton.addEventListener("click", logoutUser);
        }
    });

    window.logoutUser = logoutUser;

// 🔥 Caricamento delle attività
async function loadTasks(snapshot) {
    let tasksHtml = "";
    snapshot.docs.reverse().forEach((docSnapshot) => {
        let task = docSnapshot.data();
        tasksHtml += `
            <li class="task-item ${task.link ? "has-link" : ""}">
                <span class="task-text ${task.completed ? "completed" : ""}" data-task-id="${docSnapshot.id}">${task.name}</span>
                <div class="menu-container">
                    <button class="menu-button">⋮</button>
                    <div class="menu" style="display: none;">
                        ${task.link ? `<button class="task-link" data-link="${task.link}">🔗 Link</button>` : ""}
                        <button class="toggle-complete" data-task-id="${docSnapshot.id}">✔ Check</button>
                        <button class="edit-task" data-task-id="${docSnapshot.id}">🖉 Edit</button>
                        <button class="delete-task" data-task-id="${docSnapshot.id}">🗑 Delete</button>
                    </div>
                </div>
            </li>`;
    });

    document.getElementById("taskList").innerHTML = tasksHtml;

    // 🔥 Aggiungi eventi ai pulsanti del menu
    document.querySelectorAll(".menu-button").forEach((button) => {
        button.addEventListener("click", function (event) {
            console.log("Pulsante menu cliccato:", this);
            event.stopPropagation(); // 🔥 Evita la chiusura immediata

            // 🔥 Mostra/Nasconde il menu
            const menu = this.nextElementSibling;
            document.querySelectorAll(".menu").forEach((m) => (m.style.display = "none")); // 🔥 Chiude tutti gli altri menu aperti
            menu.style.display = menu.style.display === "block" ? "none" : "block";
        });
    });

    document.addEventListener("click", function (event) {
        // 🔥 Chiude tutti i menu se si clicca fuori
        if (!event.target.closest(".menu-container")) {
            document.querySelectorAll(".menu").forEach((menu) => {
                menu.style.display = "none";
            });
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        const logoutButton = document.getElementById("logoutButton");

        if (logoutButton) {
            logoutButton.addEventListener("click", logoutUser);
            console.log("✅ Pulsante logout registrato correttamente!");
        } else {
            console.warn("⚠ Pulsante logout non trovato!");
        }
    });

    // 🔥 Aggiungi eventi ai pulsanti dentro il menu
    document.querySelectorAll(".task-link").forEach((button) => {
        button.addEventListener("click", function () {
            const link = this.dataset.link;
            console.log("Apertura link:", link);
            window.open(link, "_blank"); // 🔥 Apri il link in una nuova scheda
        });
    });

    document.querySelectorAll(".toggle-complete").forEach((button) => {
        button.addEventListener("click", async function () {
            const id = this.dataset.taskId;
            console.log("Toggle completamento task:", id);
            await toggleComplete(id);
        });
    });

    document.querySelectorAll(".edit-task").forEach((button) => {
        button.addEventListener("click", function () {
            const id = this.dataset.taskId;
            console.log("Modifica task:", id);
            openEditModal(id);
        });
    });

    document.querySelectorAll(".delete-task").forEach((button) => {
        button.addEventListener("click", async function () {
            const id = this.dataset.taskId;
            console.log("Eliminazione task:", id);
            await deleteTask(id);
        });
    });

    document.querySelectorAll(".task-link, .toggle-complete, .edit-task, .delete-task").forEach((button) => {
        button.addEventListener("click", function () {
            console.log("Bottone nel menu cliccato:", this);

            // 🔥 Chiude il menu
            document.querySelectorAll(".menu").forEach((menu) => {
                menu.style.display = "none";
            });
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".menu-button").forEach((button) => {
        button.addEventListener("click", function () {
            console.log("Pulsante menu cliccato:", this);
            const menu = this.nextElementSibling; // 🔥 Seleziona il menu accanto al pulsante

            // 🔥 Alterna la visibilità del menu
            menu.style.display = menu.style.display === "block" ? "none" : "block";
        });
    });
});

// 🔥 Aggiunta, modifica ed eliminazione task
window.addTask = async function () {
  const taskInput = document.getElementById("taskInput");
  const linkInput = document.getElementById("linkInput");
  const isPriorityHigh = document.getElementById("priorityHigh").checked;
  const taskName = taskInput.value.trim();
  const taskLink = linkInput.value.trim();

  console.group("📝 Aggiunta nuovo task");
  console.log("📥 Input ricevuto:", { taskName, taskLink, isPriorityHigh });

  if (!taskName) {
    alert("Inserisci un task valido!");
    console.warn("⚠️ Nome del task vuoto. Operazione annullata.");
    console.groupEnd();
    return;
  }

  if (!auth.currentUser) {
    alert("Utente non autenticato.");
    console.error("🚫 Nessun utente autenticato trovato.");
    console.groupEnd();
    return;
  }

  if (!window.currentGroupId) {
    alert("⏳ Attendere il caricamento del gruppo prima di aggiungere un task.");
    console.warn("⚠️ groupId non disponibile al momento del click.");
    console.groupEnd();
    return;
  }

  if (!selectedListId) {
    alert("Seleziona una lista prima di aggiungere un task.");
    return;
  }

  const taskDisplayName = isPriorityHigh ? `${taskName} 🔴` : taskName;

  const nuovoTask = {
    name: taskDisplayName,
    link: taskLink || "",
    completed: false,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser.uid,
    groupId: window.currentGroupId,
    listId: selectedListId
  };

  console.log("📤 Dati in scrittura:", nuovoTask);

  try {
    const docRef = await addDoc(collection(db, "tasks"), nuovoTask);
    console.log("✅ Task salvato con ID:", docRef.id);

    // Aggiorna il campo updatedAt della lista
    if (selectedListId) {
      await updateDoc(doc(db, "lists", selectedListId), { updatedAt: serverTimestamp() });
    }

    taskInput.value = "";
    linkInput.value = "";
    document.getElementById("priorityHigh").checked = false;
    console.groupEnd();

  } catch (err) {
    console.error("❌ Errore durante il salvataggio:", err);
    alert("Errore nel salvataggio. Controlla la console.");
    console.groupEnd();
  }
};



// 🔥 Salva modifica Edit di un Task
window.saveTaskChanges = async function () {
    const editModal = document.getElementById("editModal");
    const taskId = editModal.dataset.taskId;
    const newName = document.getElementById("editNameInput").value.trim();
    const newLink = document.getElementById("editLinkInput").value.trim();

    if (!newName) return alert("Il nome del task non può essere vuoto!");

    await updateDoc(doc(db, "tasks", taskId), { name: newName, link: newLink });

    editModal.style.display = "none"; // 🔥 Chiudi il modal dopo il salvataggio
};

// 🔥 CHiude il popup Edit di un Task
window.closeEditModal = function () {
    document.getElementById("editModal").style.display = "none";
};

// 🔥 Chiude il modal quando si clicca fuori
window.addEventListener("click", function (event) {
    const editModal = document.getElementById("editModal");
    if (event.target === editModal) {
        editModal.style.display = "none";
    }
});

// 🔥 Eliminazione di un task
window.deleteTask = async function (id) {
    if (confirm("Are you sure you want to delete this task?")) {
        await deleteDoc(doc(db, "tasks", id));
    }
};

// 🔥 Completamento di un task
window.toggleComplete = async function (id) {
    const taskRef = doc(db, "tasks", id);
    const taskSnapshot = await getDoc(taskRef);

    if (taskSnapshot.exists()) {
        const taskData = taskSnapshot.data();
        await updateDoc(taskRef, { completed: !taskData.completed });
    }
};

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

// 🔥 Modifica Elemento task
window.openEditModal = function (taskId) {
  console.log("🛠️ Tentativo di apertura Edit per task:", taskId);

  const editModal = document.getElementById("editModal");
  const editNameInput = document.getElementById("editNameInput");
  const editLinkInput = document.getElementById("editLinkInput");

  getDoc(doc(db, "tasks", taskId))
    .then((docSnapshot) => {
      if (docSnapshot.exists()) {
        const taskData = docSnapshot.data();
        editNameInput.value = taskData.name || "";
        editLinkInput.value = taskData.link || "";

        editModal.style.display = "block";
        editModal.dataset.taskId = taskId;

        console.log("✅ Modal Edit aperto correttamente");
      } else {
        alert("❌ Task non trovato nel database.");
        console.warn("⚠️ Nessun documento trovato per ID:", taskId);
      }
    })
    .catch((error) => {
      console.error("❌ Errore durante il recupero del task:", error);
      alert("Errore durante il caricamento del task.");
    });
};

// === GESTIONE LISTE MULTLE ===

// Carica e mostra tutte le liste dell'utente
function listenUserLists(groupId) {
    console.log('[LISTE] Avvio caricamento liste per groupId:', groupId);
    if (unsubscribeLists) unsubscribeLists();
    const q = query(collection(db, "lists"), where("groupId", "==", groupId));
    unsubscribeLists = onSnapshot(q, (snapshot) => {
        console.log('[LISTE] Snapshot ricevuto. Numero liste:', snapshot.size);
        userListsUl.innerHTML = "";
        if(snapshot.size === 0) {
            userListsUl.innerHTML = '<li style="color:#888;">(Nessuna lista trovata)</li>';
        }
        // Separa le liste in pinned e unpinned
        let pinned = [], unpinned = [];
        snapshot.forEach(docSnap => {
            const list = docSnap.data();
            if (list.pinned) {
                pinned.push(docSnap);
            } else {
                unpinned.push(docSnap);
            }
        });
        // Ordina le unpinned: la lista modificata più di recente (aggiunta task) va in cima
        unpinned.sort((a, b) => {
            // Se non c'è updatedAt, fallback su createdAt
            const aTime = (a.data().updatedAt && a.data().updatedAt.toMillis ? a.data().updatedAt.toMillis() : (a.data().createdAt && a.data().createdAt.toMillis ? a.data().createdAt.toMillis() : 0));
            const bTime = (b.data().updatedAt && b.data().updatedAt.toMillis ? b.data().updatedAt.toMillis() : (b.data().createdAt && b.data().createdAt.toMillis ? b.data().createdAt.toMillis() : 0));
            return bTime - aTime;
        });
        // Funzione per creare il box lista
        function createListBox(docSnap) {
            const list = docSnap.data();
            const li = document.createElement("li");
            li.className = "user-list-item";
            if (list.pinned) li.classList.add("pinned");
            // Contenuto principale (nome lista)
            const nameSpan = document.createElement("span");
            nameSpan.textContent = list.name;
            nameSpan.className = "list-title-text";
            nameSpan.dataset.listId = docSnap.id; // Serve per selezione automatica da hash
            // L'intero box è cliccabile, non serve più onclick qui

            // Rendi l'intero box cliccabile
            li.onclick = (e) => {
                // Evita che il click su pulsanti interni (menu, pin, elimina) attivi la selezione
                if (
                    e.target.closest('.menu-container') ||
                    e.target.classList.contains('menu-button') ||
                    e.target.classList.contains('pin-list') ||
                    e.target.classList.contains('delete-list')
                ) {
                    return;
                }
                selectList(docSnap.id, list.name);
            };

            // Badge numero task
            const countSpan = document.createElement("span");
            countSpan.className = "list-task-count";
            countSpan.textContent = '';
            // Query per contare i task di questa lista
            const q = query(collection(db, "tasks"), where("groupId", "==", groupId), where("listId", "==", docSnap.id));
            getDocs(q).then(snap => {
                countSpan.textContent = snap.size;
            });

            // Menu 3 puntini
            const menuContainer = document.createElement("div");
            menuContainer.className = "menu-container";
            const menuButton = document.createElement("button");
            menuButton.className = "menu-button";
            menuButton.innerText = "⋮";
            const menu = document.createElement("div");
            menu.className = "menu";
            menu.style.display = "none";
            // Opzione pin/unpin
            const pinBtn = document.createElement("button");
            pinBtn.className = "pin-list";
            pinBtn.innerText = list.pinned ? "📌 Unpin" : "📌 Pin";
            pinBtn.onclick = async (e) => {
                e.stopPropagation();
                await updateDoc(doc(db, "lists", docSnap.id), { pinned: !list.pinned });
                menu.style.display = "none";
            };
            menu.appendChild(pinBtn);
            // Opzione elimina
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-list";
            deleteBtn.innerText = "🗑 Delete";
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm("Do you really want to delete this list?")) {
                    // Elimina lista da Firestore
                    await deleteList(docSnap.id);
                }
                menu.style.display = "none";
            };
            menu.appendChild(deleteBtn);
            menuContainer.appendChild(menuButton);
            menuContainer.appendChild(menu);

            // Gestione apertura/chiusura menu
            menuButton.onclick = function(e) {
                e.stopPropagation();
                document.querySelectorAll('.menu').forEach(m => m.style.display = 'none');
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            };

            // Chiudi menu cliccando fuori
            document.addEventListener('click', function closeMenuList(e) {
                if (!e.target.closest('.menu-container')) {
                    menu.style.display = 'none';
                }
            });

            li.appendChild(countSpan);
            li.appendChild(nameSpan);
            li.appendChild(menuContainer);
            return li;
        }
        // Svuota la lista visiva
        userListsUl.innerHTML = "";
        // Prima i pinned
        pinned.forEach(docSnap => {
            userListsUl.appendChild(createListBox(docSnap));
        });
        // Poi gli altri
        unpinned.forEach(docSnap => {
            userListsUl.appendChild(createListBox(docSnap));
        });
// Funzione per eliminare una lista da Firestore (e opzionalmente i suoi task)
async function deleteList(listId) {
    try {
        // Elimina la lista da Firestore
        await deleteDoc(doc(db, "lists", listId));
        // (Opzionale) Elimina anche i task associati a questa lista
        // const q = query(collection(db, "tasks"), where("listId", "==", listId));
        // const snapshot = await getDocs(q);
        // for (const taskDoc of snapshot.docs) {
        //     await deleteDoc(taskDoc.ref);
        // }
        // L'elenco si aggiorna automaticamente grazie a onSnapshot
    } catch (err) {
        alert("Errore durante l'eliminazione della lista: " + err.message);
    }
}
    }, (err) => {
        userListsUl.innerHTML = '<li style="color:red;">Errore caricamento liste</li>';
    });
}

// Crea una nuova lista

// Funzione globale per creazione lista da modale
window.createNewListWithTitle = async function(titolo) {
    console.log('[LISTE] Click su aggiungi lista');
    const user = auth.currentUser;
    if (!user) {
        console.log('[LISTE] Nessun utente autenticato, impossibile creare lista');
        return;
    }
    if (!currentGroupId) {
        alert("Errore: groupId non disponibile. Ricarica la pagina.");
        return;
    }
    const newListRef = doc(collection(db, "lists"));
    await setDoc(newListRef, {
        name: titolo,
        createdBy: user.uid,
        groupId: currentGroupId,
        createdAt: serverTimestamp()
    });
    console.log('[LISTE] Nuova lista creata con id:', newListRef.id);
    // Apri subito la gestione task per la nuova lista
    selectList(newListRef.id, titolo);
};

// Modifica: seleziona una lista e mostra i task relativi
function selectList(listId, listName) {
    console.log('[LISTE] Selezionata lista:', listId, listName);
    selectedListId = listId;
    selectedListDocRef = doc(db, "lists", listId);
    listSelectorContainer.style.display = "none";
    mainContainer.style.display = "block";
    document.getElementById("header").innerHTML = `<h3>${listName}</h3>`;
    // Precompila il campo titolo lista
    document.getElementById("editListTitleInput").value = listName;
    selectedListName = listName;
    listenTasksForList(listId);
}


// (RIMOSSO) Salvataggio manuale del titolo lista: ora il salvataggio avviene su "torna alle liste"

// Torna all'elenco delle liste
backToListsButton.onclick = () => {
    console.log('[LISTE] Click su torna alle liste');
    const titolo = document.getElementById("editListTitleInput").value.trim();
    // Se il titolo è vuoto, controlla se la lista ha task
    if (!titolo) {
        // Controlla se la lista selezionata ha task
        const q = query(collection(db, "tasks"), where("groupId", "==", currentGroupId), where("listId", "==", selectedListId));
        getDocs(q).then(snapshot => {
            if (snapshot.size > 0) {
                alert("Please enter a valid list title!");
                return;
            } else {
                // Nessun task: consenti il ritorno senza titolo e cancella la lista vuota
                if (selectedListDocRef) {
                    deleteDoc(selectedListDocRef);
                }
                mainContainer.style.display = "none";
                listSelectorContainer.style.display = "block";
                if (unsubscribeTasks) unsubscribeTasks();
            }
        });
        return;
    }
    // Salva il titolo su Firestore prima di tornare
    if (selectedListDocRef) {
        updateDoc(selectedListDocRef, { name: titolo }).then(() => {
            document.getElementById("header").innerHTML = `<h3>${titolo}</h3>`;
            selectedListName = titolo;
            listenUserLists(currentGroupId);
            mainContainer.style.display = "none";
            listSelectorContainer.style.display = "block";
            if (unsubscribeTasks) unsubscribeTasks();
        });
    } else {
        mainContainer.style.display = "none";
        listSelectorContainer.style.display = "block";
        if (unsubscribeTasks) unsubscribeTasks();
    }
};

// Carica i task della lista selezionata
function listenTasksForList(listId) {
    console.log('[LISTE] Caricamento task per lista:', listId, 'groupId:', currentGroupId);
    if (unsubscribeTasks) unsubscribeTasks();
    if (!currentGroupId) {
        console.log('[LISTE] groupId non disponibile, impossibile caricare task');
        return;
    }
    const q = query(
        collection(db, "tasks"),
        where("groupId", "==", currentGroupId),
        where("listId", "==", listId)
    );
    unsubscribeTasks = onSnapshot(q, (snapshot) => {
        console.log('[LISTE] Snapshot task ricevuto per lista:', listId, 'Numero task:', snapshot.size);
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            console.log('[LISTE][DEBUG] Task trovato:', docSnap.id, data);
        });
        loadTasks(snapshot);
    }, (err) => {
        console.error('[LISTE] Errore caricamento task:', err);
    });
}

// All'avvio: mostra solo le liste, carica le liste del gruppo SOLO dopo aver ottenuto il groupId
onAuthStateChanged(auth, async (user) => {
    console.log('[LISTE] onAuthStateChanged triggerato. user:', user);
    if (!user) return;
    // Forza la visibilità corretta all'avvio
    if (listSelectorContainer) listSelectorContainer.style.display = "block";
    if (mainContainer) mainContainer.style.display = "none";
    // Svuota la lista visiva
    if (userListsUl) userListsUl.innerHTML = '<li style="color:#888;">(Nessuna lista trovata o caricamento...)</li>';
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            window.location.href = "group-setup.html";
            return;
        }
        const data = userSnap.data();
        if (!data || !data.groupId || data.groupId.trim() === "") {
            window.location.href = "group-setup.html";
            return;
        }
        currentGroupId = data.groupId;
        listenUserLists(currentGroupId);
    } catch (error) {
        window.location.href = "index.html";
    }
});

