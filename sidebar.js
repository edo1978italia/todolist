document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser); // 🔥 Permette il logout su tutte le pagine
    }
});

window.toggleSidebar = function () {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.left = sidebar.style.left === "0px" ? "-300px" : "0px";
};

window.navigateTo = function (page) {
    console.log("Navigazione verso:", page); // 🔥 Debug
    window.location.href = page;
};

