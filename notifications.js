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
let userJoinedAt = null; // Timestamp di quando l'utente si è unito al gruppo

// ===== INIZIALIZZAZIONE =====
export function initNotifications(userId, userName, groupId, joinedAt = null) {
    currentUserId = userId;
    currentUserName = userName;
    currentUserGroup = groupId;
    
    // Gestisci timestamp Firebase o Date JavaScript
    if (joinedAt) {
        if (joinedAt.toDate && typeof joinedAt.toDate === 'function') {
            // È un Timestamp Firebase
            userJoinedAt = joinedAt.toDate();
        } else if (joinedAt instanceof Date) {
            // È già una Date
            userJoinedAt = joinedAt;
        } else if (typeof joinedAt === 'string') {
            // È una stringa, prova a parsarla
            userJoinedAt = new Date(joinedAt);
        } else {
            console.warn('⚠️ Formato joinedAt non riconosciuto:', joinedAt);
            userJoinedAt = new Date();
        }
    } else {
        // Se non viene fornita una data di ingresso, usa il momento corrente
        // Questo significa che il nuovo utente vedrà solo notifiche future
        userJoinedAt = new Date();
    }
    
    console.log(`🔔 Inizializzazione notifiche per ${userName} nel gruppo ${groupId}`);
    console.log(`👋 Utente unito al gruppo il: ${userJoinedAt.toLocaleString()}`);
    console.log(`🕒 Timestamp completo: ${userJoinedAt.toISOString()}`);
    
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
            // E non mostrare le notifiche nascoste dall'utente corrente
            if (notification.authorId !== currentUserId) {
                const hiddenBy = notification.hiddenBy || [];
                if (!hiddenBy.includes(currentUserId)) {
                    // Converte timestamp Firebase in Date
                    if (notification.timestamp?.toDate) {
                        notification.timestamp = notification.timestamp.toDate();
                    }
                    
                    // 🕒 FILTRO TEMPORALE: Mostra solo notifiche create DOPO l'ingresso dell'utente
                    if (notification.timestamp && userJoinedAt && notification.timestamp >= userJoinedAt) {
                        notifications.push(notification);
                        console.log(`✅ Notifica inclusa: ${notification.message} (creata: ${notification.timestamp.toLocaleString()})`);
                    } else if (notification.timestamp) {
                        console.log(`❌ Notifica esclusa (precedente all'ingresso): ${notification.message} (creata: ${notification.timestamp.toLocaleString()})`);
                    } else {
                        // Se non ha timestamp, non includerla per sicurezza
                        console.log(`⚠️ Notifica senza timestamp esclusa: ${notification.message}`);
                    }
                }
            }
        });

        console.log(`🔔 Ricevute ${notifications.length} notifiche visibili per il gruppo (filtrate per timestamp)`);
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
            hiddenBy: [], // Array di user ID che hanno nascosto la notifica
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
                readBy: [], // Reset stato lettura quando si sostituisce
                hiddenBy: [] // Reset stato nascosto quando si sostituisce
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
        
        // Parsing del messaggio per evidenziare nome autore e titolo
        const { authorName, action, title } = parseNotificationMessage(notification.message, notification.type);
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification.id}">
                <!-- Background fissi per azioni swipe -->
                <div class="swipe-background-left"></div>
                <div class="swipe-background-right"></div>
                
                <!-- Icone fisse -->
                <div class="swipe-icon-left">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18l-2 13H5L3 6zM8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="swipe-icon-right">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                
                <!-- Contenuto notifica (quello che si muove) -->
                <div class="notification-content-wrapper">
                    <div class="notification-icon">${icon}</div>
                    <div class="notification-content">
                        <div class="notification-message">
                            <span class="notification-author">${authorName}</span>
                            <span class="notification-action">${action}</span>
                            ${title ? `<span class="notification-title">${title}</span>` : ''}
                        </div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                </div>
                
                <!-- Overlay per staging (nascosto di default) -->
                <div class="staging-overlay" style="display: none;">
                    <div class="staging-content">
                        <span class="staging-text"></span>
                        <span class="staging-countdown"></span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Aggiorna pulsanti footer
    const markAllBtn = document.getElementById('markAllReadBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    
    if (markAllBtn) {
        const hasUnread = notifications.some(n => 
            !n.readBy || !n.readBy.includes(currentUserId)
        );
        markAllBtn.disabled = !hasUnread;
    }
    
    if (deleteAllBtn) {
        deleteAllBtn.disabled = notifications.length === 0;
    }

    // Inizializza swipe gestures per ogni notifica
    initializeSwipeGestures();
}

