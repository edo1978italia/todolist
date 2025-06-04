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
    getDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Configura Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variabile per il listener Firestore
let unsubscribeTasks = null;

// 🔥 Debug Firebase
console.log("Firebase inizializzato correttamente?", app ? "✅ Sì" : "❌ No");

// 🔥 Verifica sessione utente e aggiorna l'interfaccia
onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.warn("Utente non autenticato, reindirizzamento in corso...");
        setTimeout(() => {
            window.location.replace("index.html");
        }, 1000);
        if (unsubscribeTasks) unsubscribeTasks();
    } else {
        document.getElementById("userEmail").innerText = user.email;
        document.getElementById("mainContainer").style.display = "block";

        // 🔥 Debug Firebase per caricamento dati
        console.log("User autenticato:", user.email);

        // 🔥 Attiva listener Firebase per i task
        unsubscribeTasks = onSnapshot(collection(db, "tasks"), (snapshot) => {
            console.log("Dati ricevuti da Firebase:", snapshot.docs.map(doc => doc.data())); // 🔥 Debug
            loadTasks(snapshot);
        });
    }
});

// 🔥 Gestione logout
async function logoutUser() {
    try {
        if (unsubscribeTasks) unsubscribeTasks();
        await signOut(auth);
        window.location.replace("index.html");
    } catch (error) {
        console.error("Errore nel logout:", error);
    }
}
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
                    <div class="menu">
                        ${task.link ? `<button class="task-link" data-link="${task.link}">🔗 Link</button>` : ""}
                        <button class="toggle-complete" data-task-id="${docSnapshot.id}">✔ Check</button>
                        <button class="edit-task" data-task-id="${docSnapshot.id}">🖉 Edit</button>
                        <button class="delete-task" data-task-id="${docSnapshot.id}">🗑 Delete</button>
                    </div>
                </div>
            </li>`;
    });

    // 🔥 Debug per confermare il caricamento della lista
    console.log("Lista task aggiornata:", tasksHtml);

    document.getElementById("taskList").innerHTML = tasksHtml;
}

// 🔥 Aggiunta, modifica ed eliminazione task
window.addTask = async function () {
    const taskInput = document.getElementById("taskInput");
    const linkInput = document.getElementById("linkInput");
    const taskName = taskInput.value.trim();
    const taskLink = linkInput.value.trim();

    if (!taskName) return alert("Inserisci un task valido!");

    await addDoc(collection(db, "tasks"), { name: taskName, link: taskLink || "", completed: false });

    taskInput.value = "";
    linkInput.value = "";
};

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
