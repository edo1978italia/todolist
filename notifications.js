// ===== SISTEMA NOTIFICHE CON FIREBASE =====
// Sistema di notifiche condivise tra utenti del gruppo con funzione di sostituzione

import firebaseConfig from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { 
    getFirestore,
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc,
    getDocs,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variabili globali per il sistema notifiche
let notificationsListener = null;
let currentUserGroup = null;
let currentUserId = null;
let currentUserName = null;

// ===== INIZIALIZZAZIONE =====
export function initNotifications(userId, userName, groupId) {
    currentUserId = userId;
    currentUserName = userName;
    currentUserGroup = groupId;
    
    console.log(`🔔 Inizializzazione notifiche per ${userName} nel gruppo ${groupId}`);
    
    // Avvia il listener per le notifiche del gruppo
    startNotificationsListener();
}

// ===== LISTENER REAL-TIME FIREBASE =====
function startNotificationsListener() {
    if (!currentUserGroup) {
        console.warn('⚠️ Gruppo non definito, impossibile avviare le notifiche');
        return;
    }

    // Query per notifiche del gruppo corrente
    const notificationsRef = collection(db, 'notifications');
    const q = query(
        notificationsRef,
        where('groupId', '==', currentUserGroup),
        orderBy('timestamp', 'desc')
    );

    // Listener real-time
    notificationsListener = onSnapshot(q, (snapshot) => {
        const notifications = [];
        
        snapshot.forEach((doc) => {
            const notification = { id: doc.id, ...doc.data() };
            
            // Non mostrare le notifiche create dall'utente corrente
            if (notification.authorId !== currentUserId) {
                // Converte timestamp Firebase in Date
                if (notification.timestamp?.toDate) {
                    notification.timestamp = notification.timestamp.toDate();
                }
                notifications.push(notification);
            }
        });

        console.log(`🔔 Ricevute ${notifications.length} notifiche per il gruppo`);
        updateNotificationsUI(notifications);
    }, (error) => {
        console.error('❌ Errore nel listener notifiche:', error);
    });
}

// ===== CREAZIONE NOTIFICHE =====
export async function createNotification(type, message, replaceKey = null) {
    if (!currentUserGroup || !currentUserId || !currentUserName) {
        console.warn('⚠️ Informazioni utente/gruppo mancanti');
        return;
    }

    try {
        const notificationData = {
            type: type,
            message: message,
            authorId: currentUserId,
            authorName: currentUserName,
            groupId: currentUserGroup,
            timestamp: serverTimestamp(),
            readBy: [], // Array di user ID che hanno letto la notifica
            replaceKey: replaceKey || `${type}_${currentUserId}_${Date.now()}`
        };

        // Se ha replaceKey, verifica se esiste già una notifica da sostituire
        if (replaceKey) {
            await replaceExistingNotification(notificationData);
        } else {
            // Crea nuova notifica
            await addDoc(collection(db, 'notifications'), notificationData);
        }

        console.log(`✅ Notifica creata: ${message}`);
    } catch (error) {
        console.error('❌ Errore nella creazione notifica:', error);
    }
}

// ===== SOSTITUZIONE NOTIFICHE =====
async function replaceExistingNotification(newNotificationData) {
    try {
        // Cerca notifiche esistenti con lo stesso replaceKey
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('replaceKey', '==', newNotificationData.replaceKey),
            where('groupId', '==', currentUserGroup)
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            // Sostituisce la notifica esistente
            const existingDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, 'notifications', existingDoc.id), {
                ...newNotificationData,
                readBy: [] // Reset stato lettura quando si sostituisce
            });
            console.log(`🔄 Notifica sostituita con replaceKey: ${newNotificationData.replaceKey}`);
        } else {
            // Prima notifica con questo replaceKey
            await addDoc(collection(db, 'notifications'), newNotificationData);
            console.log(`➕ Prima notifica con replaceKey: ${newNotificationData.replaceKey}`);
        }
    } catch (error) {
        console.error('❌ Errore nella sostituzione notifica:', error);
    }
}

// ===== NOTIFICHE PREDEFINITE =====
export function notifyTodoChange() {
    const replaceKey = `todo_changes_${currentUserId}_${currentUserGroup}`;
    createNotification(
        'todo_updated',
        `${currentUserName} ha modificato la lista todo`,
        replaceKey
    );
}

export function notifyNoteAdded(noteTitle) {
    createNotification(
        'note_added',
        `${currentUserName} ha aggiunto una nota: "${noteTitle}"`
    );
}

