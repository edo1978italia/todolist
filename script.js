import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
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

// Configura Firebase (nascondi le credenziali in un file separato se necessario!)

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// Variabile per il listener Firestore
let unsubscribeTasks = null;

// Gestione login/logout
onAuthStateChanged(auth, (user) => {
    const authContainer = document.getElementById("authContainer");
    const mainContainer = document.getElementById("mainContainer");

    if (user) {
        authContainer.style.display = "none";
        mainContainer.style.display = "block";
        unsubscribeTasks = onSnapshot(collection(db, "tasks"), (snapshot) => {
            loadTasks(snapshot);
        });
    } else {
        authContainer.style.display = "block";
        mainContainer.style.display = "none";
        if (unsubscribeTasks) unsubscribeTasks();
    }
});

async function loginUser() {
    try {
        const email = document.getElementById("emailInput").value.trim();
        const password = document.getElementById("passwordInput").value.trim();

        if (!email || !password) {
            alert("Inserisci email e password!");
            return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login riuscito:", userCredential.user);
        document.getElementById("userInfo").innerText = `Benvenuto, ${userCredential.user.email}`;
    } catch (error) {
        console.error("Errore di login:", error);
        alert("Errore di login: " + error.message);
    }
}
window.loginUser = loginUser;

async function logoutUser() {
    try {
        if (unsubscribeTasks) unsubscribeTasks();
        await signOut(auth);
        console.log("Logout effettuato con successo");
    } catch (error) {
        console.error("Errore nel logout:", error);
        alert("Errore nel logout: " + error.message);
    }
}
window.logoutUser = logoutUser;

// Gestione delle attività
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
    document.getElementById("taskList").innerHTML = tasksHtml;

    // 🔥 Assicura che i nuovi pulsanti ricevano correttamente gli event listener
    document.querySelectorAll(".task-link").forEach((button) => {
        button.addEventListener("click", function () {
            window.open(button.dataset.link, "_blank");
        });
    });

    document.querySelectorAll(".toggle-complete").forEach((button) => {
        button.addEventListener("click", function () {
            toggleComplete(button.dataset.taskId);
        });
    });

    document.querySelectorAll(".edit-task").forEach((button) => {
        button.addEventListener("click", function () {
            openEditModal(button.dataset.taskId);
        });
    });

    document.querySelectorAll(".delete-task").forEach((button) => {
        button.addEventListener("click", function () {
            deleteTask(button.dataset.taskId);
        });
    });
}

function toggleMenu(button) {
    const menu = button.nextElementSibling;

    if (!menu || !menu.classList.contains("menu")) {
        console.error("Menu non trovato per il pulsante:", button);
        return;
    }

    // Chiude tutti gli altri menu prima di aprire quello cliccato
    document.querySelectorAll(".menu").forEach((m) => {
        if (m !== menu) {
            m.classList.remove("active");
            m.style.display = "none";
        }
    });

    // Attiva/disattiva il menu cliccato
    menu.classList.toggle("active");
    menu.style.display = menu.classList.contains("active") ? "block" : "none";
}
window.toggleMenu = toggleMenu;

window.openEditModal = async function (taskId) {
    const taskRef = doc(db, "tasks", taskId);
    const taskSnapshot = await getDoc(taskRef);

    if (taskSnapshot.exists()) {
        const taskData = taskSnapshot.data();
        document.getElementById("editNameInput").value = taskData.name || "";
        document.getElementById("editLinkInput").value = taskData.link || "";
        document.getElementById("editModal").dataset.taskId = taskId;
        document.getElementById("editModal").style.display = "block";
    } else {
        alert("Errore: task non trovato!");
    }
};

window.saveTaskChanges = async function () {
    const taskId = document.getElementById("editModal").dataset.taskId;
    const newName = document.getElementById("editNameInput").value.trim();
    const newLink = document.getElementById("editLinkInput").value.trim();

    if (!taskId || !newName) {
        return; // 🔥 Evita alert o messaggi invasivi
    }

    try {
        const taskRef = doc(db, "tasks", taskId);
        await updateDoc(taskRef, { name: newName, link: newLink });

        closeEditModal(); // 🔥 Chiude il modal dopo il salvataggio
    } catch (error) {
        console.error("Errore nel salvataggio del task:", error);
    }
};

window.closeEditModal = function () {
    document.getElementById("editModal").style.display = "none";
};

document.addEventListener("click", function (event) {
    if (event.target.classList.contains("menu-button")) {
        toggleMenu(event.target);
    } else {
        document.querySelectorAll(".menu").forEach((menu) => {
            menu.style.display = "none";
        });
    }
});

window.addTask = async function () {
    const taskInput = document.getElementById("taskInput");
    const linkInput = document.getElementById("linkInput");
    const taskName = taskInput.value.trim();
    const taskLink = linkInput.value.trim();

    if (!taskName) return alert("Inserisci un task valido!");

    await addDoc(collection(db, "tasks"), { name: taskName, link: taskLink || "" });

    taskInput.value = ""; // 🔥 Resetta il campo nome
    linkInput.value = ""; // 🔥 Resetta anche il campo link
};


window.deleteTask = async function (id) {
    const confirmation = confirm("Sei sicuro di voler eliminare questo task?");
    if (confirmation) {
        await deleteDoc(doc(db, "tasks", id));
    }
};

window.toggleComplete = async function (id) {
    const taskRef = doc(db, "tasks", id);
    const taskSnapshot = await getDoc(taskRef);

    if (taskSnapshot.exists()) {
        const taskData = taskSnapshot.data();
        await updateDoc(taskRef, { completed: !taskData.completed }); // Alterna tra true e false
    }
};