// ===== PARSING MESSAGGI NOTIFICHE =====

function parseNotificationMessage(message, type) {
    let authorName = '';
    let action = '';
    let title = '';

    switch (type) {
        case 'note':
        case 'note_added':
            // Formato: "Nome ha creato una nuova nota: Titolo"
            const noteMatch = message.match(/^(.+?) ha creato una nuova nota: (.+)$/);
            if (noteMatch) {
                authorName = noteMatch[1];
                action = ' ha creato una nuova nota:';
                title = noteMatch[2];
            }
            break;

        case 'recipe_added':
            // Formato: "Nome ha aggiunto una ricetta: "Titolo""
            const recipeMatch = message.match(/^(.+?) ha aggiunto una ricetta: "(.+)"$/);
            if (recipeMatch) {
                authorName = recipeMatch[1];
                action = ' ha aggiunto una ricetta:';
                title = recipeMatch[2];
            }
            break;

        case 'todo_updated':
            // Formato: "Nome ha modificato la lista todo"
            const todoMatch = message.match(/^(.+?) ha modificato la lista todo$/);
            if (todoMatch) {
                authorName = todoMatch[1];
                action = ' ha modificato la lista todo';
                title = '';
            }
            break;

        case 'user_joined':
            // Formato: "Nome è entrato nel gruppo"
            const joinMatch = message.match(/^(.+?) è entrato nel gruppo$/);
            if (joinMatch) {
                authorName = joinMatch[1];
                action = ' è entrato nel gruppo';
                title = '';
            }
            break;

        case 'user_left':
            // Formato: "Nome ha lasciato il gruppo"
            const leftMatch = message.match(/^(.+?) ha lasciato il gruppo$/);
            if (leftMatch) {
                authorName = leftMatch[1];
                action = ' ha lasciato il gruppo';
                title = '';
            }
            break;

        case 'system':
            // Messaggi di sistema
            authorName = 'Sistema';
            action = '';
            title = message;
            break;

        default:
            // Fallback per messaggi non riconosciuti
            authorName = '';
            action = message;
            title = '';
            break;
    }

    return { authorName, action, title };
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
            
            if (!readBy.includes(currentUserId)) {
                readBy.push(currentUserId);
                return updateDoc(doc(db, 'notifications', docSnap.id), { readBy });
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
    userJoinedAt = null; // Reset anche timestamp ingresso
    
    console.log('🔔 Sistema notifiche distrutto');
}

// ===== SISTEMA SWIPE GESTURES =====

// Variabili per il tracking del swipe
let swipeState = {
    startX: 0,
    currentX: 0,
    startY: 0,
    currentY: 0,
    isDragging: false,
    currentElement: null,
    startTime: 0
};

// Soglie per le azioni
const SWIPE_THRESHOLD = 100; // Distanza minima per attivare l'azione
const PREVIEW_THRESHOLD = 40; // Quando mostrare l'anteprima (aumentato per evitare sovrapposizioni)
const MAX_Y_DRIFT = 50; // Massima deriva verticale per considerarlo swipe orizzontale
const STAGING_DURATION = 4000; // 4 secondi per annullare (solo per eliminazione)

// Mappa per tenere traccia degli staging attivi
const activeStaging = new Map();

// Inizializza gesture per tutte le notifiche
function initializeSwipeGestures() {
    const notificationItems = document.querySelectorAll('.notification-item');
    
    notificationItems.forEach(item => {
        const contentWrapper = item.querySelector('.notification-content-wrapper');
        
        if (contentWrapper) {
            // Eventi touch
            contentWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
            contentWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
            contentWrapper.addEventListener('touchend', handleTouchEnd, { passive: false });
            
            // Eventi mouse per desktop
            contentWrapper.addEventListener('mousedown', handleMouseDown);
            contentWrapper.addEventListener('mousemove', handleMouseMove);
            contentWrapper.addEventListener('mouseup', handleMouseUp);
            contentWrapper.addEventListener('mouseleave', handleMouseUp);
        }
    });
}

// ===== GESTORI EVENTI TOUCH =====

function handleTouchStart(e) {
    const touch = e.touches[0];
    startSwipe(touch.clientX, touch.clientY, e.currentTarget);
}

function handleTouchMove(e) {
    if (!swipeState.isDragging) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    updateSwipe(touch.clientX, touch.clientY);
}

function handleTouchEnd(e) {
    if (!swipeState.isDragging) return;
    endSwipe();
}

// ===== GESTORI EVENTI MOUSE =====

function handleMouseDown(e) {
    startSwipe(e.clientX, e.clientY, e.currentTarget);
}

function handleMouseMove(e) {
    if (!swipeState.isDragging) return;
    updateSwipe(e.clientX, e.clientY);
}

function handleMouseUp(e) {
    if (!swipeState.isDragging) return;
    endSwipe();
}

// ===== LOGICA SWIPE =====

function startSwipe(x, y, element) {
    // Non iniziare swipe se l'elemento è in staging
    const notificationItem = element.closest('.notification-item');
    if (notificationItem && activeStaging.has(notificationItem.dataset.id)) {
        return;
    }

    // Reset pulito dello stato precedente prima di iniziare un nuovo swipe
    if (swipeState.currentElement) {
        const prevNotificationItem = swipeState.currentElement.closest('.notification-item');
        clearSwipeClasses(prevNotificationItem);
    }

    swipeState.startX = x;
    swipeState.currentX = x;
    swipeState.startY = y;
    swipeState.currentY = y;
    swipeState.isDragging = true;
    swipeState.currentElement = element;
    swipeState.startTime = Date.now();

    // Rimuovi transizioni durante il drag
    element.style.transition = 'none';
    
    console.log('🎯 Swipe iniziato con sistema a classi');
}

function updateSwipe(x, y) {
    if (!swipeState.currentElement) return;

    swipeState.currentX = x;
    swipeState.currentY = y;

    const deltaX = x - swipeState.startX;
    const deltaY = Math.abs(y - swipeState.startY);

    // Se c'è troppa deriva verticale, non è uno swipe orizzontale
    if (deltaY > MAX_Y_DRIFT) {
        cancelSwipe();
        return;
    }

    // Applica trasformazione
    const element = swipeState.currentElement;
    const notificationItem = element.closest('.notification-item');

    element.style.transform = `translateX(${deltaX}px)`;
    
    console.log(`🔄 UpdateSwipe: deltaX=${deltaX}, soglia=${PREVIEW_THRESHOLD}`);

    // Gestisci classi per mostrare/nascondere background e icone
    if (Math.abs(deltaX) > PREVIEW_THRESHOLD) {
        if (deltaX > 0) {
            // Swipe verso destra - mostra azione SINISTRA (elimina)
            notificationItem.classList.add('show-left-action');
            notificationItem.classList.remove('show-right-action');
            
            // Debug: verifica che l'icona sia visibile
            const leftIcon = notificationItem.querySelector('.swipe-icon-left');
            const leftBg = notificationItem.querySelector('.swipe-background-left');
            console.log(`✅ SWIPE DESTRA → AZIONE SINISTRA (ELIMINA) - Icona:`, {
                elemento: leftIcon,
                classiNotifica: Array.from(notificationItem.classList),
                opacityIcona: getComputedStyle(leftIcon).opacity,
                opacityBg: getComputedStyle(leftBg).opacity
            });
        } else {
            // Swipe verso sinistra - mostra azione DESTRA (marca come letta)
            notificationItem.classList.add('show-right-action');
            notificationItem.classList.remove('show-left-action');
            
            // Debug: verifica che l'icona sia visibile
            const rightIcon = notificationItem.querySelector('.swipe-icon-right');
            const rightBg = notificationItem.querySelector('.swipe-background-right');
            console.log(`✅ SWIPE SINISTRA → AZIONE DESTRA (LETTA) - Icona:`, {
                elemento: rightIcon,
                classiNotifica: Array.from(notificationItem.classList),
                opacityIcona: getComputedStyle(rightIcon).opacity,
                opacityBg: getComputedStyle(rightBg).opacity
            });
        }
    } else {
        // Rimuovi tutte le classi quando sotto la soglia
        notificationItem.classList.remove('show-left-action', 'show-right-action');
        console.log(`❌ Rimosse tutte le classi di azione per deltaX=${deltaX}`);
    }
}

// Funzione helper per pulire classi swipe
function clearSwipeClasses(notificationItem) {
    notificationItem.classList.remove('show-left-action', 'show-right-action');
    
    // Assicurati che non ci siano stili inline sulle icone che potrebbero interferire
    const leftIcon = notificationItem.querySelector('.swipe-icon-left');
    const rightIcon = notificationItem.querySelector('.swipe-icon-right');
    
    if (leftIcon && leftIcon.hasAttribute('style')) {
        leftIcon.removeAttribute('style');
        console.log('🧹 Rimossi stili inline da icona sinistra');
    }
    if (rightIcon && rightIcon.hasAttribute('style')) {
        rightIcon.removeAttribute('style');
        console.log('🧹 Rimossi stili inline da icona destra');
    }
}

function endSwipe() {
    if (!swipeState.currentElement) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const element = swipeState.currentElement;
    const notificationItem = element.closest('.notification-item');
    const notificationId = notificationItem.dataset.id;

    // Ripristina transizioni
    element.style.transition = 'transform 0.3s ease';

    // Controlla se l'azione deve essere eseguita
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
        if (deltaX > 0) {
            // Swipe verso destra - Elimina (azione sulla sinistra)
            executeAction('delete', notificationId, notificationItem);
        } else {
            // Swipe verso sinistra - Marca come letta (azione sulla destra)
            executeAction('markRead', notificationId, notificationItem);
        }
    } else {
        // Swipe non completato, torna alla posizione originale
        cancelSwipe();
    }

    // Reset stato
    resetSwipeState();
}

