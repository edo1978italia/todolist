import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import firebaseConfig from "./config.js";

console.log("[SETTING] Avvio setting.js...");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔔 Funzione helper per creare notifica di uscita dal gruppo
async function createLeaveNotification(groupId, userName, userId) {
    console.log(`🔔 [DEBUG] Tentativo creazione notifica di uscita per:`, {
        groupId,
        userName,
        userId
    });
    try {
        const notificationData = {
            type: 'user_left',
            message: `${userName} ha lasciato il gruppo`,
            authorId: userId,
            authorName: userName,
            groupId: groupId,
            timestamp: serverTimestamp(),
            readBy: [], 
            hiddenBy: [],
            replaceKey: `user_left_${userId}_${groupId}`
        };
        
        console.log(`🔔 [DEBUG] Dati notifica da creare:`, notificationData);
        
        const docRef = await addDoc(collection(db, 'notifications'), notificationData);
        console.log(`🔔 [SUCCESS] Notifica di uscita creata per ${userName} con ID: ${docRef.id}`);
    } catch (error) {
        console.error('❌ [ERROR] Errore nella creazione notifica di uscita:', error);
        console.error('❌ [ERROR] Stack trace:', error.stack);
    }
}

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
        msgEl: !!msgEl,
        groupMembersCount: !!document.getElementById("groupMembersCount"),
        groupMembersList: !!document.getElementById("groupMembersList")
    });

    auth.onAuthStateChanged(async (user) => {
        console.log("[SETTING] onAuthStateChanged triggerato", user);
        if (!user) {
            console.warn("[SETTING] Nessun utente autenticato, redirect...");
            window.location.href = "index.html";
            return;
        }
        try {
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
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
            // Email (da Firestore, fallback a auth se mancante)
            const emailEl = document.getElementById("userEmail");
            if (emailEl) {
                if (data?.email) {
                    emailEl.textContent = data.email;
                } else if (user?.email) {
                    emailEl.textContent = user.email;
                } else {
                    emailEl.textContent = "—";
                }
            }
            // Group Name, numero membri e lista nickname con foto profilo
            const groupNameEl = document.getElementById("userGroupName");
            const groupMembersCountEl = document.getElementById("groupMembersCount");
            const groupMembersListEl = document.getElementById("groupMembersList");
            if (groupNameEl) {
                if (data?.groupId) {
                    try {
                        const groupSnap = await getDoc(doc(db, "groups", data.groupId));
                        groupNameEl.textContent = groupSnap.exists() ? groupSnap.data().name : data.groupId;
                    } catch (err) {
                        groupNameEl.textContent = data.groupId;
                    }
                    // Conta membri gruppo e mostra lista nickname con foto profilo
                    if (groupMembersCountEl || groupMembersListEl) {
                        try {
                            console.log("[SETTING] 🔍 Caricamento membri per gruppo:", data.groupId);
                            const membersQuery = query(collection(db, "users"), where("groupId", "==", data.groupId));
                            const membersSnap = await getDocs(membersQuery);
                            console.log("[SETTING] 👥 Trovati", membersSnap.size, "membri");
                            
                            if (groupMembersCountEl) {
                                groupMembersCountEl.textContent = membersSnap.size;
                                console.log("[SETTING] ✅ Numero membri aggiornato:", membersSnap.size);
                            }
                            
                            if (groupMembersListEl) {
                                groupMembersListEl.innerHTML = "";
                                let hasMembers = false;
                                let memberIndex = 0;
                                
                                membersSnap.forEach(doc => {
                                    memberIndex++;
                                    const u = doc.data();
                                    console.log(`[SETTING] 👤 Membro ${memberIndex}:`, {
                                        uid: doc.id,
                                        firstName: u.firstName,
                                        lastName: u.lastName,
                                        nickname: u.nickname,
                                        email: u.email,
                                        photoURL: u.photoURL
                                    });
                                    
                                    // 🏷️ Per le TARGHETTE UTENTI nelle impostazioni: usa sempre nome completo
                                    let displayName = ((u.firstName || "") + " " + (u.lastName || "")).trim();
                                    if (!displayName) {
                                        // Fallback se nome/cognome non ci sono
                                        displayName = u.nickname || u.email || "?";
                                    }
                                    
                                    // Per gli avatar, usa nickname o primo nome (più corto)
                                    let avatarName = u.nickname || u.firstName || displayName;
                                    
                                    if (displayName) {
                                        hasMembers = true;
                                        const chip = document.createElement("span");
                                        chip.className = "member-chip member-chip-avatar";
                                        
                                        // Foto profilo: usa u.photoURL se presente, altrimenti avatar di default
                                        const avatar = document.createElement("img");
                                        avatar.className = "member-avatar";
                                        avatar.alt = "avatar";
                                        
                                        // Costruisci URL avatar con fallback più robusto
                                        let avatarUrl;
                                        if (u.photoURL && u.photoURL.trim() !== "") {
                                            avatarUrl = u.photoURL;
                                            console.log(`[SETTING] 📸 Usando photoURL per ${displayName}:`, avatarUrl);
                                        } else {
                                            avatarUrl = "https://ui-avatars.com/api/?name=" + encodeURIComponent(avatarName) + "&background=cccccc&color=444&size=48";
                                            console.log(`[SETTING] 🎨 Generando avatar per ${displayName}:`, avatarUrl);
                                        }
                                        
                                        avatar.src = avatarUrl;
                                        
                                        // Gestione errore caricamento immagine
                                        avatar.onerror = function() {
                                            console.warn(`[SETTING] ⚠️ Errore caricamento avatar per ${displayName}, fallback a default locale`);
                                            this.src = "icone/default-avatar.png";
                                        };
                                        
                                        chip.appendChild(avatar);
                                        
                                        // 🏷️ NOME COMPLETO nella targhetta
                                        const nickSpan = document.createElement("span");
                                        nickSpan.className = "member-nick";
                                        nickSpan.textContent = displayName; // ← Nome completo
                                        chip.appendChild(nickSpan);
                                        
                                        groupMembersListEl.appendChild(chip);
                                        console.log(`[SETTING] ✅ Chip creato per ${displayName}`);
                                    } else {
                                        console.warn(`[SETTING] ⚠️ Nome vuoto per membro ${memberIndex}, saltato`);
                                    }
                                });
                                
                                if (!hasMembers) {
                                    groupMembersListEl.innerHTML = "—";
                                    console.log("[SETTING] ❌ Nessun membro valido trovato");
                                } else {
                                    console.log(`[SETTING] ✅ Lista membri creata con ${memberIndex} membri`);
                                }
                            }
                        } catch (err) {
                            console.error("[SETTING] ❌ Errore nel caricamento membri:", err);
                            if (groupMembersCountEl) groupMembersCountEl.textContent = "—";
                            if (groupMembersListEl) groupMembersListEl.innerHTML = "—";
                        }
                    }
                } else {
                    groupNameEl.textContent = "—";
                    if (groupMembersCountEl) groupMembersCountEl.textContent = "—";
                    if (groupMembersListEl) groupMembersListEl.innerHTML = "—";
                }
            }
            // AVATAR dell'utente corrente
            const avatarEl = document.getElementById("userAvatar");
            if (avatarEl) {
                avatarEl.src = data?.photoURL || "icone/default-avatar.png";
                console.log("[SETTING] Avatar utente aggiornato:", avatarEl.src);
            }
            
            // 🔔 Carica preferenze notifiche
            loadNotificationPreferences(data?.notifications);
            
            // 🗑️ Aggiorna info pannello Delete Account
            updateDeleteAccountPanel(data, user);
        } catch (err) {
            console.error("[SETTING] Errore caricamento dettagli utente:", err);
        }
    });

    // Funzione di abbandono gruppo centralizzata
    async function leaveGroup() {
        if (!auth.currentUser) {
            alert("No authenticated user.");
            return;
        }
        // Recupera dati utente
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        const userData = userSnap.data();
        if (!userData?.groupId) {
            alert("You are not in any group.");
            return;
        }
        // Conta quanti utenti hanno lo stesso groupId
        const membersQuery = query(collection(db, "users"), where("groupId", "==", userData.groupId));
        const membersSnap = await getDocs(membersQuery);
        if (membersSnap.size <= 1) {
            alert("You are the only member, you cannot leave the group. You can only delete your account.");
            return;
        }
        try {
            // 🔔 Crea notifica di uscita dal gruppo prima di lasciarlo
            const displayName = userData?.nickname || userData?.displayName || userData?.firstName || "Utente";
            console.log(`🔔 [DEBUG] leaveGroup() - Nome utente risolto:`, {
                nickname: userData?.nickname,
                displayName: userData?.displayName,
                firstName: userData?.firstName,
                finalName: displayName
            });
            
            await createLeaveNotification(userData.groupId, displayName, auth.currentUser.uid);
            
            await updateDoc(doc(db, "users", auth.currentUser.uid), { groupId: deleteField() });
            alert("You have left the group.");
            window.location.href = "group-setup.html";
        } catch (e) {
            alert("Error: Unable to leave the group.\n" + e.message);
            console.error("[SETTING] Error leaving group:", e);
        }
    }

    // Gestione abbandono gruppo tramite modale custom
    if (typeof confirmLeaveGroupBtn !== 'undefined' && confirmLeaveGroupBtn) {
        confirmLeaveGroupBtn.addEventListener("click", async function() {
            // Chiudi il modale prima di eseguire l'azione
            const leaveGroupModal = document.getElementById("leaveGroupModal");
            if (leaveGroupModal) {
                leaveGroupModal.style.display = "none";
            }
            // Usa la funzione centralizzata leaveGroup()
            await leaveGroup();
        });
    }
    
    // Gestione nuovo pulsante Leave Group (con ID diverso per evitare conflitti)
    const newConfirmLeaveGroupBtn = document.getElementById("newConfirmLeaveGroupBtn");
    if (newConfirmLeaveGroupBtn) {
        newConfirmLeaveGroupBtn.addEventListener("click", async function() {
            closeLeaveGroupModal();
            await leaveGroup();
        });
    }

    // Funzione di eliminazione account con pulizia gruppo se ultimo membro
    async function deleteUserAccount() {
        if (!auth.currentUser) return;
        const user = auth.currentUser;
        // Recupera dati utente
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.data();
        let groupId = userData?.groupId;
        let isLastMember = false;
        if (groupId) {
            const membersQuery = query(collection(db, "users"), where("groupId", "==", groupId));
            const membersSnap = await getDocs(membersQuery);
            isLastMember = (membersSnap.size <= 1);
        }
        if (isLastMember && groupId) {
            // Elimina tutte le note, ricette, categorie collegate a quel gruppo
            const deleteCollection = async (collectionName) => {
                const snap = await getDocs(query(collection(db, collectionName), where("groupId", "==", groupId)));
                const deletePromises = [];
                snap.forEach(document => {
                    deletePromises.push(deleteDoc(document.ref));
                });
                await Promise.all(deletePromises);
            };
            await deleteCollection("notes");
            await deleteCollection("categories");
            await deleteCollection("ricette");
            await deleteDoc(doc(db, "groups", groupId));
            console.log("[SETTING] Eliminato gruppo e dati collegati perché era l'ultimo membro");
        }
        // Elimina utente
        await deleteDoc(doc(db, "users", user.uid));
        await user.delete();
    }

    // Gestione eliminazione account tramite modale moderno
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", async () => {
            console.log("[SETTING] confirmDeleteBtn cliccato");
            closeDeleteAccountModal();
            
            try {
                await deleteUserAccount();
                alert("Account deleted successfully.");
                setTimeout(() => window.location.href = "index.html", 1200);
            } catch (e) {
                alert("Error: Unable to delete account.\n" + e.message);
                console.error("[SETTING] Error deleting account:", e);
            }
        });
    }
    
    // Rimuovi il vecchio listener per il pulsante deleteBtn se esiste
    if (deleteBtn) {
        // Sostituisci con l'apertura del modale moderno
        deleteBtn.addEventListener("click", () => {
            console.log("[SETTING] deleteBtn cliccato - apertura modale");
            openDeleteAccountModal();
        });
    }

    // 🔓 Logout sicuro
    async function logoutUser() {
        try {
            const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
            await signOut(auth);
            console.log("✅ Logout completed");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 500);
        } catch (error) {
            console.error("Error logging out:", error);
            alert("Error logging out: " + error.message);
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

    // Esporta leaveGroup globalmente
    window.leaveGroup = leaveGroup;

    // 🔄 Listener per sincronizzazione avatar tra tab/finestre
    window.addEventListener('storage', (e) => {
      if (e.key === 'userAvatarUpdated' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          console.log("[SETTING] 🔄 Ricevuto aggiornamento avatar:", data.url);
          
          // Aggiorna avatar in questa pagina
          const avatarEl = document.getElementById("userAvatar");
          if (avatarEl) {
            avatarEl.src = data.url;
            console.log("[SETTING] ✅ Avatar aggiornato");
          }
        } catch (err) {
          console.warn("[SETTING] ⚠️ Errore parsing avatar update:", err);
        }
      }
    });

    // 🎛️ Funzioni per gestire i pannelli slide
    function openPanel(panelId) {
        console.log("[SETTING] Apertura pannello:", panelId);
        
        // Chiudi eventuali pannelli aperti
        closeActivePanel();
        
        // Apri il pannello specificato
        const panel = document.getElementById(panelId);
        const overlay = document.getElementById('panelOverlay');
        
        if (panel && overlay) {
            overlay.classList.add('active');
            panel.classList.add('active');
            
            // Blocca scroll del body
            document.body.style.overflow = 'hidden';
            
            console.log("[SETTING] ✅ Pannello aperto:", panelId);
        } else {
            console.warn("[SETTING] ⚠️ Pannello o overlay non trovato:", panelId);
        }
    }

    function closePanel(panelId) {
        console.log("[SETTING] Chiusura pannello:", panelId);
        
        const panel = document.getElementById(panelId);
        const overlay = document.getElementById('panelOverlay');
        
        if (panel && overlay) {
            overlay.classList.remove('active');
            panel.classList.remove('active');
            
            // Ripristina scroll del body
            document.body.style.overflow = '';
            
            console.log("[SETTING] ✅ Pannello chiuso:", panelId);
        }
    }

    function closeActivePanel() {
        console.log("[SETTING] Chiusura pannelli attivi");
        
        const overlay = document.getElementById('panelOverlay');
        const panels = document.querySelectorAll('.side-panel.active');
        
        if (overlay) {
            overlay.classList.remove('active');
        }
        
        panels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Ripristina scroll del body
        document.body.style.overflow = '';
        
        // Chiudi anche i modali se aperti
        closeDeleteAccountModal();
        closeLeaveGroupModal();
    }

    // 🚨 Funzioni per gestire i modali
    function openDeleteAccountModal() {
        console.log("[SETTING] Apertura modale delete account");
        
        const modal = document.getElementById('deleteAccountModal');
        if (modal) {
            // Usa lo stile del pannello overlay ma con background più scuro
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            console.log("[SETTING] ✅ Modale delete account aperto");
        }
    }

    function closeDeleteAccountModal() {
        const modal = document.getElementById('deleteAccountModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function showLeaveGroupModal() {
        console.log("[SETTING] Apertura modale leave group");
        
        const modal = document.getElementById('leaveGroupModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            console.log("[SETTING] ✅ Modale leave group aperto");
        }
    }

    function closeLeaveGroupModal() {
        const modal = document.getElementById('leaveGroupModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // 🎛️ Funzioni per gestire i toggle delle notifiche
    function toggleNotification(notificationType, toggleElement) {
        console.log("[SETTING] Toggle notifica:", notificationType);
        
        const isActive = toggleElement.classList.contains('active');
        
        if (isActive) {
            toggleElement.classList.remove('active');
            console.log("[SETTING] ✅ Notifica disattivata:", notificationType);
        } else {
            toggleElement.classList.add('active');
            console.log("[SETTING] ✅ Notifica attivata:", notificationType);
        }
        
        // Qui potresti salvare la preferenza in Firestore
        saveNotificationPreference(notificationType, !isActive);
    }

    async function saveNotificationPreference(type, enabled) {
        try {
            if (!auth.currentUser) return;
            
            const userRef = doc(db, "users", auth.currentUser.uid);
            const updateData = {
                [`notifications.${type}`]: enabled
            };
            
            await updateDoc(userRef, updateData);
            console.log("[SETTING] ✅ Preferenza notifica salvata:", type, enabled);
        } catch (error) {
            console.error("[SETTING] ❌ Errore salvataggio preferenza:", error);
        }
    }

    // 👥 Funzione per mostrare prompt switch group
    function showSwitchGroupPrompt() {
        const newGroupId = prompt("Enter the new group invitation code:");
        if (newGroupId && newGroupId.trim()) {
            switchToGroup(newGroupId.trim());
        }
    }

    async function switchToGroup(groupId) {
        try {
            if (!auth.currentUser) {
                alert("No authenticated user.");
                return;
            }
            
            // Verifica se il gruppo esiste
            const groupSnap = await getDoc(doc(db, "groups", groupId));
            if (!groupSnap.exists()) {
                alert("Group not found. Please check the invitation code.");
                return;
            }
            
            // Aggiorna l'utente con il nuovo gruppo
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                groupId: groupId
            });
            
            alert("Successfully switched to new group!");
            
            // Ricarica la pagina per aggiornare i dati
            window.location.reload();
            
        } catch (error) {
            console.error("[SETTING] ❌ Errore switch gruppo:", error);
            alert("Error switching group: " + error.message);
        }
    }

    // 🌐 Rendi le funzioni disponibili globalmente
    window.openPanel = openPanel;
    window.closePanel = closePanel;
    window.closeActivePanel = closeActivePanel;
    window.openDeleteAccountModal = openDeleteAccountModal;
    window.closeDeleteAccountModal = closeDeleteAccountModal;
    window.showLeaveGroupModal = showLeaveGroupModal;
    window.closeLeaveGroupModal = closeLeaveGroupModal;
    window.toggleNotification = toggleNotification;
    window.showSwitchGroupPrompt = showSwitchGroupPrompt;
    window.showDeleteAccountConfirmation = showDeleteAccountConfirmation;
    
    // 🔔 Funzione per caricare le preferenze delle notifiche
    function loadNotificationPreferences(notifications) {
        console.log("[SETTING] Caricamento preferenze notifiche:", notifications);
        
        if (!notifications) {
            // Imposta valori di default
            notifications = {
                newNotes: true,
                taskUpdates: true,
                groupChanges: false
            };
        }
        
        // Aggiorna i toggle switches
        const toggles = {
            newNotes: document.querySelector('[onclick*="newNotes"]'),
            taskUpdates: document.querySelector('[onclick*="taskUpdates"]'),
            groupChanges: document.querySelector('[onclick*="groupChanges"]')
        };
        
        Object.keys(toggles).forEach(key => {
            const toggle = toggles[key];
            if (toggle) {
                if (notifications[key]) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
                console.log("[SETTING] ✅ Toggle aggiornato:", key, notifications[key]);
            }
        });
    }

    // 🗑️ Funzione per aggiornare le informazioni nel pannello Delete Account
    function updateDeleteAccountPanel(userData, user) {
        console.log("[SETTING] Aggiornamento pannello Delete Account:", userData);
        
        // Nome
        const firstNameEl = document.getElementById("deletePanel_firstName");
        if (firstNameEl) {
            firstNameEl.textContent = userData?.firstName || "—";
        }
        
        // Cognome
        const lastNameEl = document.getElementById("deletePanel_lastName");
        if (lastNameEl) {
            lastNameEl.textContent = userData?.lastName || "—";
        }
        
        // Email
        const emailEl = document.getElementById("deletePanel_email");
        if (emailEl) {
            emailEl.textContent = userData?.email || user?.email || "—";
        }
        
        // Data creazione account
        const createdAtEl = document.getElementById("deletePanel_createdAt");
        if (createdAtEl) {
            if (userData?.createdAt) {
                // Se abbiamo il timestamp di creazione da Firestore
                const date = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
                createdAtEl.textContent = date.toLocaleDateString('it-IT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } else if (user?.metadata?.creationTime) {
                // Fallback alla data di creazione di Firebase Auth
                const date = new Date(user.metadata.creationTime);
                createdAtEl.textContent = date.toLocaleDateString('it-IT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } else {
                createdAtEl.textContent = "—";
            }
        }
    }

    // 🚨 Funzione per mostrare la conferma finale di eliminazione account
    function showDeleteAccountConfirmation() {
        console.log("[SETTING] Mostra conferma eliminazione account");
        
        // Chiudi il pannello e mostra il modale di conferma
        closePanel('deleteAccountPanel');
        
        // Aspetta un po' per l'animazione del pannello
        setTimeout(() => {
            openDeleteAccountModal();
        }, 300);
    }
});
