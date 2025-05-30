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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Funzione per caricare le attività
async function loadTasks() {
    const querySnapshot = await getDocs(collection(db, "tasks"));
    let tasks = "";
    querySnapshot.forEach((doc) => {
        let task = doc.data();
        tasks += `<li>
            <span class="${task.completed ? "completed" : ""}">${task.name}</span>
            <div class="task-buttons">
                <button onclick="toggleComplete('${doc.id}', ${task.completed})">✔</button>
                <button onclick="editTask('${doc.id}', '${task.name}')">Modifica</button>
                <button onclick="deleteTask('${doc.id}')">Elimina</button>
            </div>
        </li>`;
    });
    document.getElementById("taskList").innerHTML = tasks;
}

// Funzione per aggiungere una nuova attività
async function addTask() {
    const taskInput = document.getElementById("taskInput").value.trim();
    if (taskInput === "") return alert("Il campo attività è vuoto!");

    await addDoc(collection(db, "tasks"), { name: taskInput, completed: false });
    loadTasks();
}

// Funzione per modificare un'attività
async function editTask(id, currentName) {
    const newName = prompt("Modifica il task:", currentName);
    if (newName) {
        await updateDoc(doc(db, "tasks", id), { name: newName });
        loadTasks();
    }
}

// Funzione per eliminare un'attività
async function deleteTask(id) {
    await deleteDoc(doc(db, "tasks", id));
    loadTasks();
}

// Funzione per completare / annullare completamento
async function toggleComplete(id, currentState) {
    await updateDoc(doc(db, "tasks", id), { completed: !currentState });
    loadTasks();
}

// Carica le attività all'avvio
window.onload = loadTasks;