function cancelSwipe() {
    if (!swipeState.currentElement) return;

    const element = swipeState.currentElement;
    const notificationItem = element.closest('.notification-item');

    element.style.transition = 'transform 0.3s ease';
    element.style.transform = 'translateX(0)';
    
    // Rimuovi classi di azione
    clearSwipeClasses(notificationItem);

    resetSwipeState();
}

function resetSwipeState() {
    if (swipeState.currentElement) {
        const notificationItem = swipeState.currentElement.closest('.notification-item');
        clearSwipeClasses(notificationItem);
        
        // Ripristina stile transizione dopo un breve ritardo
        setTimeout(() => {
            if (swipeState.currentElement) {
                swipeState.currentElement.style.transition = '';
            }
        }, 300);
    }

    swipeState.isDragging = false;
    swipeState.currentElement = null;
    swipeState.startX = 0;
    swipeState.currentX = 0;
    swipeState.startY = 0;
    swipeState.currentY = 0;
    swipeState.startTime = 0;
}

// ===== ESECUZIONE AZIONI =====

function executeAction(action, notificationId, notificationItem) {
    if (action === 'delete') {
        startDeleteStaging(notificationId, notificationItem);
    } else if (action === 'markRead') {
        startMarkReadStaging(notificationId, notificationItem);
    }
}

