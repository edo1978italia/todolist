import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const auth = getAuth();

document.addEventListener("DOMContentLoaded", function () {
    const userEmailElement = document.getElementById("userEmail");

    // 🔥 Carica l'email dell'utente solo nella sidebar
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userEmailElement.innerText = user.email;
        } else {
            userEmailElement.innerText = "Non autenticato";
        }
    });

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            console.log("Logout dal pannello laterale cliccato!"); // 🔥 Debug
            logoutUser(); // 🔥 Chiama la funzione di logout
        });
    }
});

// 🔥 Funzione per aprire/chiudere la sidebar (codice originale mantenuto)
window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.left = sidebar.style.left === "0px" ? "-300px" : "0px";
};

// 🔥 Debug: Logga i pulsanti cliccati (codice originale mantenuto)
document.querySelectorAll("nav button").forEach((button) => {
    button.addEventListener("click", function () {
        console.log("Pulsante cliccato:", button.innerText);
    });
});
