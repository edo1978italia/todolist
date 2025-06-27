// ===== GROUP SETUP LOGIC =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import firebaseConfig from "./config.js";

console.log("[GROUP-SETUP] Inizializzazione...");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== FUNZIONI HELPER =====

// 🔔 Funzione helper per creare notifica di ingresso nel gruppo
async function createJoinNotification(groupId, userName, userId) {
  try {
    await addDoc(collection(db, 'notifications'), {
      type: 'user_joined',
      message: `${userName} è entrato nel gruppo`,
      authorId: userId,
      authorName: userName,
      groupId: groupId,
      timestamp: serverTimestamp(),
      readBy: [], 
      hiddenBy: [],
      replaceKey: `user_joined_${userId}_${Date.now()}`
    });
    console.log(`🔔 Notifica di ingresso creata per ${userName}`);
  } catch (error) {
    console.error('❌ Errore nella creazione notifica di ingresso:', error);
  }
}

// 🎭 Helper per impostare nickname se mancante
async function ensureNickname(user) {
  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();
  
  let updateData = {};
  let needsUpdate = false;
  
  // Se l'utente non ha nickname, impostalo con il firstName
  if (!userData?.nickname && userData?.firstName) {
    updateData.nickname = userData.firstName;
    needsUpdate = true;
    console.log(`🎭 Impostato nickname "${userData.firstName}" per l'utente`);
  }
  
  return { userData, updateData, needsUpdate };
}

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', () => {
  console.log("[GROUP-SETUP] DOM caricato, attivazione listeners...");

  // 🔓 Logout button
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    console.log("🔘 Pulsante logout trovato nel DOM");
    logoutButton.addEventListener("click", () => {
      console.log("📤 Logout richiesto dall'utente");
      signOut(auth)
        .then(() => {
          console.log("✅ Logout riuscito — redirect in corso");
          window.location.href = "index.html";
        })
        .catch((error) => {
          console.error("❌ Errore durante il logout:", error);
          alert("Errore durante il logout. Riprova.");
        });
    });
  } else {
    console.warn("⚠️ Logout button non trovato nel DOM");
  }

  // 🔑 Join existing group
  const joinBtn = document.getElementById("joinBtn");
  if (joinBtn) {
    joinBtn.addEventListener("click", async () => {
      console.log("🔗 Join button cliccato");
      
      const code = document.getElementById("inviteCode").value.trim();
      if (!code) return alert("Please enter an invite code.");

      try {
        // Verifica codice invito
        const querySnap = await getDoc(doc(db, "inviteCodes", code));
        if (!querySnap.exists()) return alert("Invalid invite code.");

        const groupId = querySnap.data().groupId;
        const user = auth.currentUser;
        if (!user) return alert("User not authenticated.");

        console.log(`🔗 Ingresso nel gruppo ${groupId} per utente ${user.uid}`);

        // 🎭 Verifica e imposta nickname se mancante
        const { userData, updateData: nicknameData, needsUpdate } = await ensureNickname(user);
        
        // Dati per l'aggiornamento utente
        const updateData = { 
          groupId,
          groupJoinedAt: serverTimestamp(),
          ...nicknameData
        };

        // Aggiorna l'utente
        await updateDoc(doc(db, "users", user.uid), updateData);
        console.log("✅ Utente aggiornato con groupId e nickname");

        // 🔔 Crea notifica di ingresso nel gruppo usando nickname o firstName
        const displayName = userData?.nickname || nicknameData?.nickname || userData?.firstName || userData?.displayName || "Nuovo utente";
        await createJoinNotification(groupId, displayName, user.uid);

        console.log("✅ Ingresso nel gruppo completato con successo");
        window.location.href = "index.html";
        
      } catch (error) {
        console.error("❌ Errore durante l'ingresso nel gruppo:", error);
        alert("Errore durante l'ingresso nel gruppo. Riprova.");
      }
    });
  } else {
    console.warn("⚠️ Join button non trovato nel DOM");
  }

  // ✳️ Create new group
  const createBtn = document.getElementById("createBtn");
  if (createBtn) {
    createBtn.addEventListener("click", async () => {
      console.log("🟢 Create button cliccato");

      const name = document.getElementById("groupName").value.trim();
      const user = auth.currentUser;
      if (!user) return alert("User not authenticated.");

      const groupId = crypto.randomUUID().slice(0, 8);
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      try {
        console.log(`🆕 Creazione nuovo gruppo ${groupId} con codice ${inviteCode}`);

        // Crea il gruppo
        await setDoc(doc(db, "groups", groupId), {
          createdBy: user.uid,
          name: name || `Group ${groupId}`,
          inviteCode,
          createdAt: serverTimestamp()
        });

        // Crea il codice invito
        await setDoc(doc(db, "inviteCodes", inviteCode), { groupId });

        // 🎭 Verifica e imposta nickname se mancante
        const { updateData: nicknameData } = await ensureNickname(user);
        
        // Assegna il gruppo all'utente
        const updateData = { 
          groupId,
          groupJoinedAt: serverTimestamp(),
          ...nicknameData
        };

        await updateDoc(doc(db, "users", user.uid), updateData);

        console.log("✅ Gruppo creato con successo:", groupId);
        alert(`Gruppo creato! Codice invito: ${inviteCode}`);
        window.location.href = "index.html";
        
      } catch (error) {
        console.error("❌ Errore durante la creazione del gruppo:", error);
        alert("Errore durante la creazione del gruppo. Riprova.");
      }
    });
  } else {
    console.warn("⚠️ Create button non trovato nel DOM");
  }
});

console.log("[GROUP-SETUP] Script caricato completamente");