function startDeleteStaging(notificationId, notificationItem) {
    const contentWrapper = notificationItem.querySelector('.notification-content-wrapper');
    const stagingOverlay = notificationItem.querySelector('.staging-overlay');
    const stagingText = stagingOverlay.querySelector('.staging-text');
    const stagingCountdown = stagingOverlay.querySelector('.staging-countdown');

    // Configura UI staging
    contentWrapper.style.transform = 'translateX(0)';
    contentWrapper.style.opacity = '0.5';
    contentWrapper.style.filter = 'grayscale(1)';
    
    stagingOverlay.style.display = 'flex';
    stagingText.textContent = 'Notifica nascosta. Tocca per annullare.';

    let countdown = 4;
    stagingCountdown.textContent = countdown;

    // Timer con countdown
    const countdownInterval = setInterval(() => {
        countdown--;
        stagingCountdown.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            confirmDeleteNotification(notificationId);
        }
    }, 1000);

    // Gestione click per annullare
    const cancelHandler = () => {
        clearInterval(countdownInterval);
        cancelStaging(notificationId, notificationItem);
    };

    notificationItem.addEventListener('click', cancelHandler, { once: true });

    // Salva riferimenti per cleanup
    activeStaging.set(notificationId, {
        type: 'delete',
        interval: countdownInterval,
        cancelHandler: cancelHandler,
        notificationItem: notificationItem
    });
}

