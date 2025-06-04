document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            console.log("Logout dal pannello laterale cliccato!"); // 🔥 Debug
            logoutUser(); // 🔥 Chiama la funzione di logout
        });
    }
});


window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.left = sidebar.style.left === "0px" ? "-300px" : "0px";
};

document.querySelectorAll("nav button").forEach((button) => {
    button.addEventListener("click", function () {
        console.log("Pulsante cliccato:", button.innerText); // 🔥 Debug per verificare il click
    });
});



