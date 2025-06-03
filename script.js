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
const firebaseConfig = {
    apiKey: "AIzaSyCLg-Z9YOrjsqe3PTN0Nr2C1jZotVKfI38",
    authDomain: "todolistedo.firebaseapp.com",
    projectId: "todolistedo",
    storageBucket: "todolistedo.appspot.com",
    messagingSenderId: "700684050233",
    appId: "1:700684050233:web:755d10254e8c2cf222d2e8",
    measurementId: "G-HR8GGBGQTJ"
};

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
        const email = document.getElementById("emailInput").value;
        const password = document.getElementById("passwordInput").value;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login riuscito:", userCredential.user);
    } catch (error) {
        alert("Errore di login: " + error.message);
        console.error("Login error:", error);
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
                        ${task.link ? `<button onclick="window.open('${task.link}', '_blank')">🔗 Link</button>` : ""}
                        <button class="toggle-complete" data-task-id="${docSnapshot.id}">✔ Check</button>
                        <button class="edit-task" data-task-id="${docSnapshot.id}">🖉 Edit</button>
                        <button class="delete-task" data-task-id="${docSnapshot.id}">🗑 Delete</button>
                    </div>
                </div>
            </li>`;
    });
    document.getElementById("taskList").innerHTML = tasksHtml;

    // 🔥 Aggiungiamo i listener dopo la generazione del DOM!
    document.querySelectorAll(".menu-button").forEach((button) => {
        button.addEventListener("click", function () {
            toggleMenu(button);
        });
    });
}

function toggleMenu(button) {
    const menu = button.nextElementSibling;

    // Chiude tutti gli altri menu prima di aprire quello cliccato
    document.querySelectorAll(".menu").forEach((m) => {
        if (m !== menu) {
            m.classList.remove("active");
            m.style.display = "none";
        }
    });

    // Attiva/disattiva il menu cliccato
    if (menu.style.display === "block") {
        menu.style.display = "none";
        menu.classList.remove("active");
    } else {
        menu.style.display = "block";
        menu.classList.add("active");
    }
}
window.toggleMenu = toggleMenu;

document.addEventListener("click", function (event) {
    if (event.target.matches(".menu-button")) {
        toggleMenu(event.target);
    } else {
        document.querySelectorAll(".menu").forEach((menu) => {
            menu.style.display = "none";
        });
    }
});

window.addTask = async function () {
    const taskInput = document.getElementById("taskInput").value.trim();
    const linkInput = document.getElementById("linkInput").value.trim();
    if (!taskInput) return alert("Inserisci un task valido!");
    await addDoc(collection(db, "tasks"), { name: taskInput, link: linkInput || "" });
};

window.deleteTask = async function (id) {
    await deleteDoc(doc(db, "tasks", id));
};

window.toggleComplete = async function (id) {
    await updateDoc(doc(db, "tasks", id), { completed: true });
};