function startMarkReadStaging(notificationId, notificationItem) {
    // Per "marca come letto" eseguiamo l'azione immediatamente
    // senza countdown ma con feedback visivo temporaneo
    
    const contentWrapper = notificationItem.querySelector('.notification-content-wrapper');
    const stagingOverlay = notificationItem.querySelector('.staging-overlay');
    const stagingText = stagingOverlay.querySelector('.staging-text');
    const stagingCountdown = stagingOverlay.querySelector('.staging-countdown');

    // Configura UI feedback immediato
    contentWrapper.style.transform = 'translateX(0)';
    contentWrapper.style.opacity = '0.7';
    
    stagingOverlay.style.display = 'flex';
    stagingText.textContent = 'Notifica marcata come letta';
    stagingCountdown.textContent = '✓'; // Mostra spunta invece del countdown

    // Esegui immediatamente l'azione
    confirmMarkAsRead(notificationId);

    // Nascondi il feedback dopo 1.5 secondi
    setTimeout(() => {
        if (stagingOverlay) {
            stagingOverlay.style.display = 'none';
            contentWrapper.style.transform = '';
            contentWrapper.style.opacity = '';
        }
    }, 1500);

    console.log(`✅ Notifica ${notificationId} marcata come letta immediatamente`);
}

function cancelStaging(notificationId, notificationItem) {
    const staging = activeStaging.get(notificationId);
    if (!staging) return;

    // Cleanup timer
    clearInterval(staging.interval);
    activeStaging.delete(notificationId);

    // Ripristina UI
    const contentWrapper = notificationItem.querySelector('.notification-content-wrapper');
    const stagingOverlay = notificationItem.querySelector('.staging-overlay');

    contentWrapper.style.transform = '';
    contentWrapper.style.opacity = '';
    contentWrapper.style.filter = '';
    stagingOverlay.style.display = 'none';

    console.log(`🔄 Staging annullato per notifica ${notificationId}`);
}

// ===== CONFERMA AZIONI =====

