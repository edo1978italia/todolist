// 🌐 FUNZIONI GLOBALI ESSENZIALI PER SETTINGS
// Questo file deve essere caricato prima di settings.js per garantire che le funzioni onclick funzionino

console.log("[SETTINGS-GLOBAL] 🚀 Caricamento funzioni globali...");

// 🎯 Funzioni per gestione pannelli slide
function openPanel(panelId) {
    console.log("[SETTINGS-GLOBAL] 🎯 Apertura pannello:", panelId);
    closeActivePanel();
    const panel = document.getElementById(panelId);
    const overlay = document.getElementById('panelOverlay');
    
    if (panel) {
        panel.classList.add('active');
        if (overlay) overlay.classList.add('active');
        console.log("[SETTINGS-GLOBAL] ✅ Pannello aperto:", panelId);
    } else {
        console.error("[SETTINGS-GLOBAL] ❌ Pannello non trovato:", panelId);
    }
}

function closePanel(panelId) {
    console.log("[SETTINGS-GLOBAL] 🚪 Chiusura pannello:", panelId);
    const panel = document.getElementById(panelId);
    const overlay = document.getElementById('panelOverlay');
    
    if (panel) {
        panel.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        console.log("[SETTINGS-GLOBAL] ✅ Pannello chiuso:", panelId);
    }
}

function closeActivePanel() {
    const panels = document.querySelectorAll('.side-panel');
    const overlay = document.getElementById('panelOverlay');
    
    panels.forEach(panel => panel.classList.remove('active'));
    if (overlay) overlay.classList.remove('active');
}

// 🔔 Toggle notifiche
function toggleNotification(type, element) {
    console.log("[SETTINGS-GLOBAL] Toggle notifica:", type);
    element.classList.toggle('active');
    
    const isEnabled = element.classList.contains('active');
    console.log(`Notifica ${type} ${isEnabled ? 'abilitata' : 'disabilitata'}`);
    
    // Se settings.js è caricato, usa la sua funzione per salvare
    if (typeof window.saveNotificationPreference === 'function') {
        window.saveNotificationPreference(type, isEnabled);
    }
}

// 🚨 Conferma eliminazione account
function showDeleteAccountConfirmation() {
    console.log("[SETTINGS-GLOBAL] Mostra conferma eliminazione account");
    
    if (confirm('⚠️ Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile!')) {
        alert('🔥 Account eliminato! (simulazione)');
        closeActivePanel();
        
        // Se settings.js è caricato, usa la sua funzione per eliminare
        if (typeof window.deleteUserAccount === 'function') {
            window.deleteUserAccount();
        }
    }
}

// 🚪 Gestione modal
function openDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) {
        modal.style.display = 'block';
        closeActivePanel();
    }
}

function closeDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showLeaveGroupModal() {
    const modal = document.getElementById('leaveGroupModal');
    if (modal) {
        modal.style.display = 'block';
        closeActivePanel();
    }
}

function closeLeaveGroupModal() {
    const modal = document.getElementById('leaveGroupModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showSwitchGroupPrompt() {
    const newGroupCode = prompt('Enter the invite code for the new group:');
    if (newGroupCode && newGroupCode.trim()) {
        console.log('Switch to group with code:', newGroupCode.trim());
        alert('Switch group feature coming soon!');
    }
}

// 📋 Caricamento sidebar
function loadSidebar() {
    console.log("[SETTINGS-GLOBAL] 🔄 Caricamento sidebar...");
    
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) {
        console.error("[SETTINGS-GLOBAL] ❌ sidebar-container non trovato!");
        return;
    }
    
    fetch('sidebar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            sidebarContainer.innerHTML = html;
            console.log("[SETTINGS-GLOBAL] ✅ Sidebar caricata con successo");
            
            // Inizializza la sidebar se la funzione esiste
            if (typeof initializeSidebar === 'function') {
                initializeSidebar();
            }
        })
        .catch(error => {
            console.warn("[SETTINGS-GLOBAL] ⚠️ Errore caricamento sidebar:", error);
            console.log("[SETTINGS-GLOBAL] 🔄 Continuo senza sidebar");
            
            // Fallback: mostra un header semplice
            sidebarContainer.innerHTML = `
                <div style="padding: 10px; background: #2196F3; color: white; text-align: center;">
                    <strong>Settings</strong>
                </div>
            `;
        });
}

// 🌐 Rendi tutte le funzioni disponibili globalmente
window.openPanel = openPanel;
window.closePanel = closePanel;
window.closeActivePanel = closeActivePanel;
window.toggleNotification = toggleNotification;
window.showDeleteAccountConfirmation = showDeleteAccountConfirmation;
window.openDeleteAccountModal = openDeleteAccountModal;
window.closeDeleteAccountModal = closeDeleteAccountModal;
window.showLeaveGroupModal = showLeaveGroupModal;
window.closeLeaveGroupModal = closeLeaveGroupModal;
window.showSwitchGroupPrompt = showSwitchGroupPrompt;
window.loadSidebar = loadSidebar;

// 🚀 Inizializzazione automatica quando il DOM è pronto
document.addEventListener("DOMContentLoaded", () => {
    console.log("[SETTINGS-GLOBAL] ✅ DOM pronto, inizializzazione...");
    
    // Carica la sidebar automaticamente
    loadSidebar();
    
    // Listener per ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeActivePanel();
        }
    });
});

console.log("[SETTINGS-GLOBAL] ✅ Funzioni globali caricate e disponibili");
