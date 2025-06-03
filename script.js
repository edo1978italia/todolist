// Importa Firebase (necessario quando usi `type="module"`)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js";

// Configura Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCLg-Z9YOrjsqe3PTN0Nr2C1jZotVKfI38",
    authDomain: "todolistedo.firebaseapp.com",
    projectId: "todolistedo",
    storageBucket: "todolistedo.firebasestorage.app",
    messagingSenderId: "700684050233",
    appId: "1:700684050233:web:755d10254e8c2cf222d2e8",
    measurementId: "G-HR8GGBGQTJ"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔍 Controlla lo stato di autenticazione e aggiorna l'UI
onAuthStateChanged(auth, (user) => {
    updateUI(user);
    if (user) {
        console.log("✅ Utente loggato:", user.email);
    } else {
        console.log("⚠️ Nessun utente loggato.");
    }
});

// 🛠️ Funzione per aggiornare l'UI in base allo stato dell'utente
function updateUI(user) {
    const authContainer = document.getElementById("authContainer");
    const mainContainer = document.getElementById("mainContainer");
    const bottomMenu = document.getElementById("bottomMenu");

    if (user) {
        authContainer.style.display = "none";
        mainContainer.style.display = "block";
        bottomMenu.style.display = "flex";
        loadTasks(); // ✅ Carica le attività solo se l'utente è loggato
    } else {
        authContainer.style.display = "block";
        mainContainer.style.display = "none";
        bottomMenu.style.display = "none";
    }
}

// 🔐 Funzione di login
async function loginUser() {
    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        updateUI(userCredential.user);
        console.log("✅ Login riuscito:", userCredential.user);
    } catch (error) {
        alert("⚠️ Errore di login: " + error.message);
        console.error("Login error:", error);
    }
}

window.loginUser = loginUser; // ✅ Registrazione corretta della funzione

// 🚪 Funzione di logout
async function logoutUser() {
    try {
        await signOut(auth);
        updateUI(null); // ✅ Assicura che l'interfaccia venga aggiornata
        console.log("✅ Logout effettuato con successo");
    } catch (error) {
        console.error("⚠️ Errore durante il logout:", error);
        alert("Errore nel logout: " + error.message);
    }
}

window.logoutUser = logoutUser; // ✅ Registrazione della funzione

// 📝 Funzione per caricare le attività
async function loadTasks() {
    const querySnapshot = await getDocs(collection(db, "tasks"));
    let tasksHtml = "";
    querySnapshot.forEach((doc) => {
        let task = doc.data();
        tasksHtml += `
            <li class="task-item ${task.link ? "has-link" : ""}">
                <span class="task-text ${task.completed ? "completed" : ""}" data-task-id="${doc.id}">${task.name}</span>
                <div class="menu-container">
                    <button class="menu-button" onclick="toggleMenu(this)">⋮</button>
                    <div class="menu">
                        ${task.link ? `<button onclick="window.open('${task.link}', '_blank')">🔗 Link</button>` : ""}
                        <button onclick="toggleComplete('${doc.id}')">✔ Check</button>
                        <button onclick="editTask('${doc.id}')">🖉 Edit</button>
                        <button onclick="deleteTask('${doc.id}')">🗑 Delete</button>
                    </div>
                </div>
            </li>`;
    });
    document.getElementById("taskList").innerHTML = tasksHtml;
}

// ➕ Funzione per aggiungere un task
async function addTask() {
    const taskInput = document.getElementById("taskInput").value.trim();
    if (!taskInput) return alert("⚠️ Il campo attività è vuoto!");

    await addDoc(collection(db, "tasks"), { name: taskInput, completed: false });
    loadTasks();
}

// ✏️ Funzione per modificare un task
async function editTask(id) {
    let currentTaskId = id;
    const taskRef = doc(db, "tasks", id);
    const taskSnapshot = await getDoc(taskRef);

    if (taskSnapshot.exists()) {
        const taskData = taskSnapshot.data();
        document.getElementById("editNameInput").value = taskData.name;
        document.getElementById("editLinkInput").value = taskData.link || "";
        document.getElementById("editModal").style.display = "flex";
    }
}

// 💾 Funzione per salvare le modifiche di un task
async function saveTaskChanges() {
    const newName = document.getElementById("editNameInput").value;
    const newLink = document.getElementById("editLinkInput").value;

    if (currentTaskId && newName) {
        await updateDoc(doc(db, "tasks", currentTaskId), { name: newName, link: newLink });
    }
    closeEditModal();
}

// ✅ Funzione per completare un task
async function toggleComplete(id) {
    try {
        const taskElement = document.querySelector(`[data-task-id="${id}"]`);
        if (!taskElement) return console.error(`⚠️ Task ${id} non trovato nel DOM.`);

        taskElement.classList.toggle("completed");
        const isCompleted = taskElement.classList.contains("completed");
        await updateDoc(doc(db, "tasks", id), { completed: isCompleted });

        console.log(`✅ Task ${id} aggiornato, stato completato: ${isCompleted}`);
    } catch (error) {
        console.error("⚠️ Errore nell'aggiornamento del task:", error);
    }
}

// 🗑 Funzione per eliminare un task
async function deleteTask(id) {
    try {
        if (!confirm("⚠️ Sei sicuro di voler eliminare questo task?")) return;

        await deleteDoc(doc(db, "tasks", id));
        document.querySelector(`[data-task-id="${id}"]`)?.remove();

        console.log(`✅ Task ${id} eliminato con successo.`);
    } catch (error) {
        console.error("⚠️ Errore nell'eliminazione del task:", error);
    }
}

// 🌐 Funzione per la navigazione tra le pagine
function loadPage(page) {
    console.log(`Navigating to: ${page}`);

    if (page === "settings") {
        window.location.href = "https://www.google.com";
    } else {
        window.location.href = `${page}.html`;
    }
}

// 🔄 Avvia il caricamento delle attività
window.onload = loadTasks;