async function confirmDeleteNotification(notificationId) {
    try {
        // Invece di eliminare, nascondi la notifica per l'utente corrente
        const notificationRef = doc(db, 'notifications', notificationId);
        const notificationDoc = await getDocs(query(collection(db, 'notifications'), where('__name__', '==', notificationId)));
        
        if (!notificationDoc.empty) {
            const notification = notificationDoc.docs[0].data();
            const hiddenBy = notification.hiddenBy || [];
            
            // Aggiungi l'utente corrente alla lista di chi ha nascosto la notifica
            if (!hiddenBy.includes(currentUserId)) {
                hiddenBy.push(currentUserId);
                await updateDoc(notificationRef, { hiddenBy });
                
                console.log(`👁️‍�️ Notifica ${notificationId} nascosta per ${currentUserId}`);
                
                // Verifica se tutti i membri del gruppo hanno nascosto la notifica
                await checkAndCleanupNotification(notificationId, hiddenBy);
            }
        }
        
        activeStaging.delete(notificationId);
    } catch (error) {
        console.error('❌ Errore nel nascondere notifica:', error);
        // In caso di errore, ripristina lo staging
        const staging = activeStaging.get(notificationId);
        if (staging) {
            cancelStaging(notificationId, staging.notificationItem);
        }
    }
}

// ===== PULIZIA AUTOMATICA NOTIFICHE =====
async function checkAndCleanupNotification(notificationId, hiddenBy) {
    try {
        // Per determinare se eliminare fisicamente, consideriamo solo i membri
        // che erano presenti quando la notifica è stata creata
        
        // Prima ottieni la notifica specifica per controllare il suo timestamp
        const notificationRef = doc(db, 'notifications', notificationId);
        const notificationSnap = await getDocs(query(collection(db, 'notifications'), where('__name__', '==', notificationId)));
        
        if (notificationSnap.empty) {
            console.log('🔍 Notifica non trovata per cleanup');
            return;
        }
        
        const notificationData = notificationSnap.docs[0].data();
        const notificationTimestamp = notificationData.timestamp?.toDate();
        
        if (!notificationTimestamp) {
            console.log('🔍 Notifica senza timestamp, skip cleanup');
            return;
        }
        
        // Ottieni tutti i membri che erano presenti al momento della notifica
        const groupMembersQuery = query(
            collection(db, 'notifications'),
            where('groupId', '==', currentUserGroup)
        );
        
        const groupNotifications = await getDocs(groupMembersQuery);
        const relevantMembers = new Set();
        
        // Raccogli utenti che hanno interagito CON NOTIFICHE PRECEDENTI O CONTEMPORANEE
        groupNotifications.forEach(doc => {
            const data = doc.data();
            const docTimestamp = data.timestamp?.toDate();
            
            // Considera solo utenti che erano già attivi quando questa notifica è stata creata
            if (docTimestamp && docTimestamp <= notificationTimestamp) {
                if (data.authorId) {
                    relevantMembers.add(data.authorId);
                }
                // Utenti che hanno letto/nascosto notifiche precedenti
                if (data.readBy) {
                    data.readBy.forEach(userId => relevantMembers.add(userId));
                }
                if (data.hiddenBy) {
                    data.hiddenBy.forEach(userId => relevantMembers.add(userId));
                }
            }
        });
        
        const totalRelevantMembers = relevantMembers.size;
        
        console.log(`🔍 Controllo pulizia intelligente: ${hiddenBy.length}/${totalRelevantMembers} membri rilevanti hanno nascosto la notifica`);
        console.log(`👥 Membri rilevanti:`, Array.from(relevantMembers));
        
        // Se tutti i membri RILEVANTI hanno nascosto la notifica, eliminala fisicamente
        if (hiddenBy.length >= totalRelevantMembers && totalRelevantMembers > 0) {
            await deleteDoc(doc(db, 'notifications', notificationId));
            console.log(`🧹 Notifica ${notificationId} eliminata fisicamente: tutti i ${totalRelevantMembers} membri rilevanti l'hanno nascosta`);
        }
    } catch (error) {
        console.error('❌ Errore nella verifica pulizia notifica:', error);
    }
}

