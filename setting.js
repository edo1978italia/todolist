import firebaseConfig from "./config.js";

console.log("[SETTING] Avvio setting.js...");

try {
    firebase.initializeApp(firebaseConfig);
    console.log("[SETTING] Firebase inizializzato");
} catch (e) {
    console.warn("[SETTING] Firebase già inizializzato o errore:", e);
}

const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
    console.log("[SETTING] DOMContentLoaded");
    const emailEl = document.getElementById("userEmail");
    const groupNameEl = document.getElementById("userGroupName");
    const leaveBtn = document.getElementById("leaveGroupBtn");
    const deleteBtn = document.getElementById("deleteAccountBtn");
    const msgEl = document.getElementById("settingsMsg");

    console.log("[SETTING] Elementi:", {
        emailEl: !!emailEl,
        groupNameEl: !!groupNameEl,
        leaveBtn: !!leaveBtn,
        deleteBtn: !!deleteBtn,
        msgEl: !!msgEl
    });

    auth.onAuthStateChanged(async (user) => {
        console.log("[SETTING] onAuthStateChanged triggerato", user);
        if (!user) {
            console.warn("[SETTING] Nessun utente autenticato, redirect...");
            window.location.href = "index.html";
            return;
        }
        emailEl.textContent = user.email;
        const userRef = db.collection("users").doc(user.uid);
        const snap = await userRef.get();
        const data = snap.data();
        console.log("[SETTING] Dati utente:", data);
        if (data?.groupId) {
            try {
                const groupSnap = await db.collection("groups").doc(data.groupId).get();
                groupNameEl.textContent = groupSnap.exists ? groupSnap.data().name : data.groupId;
                console.log("[SETTING] Nome gruppo:", groupNameEl.textContent);
            } catch (err) {
                groupNameEl.textContent = data.groupId;
                console.warn("[SETTING] Errore recupero gruppo:", err);
            }
        } else {
            groupNameEl.textContent = "—";
            console.log("[SETTING] Nessun gruppo associato");
        }
    });

    leaveBtn.addEventListener("click", async () => {
        console.log("[SETTING] leaveBtn cliccato");
        if (!confirm("Sei sicuro di voler abbandonare il gruppo?")) return;
        const user = auth.currentUser;
        if (!user) return;
        try {
            await db.collection("users").doc(user.uid).update({ groupId: firebase.firestore.FieldValue.delete() });
            msgEl.textContent = "Hai abbandonato il gruppo.";
            console.log("[SETTING] Gruppo abbandonato");
            setTimeout(() => window.location.href = "group-setup.html", 1200);
        } catch (e) {
            msgEl.textContent = "Errore: impossibile abbandonare il gruppo.";
            console.error("[SETTING] Errore abbandono gruppo:", e);
        }
    });

    deleteBtn.addEventListener("click", async () => {
        console.log("[SETTING] deleteBtn cliccato");
        if (!confirm("Questa azione eliminerà definitivamente il tuo account e tutti i tuoi dati. Continuare?")) return;
        const user = auth.currentUser;
        if (!user) return;
        try {
            await db.collection("users").doc(user.uid).delete();
            await user.delete();
            msgEl.textContent = "Account eliminato.";
            console.log("[SETTING] Account eliminato");
            setTimeout(() => window.location.href = "index.html", 1200);
        } catch (e) {
            msgEl.textContent = "Errore: impossibile eliminare l'account. Riprova dopo il login.";
            console.error("[SETTING] Errore eliminazione account:", e);
        }
    });



    // 📥 Carica sidebar dinamica
    const sidebarContainer = document.createElement("div");
    sidebarContainer.id = "sidebar-container";
    document.body.insertBefore(sidebarContainer, document.getElementById("profile-container"));
    console.log("[SETTING] sidebar-container inserito nel DOM");

    fetch("sidebar.html")
        .then((res) => res.text())
        .then((html) => {
            sidebarContainer.innerHTML = html;
            console.log("[SETTING] sidebar.html caricato");
            requestAnimationFrame(() => {
                const script = document.createElement("script");
                script.type = "module";
                script.src = "sidebar.js";
                script.onload = () => {
                    console.log("[SETTING] sidebar.js caricato");
                    if (typeof aggiornaEmail === "function") aggiornaEmail();
                };
                document.body.appendChild(script);
                console.log("[SETTING] sidebar.js aggiunto al DOM");
            });
        })
        .catch((err) => {
            console.error("[SETTING] Errore sidebar:", err);
        });

    // 📦 Supporto funzioni globali
    window.toggleSidebar = function () {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            const isVisible = sidebar.style.left === "0px";
            sidebar.style.left = isVisible ? "-350px" : "0px";
            console.log("[SETTING] toggleSidebar chiamato, stato:", sidebar.style.left);
        } else {
            console.warn("[SETTING] toggleSidebar: sidebar non trovata");
        }
    };

    window.navigateTo = function (page) {
        console.log("[SETTING] navigateTo:", page);
        window.location.href = page;
    };

    window.aggiornaEmail = function () {
        const userEmailElement = document.getElementById("userEmail");
        const sidebar = document.getElementById("sidebar");
        const toggleBtn = document.getElementById("openSidebar");
        console.log("[SETTING] aggiornaEmail chiamata", { userEmailElement: !!userEmailElement, sidebar: !!sidebar, toggleBtn: !!toggleBtn });
        firebase.auth().onAuthStateChanged((user) => {
            if (user && userEmailElement) {
                userEmailElement.innerText = user.email;
                if (sidebar) sidebar.style.display = "block";
                if (toggleBtn) toggleBtn.style.display = "block";
                console.log("[SETTING] aggiornaEmail: utente autenticato", user.email);
            } else {
                if (userEmailElement) userEmailElement.innerText = "Non autenticato";
                if (sidebar) sidebar.style.display = "none";
                if (toggleBtn) toggleBtn.style.display = "none";
                console.log("[SETTING] aggiornaEmail: utente non autenticato");
            }
        });
    };
});