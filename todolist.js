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

// UI references
const listSelectorContainer = document.getElementById("listSelectorContainer");
const userListsUl = document.getElementById("userLists");
const addListButton = document.getElementById("addListButton");
const mainContainer = document.getElementById("mainContainer");
const backToListsButton = document.getElementById("backToListsButton");

// 🔥 Debug Firebase
console.log("Firebase inizializzato correttamente?", app ? "✅ Sì" : "❌ No");

// 🔥 Verifica sessione utente e aggiorna l'interfaccia
onAuthStateChanged(auth, async (user) => {
    const userEmailElement = document.getElementById("userEmail");

    if (!user) {
        console.warn("⚠ Utente non autenticato, redirect in corso...");
        if (unsubscribeTasks) unsubscribeTasks();
        window.location.replace("index.html");
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.warn("❌ Documento utente assente — redirect");
            window.location.href = "group-setup.html";
            return;
        }

        const data = userSnap.data();

        if (!data || !data.groupId || data.groupId.trim() === "") {
            console.warn("🚧 groupId mancante o vuoto — redirect a group-setup");
            window.location.href = "group-setup.html";
            return;
        }

        const groupId = data.groupId;
        console.log("✅ Accesso autorizzato con groupId:", groupId);

        if (userEmailElement) userEmailElement.innerText = user.email;
        if (mainContainer) mainContainer.style.display = "block";

        // 🔥 Listener per task del gruppo
        const q = query(collection(db, "tasks"), where("groupId", "==", groupId));
        unsubscribeTasks = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                console.log("🟡 Nessun task trovato per questo gruppo.");
                document.getElementById("tasksList").innerHTML =
                    "<p class='empty'>Nessun task ancora. Aggiungine uno!</p>";
                return;
            }

            console.log(
                "📌 Tasks ricevuti:",
                snapshot.docs.map((doc) => doc.data())
            );
            loadTasks(snapshot);
        });

        window.currentGroupId = groupId;
    } catch (error) {
        console.error("❌ Errore durante la verifica del gruppo:", error);
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
    if (confirm("Sei sicuro di voler eliminare questo task?")) {
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

// === GESTIONE LISTE MULTIPLE ===

// Carica e mostra tutte le liste dell'utente
function listenUserLists(userId) {
    console.log('[LISTE] Avvio caricamento liste per userId:', userId);
    if (unsubscribeLists) unsubscribeLists();
    const q = query(collection(db, "lists"), where("createdBy", "==", userId));
    unsubscribeLists = onSnapshot(q, (snapshot) => {
        console.log('[LISTE] Snapshot ricevuto. Numero liste:', snapshot.size);
        userListsUl.innerHTML = "";
        snapshot.forEach(docSnap => {
            const list = docSnap.data();
            console.log('[LISTE] Lista trovata:', docSnap.id, list);
            const li = document.createElement("li");
            li.textContent = list.name;
            li.className = "user-list-item";
            li.onclick = () => selectList(docSnap.id, list.name);
            userListsUl.appendChild(li);
        });
        if(snapshot.size === 0) {
            console.log('[LISTE] Nessuna lista trovata per questo utente.');
        }
    });
}

// Crea una nuova lista
addListButton.onclick = async () => {
    console.log('[LISTE] Click su aggiungi lista');
    const name = prompt("Nome della nuova lista?");
    if (!name) {
        console.log('[LISTE] Creazione lista annullata: nome vuoto');
        return;
    }
    const user = auth.currentUser;
    if (!user) {
        console.log('[LISTE] Nessun utente autenticato, impossibile creare lista');
        return;
    }
    const newListRef = doc(collection(db, "lists"));
    await setDoc(newListRef, {
        name,
        createdBy: user.uid,
        createdAt: serverTimestamp()
    });
    console.log('[LISTE] Nuova lista creata con nome:', name, 'e id:', newListRef.id);
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

// Salva il nuovo titolo della lista su Firestore
const saveListTitleButton = document.getElementById("saveListTitleButton");
saveListTitleButton.onclick = async () => {
    const input = document.getElementById("editListTitleInput");
    const newName = input.value.trim();
    if (!selectedListDocRef || !newName) {
        console.log('[LISTE] Salvataggio nome lista annullato: dati mancanti');
        return;
    }
    await updateDoc(selectedListDocRef, { name: newName });
    // Aggiorna anche l'header
    document.getElementById("header").innerHTML = `<h3>${newName}</h3>`;
    selectedListName = newName;
    console.log('[LISTE] Nome lista aggiornato su Firestore:', newName);
};

// Torna all'elenco delle liste
backToListsButton.onclick = () => {
    console.log('[LISTE] Click su torna alle liste');
    mainContainer.style.display = "none";
    listSelectorContainer.style.display = "block";
    if (unsubscribeTasks) unsubscribeTasks();
};

// Carica i task della lista selezionata
function listenTasksForList(listId) {
    console.log('[LISTE] Caricamento task per lista:', listId);
    if (unsubscribeTasks) unsubscribeTasks();
    const user = auth.currentUser;
    if (!user) {
        console.log('[LISTE] Nessun utente autenticato, impossibile caricare task');
        return;
    }
    const q = query(collection(db, "tasks"), where("createdBy", "==", user.uid), where("listId", "==", listId));
    unsubscribeTasks = onSnapshot(q, (snapshot) => {
        console.log('[LISTE] Snapshot task ricevuto per lista:', listId, 'Numero task:', snapshot.size);
        loadTasks(snapshot);
    });
}

// All'avvio: mostra solo le liste, carica le liste dell'utente autenticato
onAuthStateChanged(auth, (user) => {
    console.log('[LISTE] onAuthStateChanged triggerato. user:', user);
    if (!user) return;
    listSelectorContainer.style.display = "block";
    mainContainer.style.display = "none";
    listenUserLists(user.uid);
});

