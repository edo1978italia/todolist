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
        try {
            const userRef = db.collection("users").doc(user.uid);
            const snap = await userRef.get();
            const data = snap.data();
            console.log("[SETTING] Dati utente:", data);
            // Nome completo (nome + cognome da due campi separati)
            const fullNameEl = document.getElementById("fullName");
            if (fullNameEl) fullNameEl.textContent = ((data?.firstName || "") + " " + (data?.lastName || "")).trim() || "—";
            // Nome
            const firstNameEl = document.getElementById("firstName");
            if (firstNameEl) firstNameEl.textContent = data?.firstName || "—";
            // Last Name
            const lastNameEl = document.getElementById("lastName");
            if (lastNameEl) lastNameEl.textContent = data?.lastName || "—";
            // Email (ora da Firestore)
            const emailEl = document.getElementById("userEmail");
            if (emailEl) emailEl.textContent = data?.email || "—";
            // Group Name
            const groupNameEl = document.getElementById("userGroupName");
            if (groupNameEl) {
                if (data?.groupId) {
                    try {
                        const groupSnap = await db.collection("groups").doc(data.groupId).get();
                        groupNameEl.textContent = groupSnap.exists ? groupSnap.data().name : data.groupId;
                    } catch (err) {
                        groupNameEl.textContent = data.groupId;
                    }
                } else {
                    groupNameEl.textContent = "—";
                }
            }
            // AVATAR (indipendente)
            // avatarEl rimosso: non viene più gestito l'avatar
        } catch (err) {
            console.error("[SETTING] Errore caricamento dettagli utente:", err);
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

    // Gestione modale custom leave group
    const leaveGroupBtn = document.getElementById("leaveGroupBtn");
    const leaveGroupModal = document.getElementById("leaveGroupModal");
    const confirmLeaveGroupBtn = document.getElementById("confirmLeaveGroupBtn");
    const cancelLeaveGroupBtn = document.getElementById("cancelLeaveGroupBtn");

    if (leaveGroupBtn && leaveGroupModal) {
        leaveGroupBtn.addEventListener("click", function() {
            leaveGroupModal.style.display = "flex";
        });
    }
    if (cancelLeaveGroupBtn && leaveGroupModal) {
        cancelLeaveGroupBtn.addEventListener("click", function() {
            leaveGroupModal.style.display = "none";
        });
    }
    if (confirmLeaveGroupBtn) {
        confirmLeaveGroupBtn.addEventListener("click", async function() {
            leaveGroupModal.style.display = "none";
            // Qui va la logica di abbandono gruppo
            if (!auth.currentUser) return;
            try {
                await db.collection("users").doc(auth.currentUser.uid).update({ groupId: firebase.firestore.FieldValue.delete() });
                if (msgEl) msgEl.textContent = "Hai abbandonato il gruppo.";
                setTimeout(() => window.location.href = "group-setup.html", 1200);
            } catch (e) {
                if (msgEl) msgEl.textContent = "Errore: impossibile abbandonare il gruppo.";
                console.error("[SETTING] Errore abbandono gruppo:", e);
            }
        });
    }

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
});