async function confirmMarkAsRead(notificationId) {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        const notificationDoc = await getDocs(query(collection(db, 'notifications'), where('__name__', '==', notificationId)));
        
        if (!notificationDoc.empty) {
            const notification = notificationDoc.docs[0].data();
            const readBy = notification.readBy || [];
            
            if (!readBy.includes(currentUserId)) {
                readBy.push(currentUserId);
                await updateDoc(notificationRef, { readBy });
            }
        }

        activeStaging.delete(notificationId);
        console.log(`✅ Notifica ${notificationId} marcata come letta definitivamente`);
    } catch (error) {
        console.error('❌ Errore nel marcare come letta:', error);
        // In caso di errore, ripristina lo staging
        const staging = activeStaging.get(notificationId);
        if (staging) {
            cancelStaging(notificationId, staging.notificationItem);
        }
    }
}

// ===== FUNZIONE NASCONDI TUTTE LE NOTIFICHE =====
export async function deleteAllNotifications() {
    if (!currentUserId || !currentUserGroup) {
        console.warn('⚠️ Informazioni utente/gruppo mancanti per nascondere tutte le notifiche');
        return;
    }

    // Conferma prima di nascondere tutto
    if (!confirm('Sei sicuro di voler nascondere tutte le notifiche? Potrai sempre vedere quelle nuove.')) {
        return;
    }

    const deleteBtn = document.getElementById('deleteAllBtn');
    const originalText = deleteBtn ? deleteBtn.textContent : '';

    try {
        // Feedback visivo durante l'operazione
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Nascondendo...';
        }

        const notificationsRef = collection(db, 'notifications');
        
        // Ottieni tutte le notifiche del gruppo che non sono ancora nascoste dall'utente corrente
        const q = query(
            notificationsRef,
            where('groupId', '==', currentUserGroup)
        );

        const querySnapshot = await getDocs(q);
        
        // Filtra solo le notifiche visibili all'utente corrente
        const visibleNotifications = querySnapshot.docs.filter(docSnap => {
            const notification = docSnap.data();
            const hiddenBy = notification.hiddenBy || [];
            // Deve essere visibile: non creata dall'utente E non già nascosta
            return notification.authorId !== currentUserId && !hiddenBy.includes(currentUserId);
        });
        
        if (visibleNotifications.length === 0) {
            console.log('📭 Nessuna notifica visibile da nascondere');
            
            // Feedback per utente
            if (deleteBtn) {
                deleteBtn.textContent = 'Nessuna da nascondere';
                setTimeout(() => {
                    deleteBtn.textContent = originalText;
                    deleteBtn.disabled = true;
                }, 2000);
            }
            return;
        }

        // Nascondi tutte le notifiche visibili aggiungendo l'utente a hiddenBy
        const hidePromises = visibleNotifications.map(async (docSnap) => {
            const notification = docSnap.data();
            const hiddenBy = notification.hiddenBy || [];
            
            if (!hiddenBy.includes(currentUserId)) {
                hiddenBy.push(currentUserId);
                await updateDoc(doc(db, 'notifications', docSnap.id), { hiddenBy });
                
                // Controlla se può essere pulita fisicamente
                await checkAndCleanupNotification(docSnap.id, hiddenBy);
            }
        });

        await Promise.all(hidePromises);
        
        console.log(`�️‍🗨️ Nascoste ${visibleNotifications.length} notifiche per l'utente corrente`);
        
        // Feedback successo
        if (deleteBtn) {
            deleteBtn.textContent = 'Nascoste!';
            setTimeout(() => {
                deleteBtn.textContent = originalText;
                // Il pulsante sarà disabilitato automaticamente quando non ci sono più notifiche visibili
            }, 2000);
        }

    } catch (error) {
        console.error('❌ Errore nel nascondere le notifiche:', error);
        
        // Feedback errore
        if (deleteBtn) {
            deleteBtn.textContent = 'Errore!';
            setTimeout(() => {
                deleteBtn.textContent = originalText;
                deleteBtn.disabled = false;
            }, 2000);
        }
        
        alert('Errore durante il nascondimento delle notifiche. Riprova.');
    }
}

// ===== FUNZIONI GLOBALI PER LA UI =====
window.initializeSwipeGestures = initializeSwipeGestures;
window.deleteAllNotifications = deleteAllNotifications;