export function notifyRecipeAdded(recipeName) {
    createNotification(
        'recipe_added',
        `${currentUserName} ha aggiunto una ricetta: "${recipeName}"`
    );
}

export function notifyUserJoined(userName) {
    createNotification(
        'user_joined',
        `${userName} è entrato nel gruppo`
    );
}

export function notifyUserLeft(userName) {
    createNotification(
        'user_left',
        `${userName} ha lasciato il gruppo`
    );
}

export function notifySystemUpdate(message) {
    createNotification(
        'system',
        message
    );
}

// ===== GESTIONE UI =====
function updateNotificationsUI(notifications) {
    const badge = document.getElementById('notificationBadge');
    const notificationsList = document.getElementById('notificationsList');
    
    if (!badge || !notificationsList) return;

    // Conta notifiche non lette dall'utente corrente
    const unreadCount = notifications.filter(n => 
        !n.readBy || !n.readBy.includes(currentUserId)
    ).length;

    // Aggiorna badge
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }

    // Aggiorna lista notifiche nel modal
    renderNotificationsList(notifications);
}

function renderNotificationsList(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    if (notifications.length === 0) {
        notificationsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <p>Nessuna notifica</p>
            </div>
        `;
        return;
    }

    notificationsList.innerHTML = notifications.map(notification => {
        const isUnread = !notification.readBy || !notification.readBy.includes(currentUserId);
        const icon = getNotificationIcon(notification.type);
        const timeAgo = getTimeAgo(notification.timestamp);
        
        // DEBUG: Log per capire il problema
        console.log(`🔍 Notifica ${notification.id}:`, {
            readBy: notification.readBy,
            currentUserId: currentUserId,
            isUnread: isUnread,
            includes: notification.readBy ? notification.readBy.includes(currentUserId) : false
        });
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification.id}">
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');

    // Aggiorna pulsante "Segna tutte come lette"
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
        const hasUnread = notifications.some(n => 
            !n.readBy || !n.readBy.includes(currentUserId)
        );
        markAllBtn.disabled = !hasUnread;
    }
}

// ===== UTILITÀ =====
function getNotificationIcon(type) {
    const icons = {
        'todo_updated': '✅',
        'note_added': '📝',
        'recipe_added': '🍳',
        'user_joined': '👋',
        'user_left': '👋',
        'system': '⚙️'
    };
    return icons[type] || '🔔';
}

function getTimeAgo(date) {
    if (!date) return 'Ora sconosciuta';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString();
}

// ===== AZIONI UTENTE =====
export async function markAllAsRead() {
    if (!currentUserId || !currentUserGroup) return;

    console.log(`🔄 Marcando tutte le notifiche come lette per utente: ${currentUserId}`);

    try {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('groupId', '==', currentUserGroup)
        );

        const querySnapshot = await getDocs(q);
        
        const updatePromises = querySnapshot.docs.map(async (docSnap) => {
            const notification = docSnap.data();
            const readBy = notification.readBy || [];
            
            console.log(`📄 Processando notifica ${docSnap.id}:`, {
                currentReadBy: readBy,
                includesUser: readBy.includes(currentUserId)
            });
            
            if (!readBy.includes(currentUserId)) {
                readBy.push(currentUserId);
                console.log(`✅ Aggiornando notifica ${docSnap.id} con readBy:`, readBy);
                return updateDoc(doc(db, 'notifications', docSnap.id), { readBy });
            } else {
                console.log(`⏭️ Notifica ${docSnap.id} già marcata come letta`);
            }
        });

        await Promise.all(updatePromises.filter(Boolean));
        console.log('✅ Tutte le notifiche marcate come lette');
    } catch (error) {
        console.error('❌ Errore nel marcare come lette:', error);
    }
}

// ===== FUNZIONI DI NOTIFICA SPECIFICHE =====

// Notifica per creazione note
export function notifyNoteCreated(noteTitle) {
    if (!currentUserId || !currentUserName || !currentUserGroup) {
        console.warn('⚠️ Sistema notifiche non inizializzato');
        return;
    }

    const message = `${currentUserName} ha creato una nuova nota: ${noteTitle}`;
    
    // Non usiamo replaceKey per le note perché ogni nota è unica
    createNotification('note', message);
}

// ===== CLEANUP =====
export function destroyNotifications() {
    if (notificationsListener) {
        notificationsListener();
        notificationsListener = null;
    }
    
    currentUserGroup = null;
    currentUserId = null;
    currentUserName = null;
    
    console.log('🔔 Sistema notifiche distrutto');
}

// ===== FUNZIONI GLOBALI PER LA UI =====
window.markAllAsRead = markAllAsRead;
