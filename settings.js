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
    // Selettori
    const emailEl = document.getElementById("userEmail");
    const groupNameEl = document.getElementById("userGroupName");
    const msgEl = document.getElementById("settingsMsg");
    const leaveGroupBtn = document.getElementById("leaveGroupBtn");
    const leaveGroupModal = document.getElementById("leaveGroupModal");
    const confirmLeaveGroupBtn = document.getElementById("confirmLeaveGroupBtn");
    const cancelLeaveGroupBtn = document.getElementById("cancelLeaveGroupBtn");
    const deleteBtn = document.getElementById("deleteAccountBtn");

    // Log presenza elementi
    console.log("[SETTING] Elementi:", {
        emailEl: !!emailEl,
        groupNameEl: !!groupNameEl,
        leaveGroupBtn: !!leaveGroupBtn,
        leaveGroupModal: !!leaveGroupModal,
        confirmLeaveGroupBtn: !!confirmLeaveGroupBtn,
        cancelLeaveGroupBtn: !!cancelLeaveGroupBtn,
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

    // Gestione abbandono gruppo tramite modale custom
    if (typeof confirmLeaveGroupBtn !== 'undefined' && confirmLeaveGroupBtn) {
        confirmLeaveGroupBtn.addEventListener("click", async function() {
            if (!auth.currentUser) {
                alert("Nessun utente autenticato.");
                return;
            }
            // Recupera dati utente
            const userSnap = await db.collection("users").doc(auth.currentUser.uid).get();
            const userData = userSnap.data();
            if (!userData?.groupId) {
                alert("Non sei in nessun gruppo.");
                return;
            }
            // Conta quanti utenti hanno lo stesso groupId
            const membersSnap = await db.collection("users").where("groupId", "==", userData.groupId).get();
            if (membersSnap.size <= 1) {
                alert("Sei l'unico membro, non puoi abbandonare il gruppo. Puoi solo eliminare il tuo account.");
                return;
            }
            try {
                await db.collection("users").doc(auth.currentUser.uid).update({ groupId: firebase.firestore.FieldValue.delete() });
                alert("Hai abbandonato il gruppo.");
                window.location.href = "group-setup.html";
            } catch (e) {
                alert("Errore: impossibile abbandonare il gruppo.\n" + e.message);
                console.error("[SETTING] Errore abbandono gruppo:", e);
            }
        });
    }

    // Funzione di eliminazione account con pulizia gruppo se ultimo membro
    async function deleteUserAccount() {
        if (!auth.currentUser) return;
        const user = auth.currentUser;
        // Recupera dati utente
        const userSnap = await db.collection("users").doc(user.uid).get();
        const userData = userSnap.data();
        let groupId = userData?.groupId;
        let isLastMember = false;
        if (groupId) {
            const membersSnap = await db.collection("users").where("groupId", "==", groupId).get();
            isLastMember = (membersSnap.size <= 1);
        }
        if (isLastMember && groupId) {
            // Elimina tutte le note, ricette, categorie collegate a quel gruppo
            const deleteCollection = async (collectionName) => {
                const snap = await db.collection(collectionName).where("groupId", "==", groupId).get();
                const batch = db.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            };
            await deleteCollection("notes");
            await deleteCollection("categories");
            await deleteCollection("ricette");
            await db.collection("groups").doc(groupId).delete();
            console.log("[SETTING] Eliminato gruppo e dati collegati perché era l'ultimo membro");
        }
        // Elimina utente
        await db.collection("users").doc(user.uid).delete();
        await user.delete();
    }

    // Sostituisco la logica del pulsante deleteBtn
    deleteBtn.addEventListener("click", async () => {
        console.log("[SETTING] deleteBtn cliccato");
        if (!confirm("Questa azione eliminerà definitivamente il tuo account e tutti i tuoi dati. Continuare?")) return;
        try {
            await deleteUserAccount();
            msgEl.textContent = "Account eliminato.";
            setTimeout(() => window.location.href = "index.html", 1200);
        } catch (e) {
            msgEl.textContent = "Errore: impossibile eliminare l'account.";
            console.error("[SETTING] Errore eliminazione account:", e);
        }
    });

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

