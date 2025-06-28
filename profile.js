import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import firebaseConfig from "./config.js";

console.log("[log] Inizio esecuzione profile.js");

// ✅ Inizializzazione Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("[✓] Firebase inizializzato");

// 🔄 Funzione globale per aggiornare tutti gli avatar dell'utente corrente
window.updateAllUserAvatars = function(newAvatarUrl) {
  console.log("🔄 Aggiornando tutti gli avatar utente a:", newAvatarUrl);
  
  // 1. Avatar nella sidebar (presente in tutte le pagine)
  const sidebarAvatar = document.getElementById("userAvatar");
  if (sidebarAvatar) {
    sidebarAvatar.src = newAvatarUrl;
    console.log("✅ Avatar sidebar aggiornato");
  }
  
  // 2. Avatar nel profilo (se presente)
  const profileAvatar = document.getElementById("avatarPreview");
  if (profileAvatar) {
    profileAvatar.src = newAvatarUrl;
    console.log("✅ Avatar profilo aggiornato");
  }
  
  // 3. Invia messaggio a tutte le finestre/tab aperte per sincronizzare
  try {
    localStorage.setItem("userAvatarUpdated", JSON.stringify({
      url: newAvatarUrl,
      timestamp: Date.now()
    }));
    console.log("✅ Avatar sincronizzato via localStorage");
  } catch (e) {
    console.warn("⚠️ Errore sync localStorage:", e);
  }
};

// 🔄 Funzione per aggiornare tutti gli avatar nelle note dell'utente
async function updateUserNotesAvatars(userId, newAvatarUrl) {
  console.log("🔄 Aggiornando avatar in tutte le note dell'utente:", userId);
  
  try {
    // Trova tutte le note create dall'utente
    const notesQuery = query(
      collection(db, "notes"),
      where("createdBy.uid", "==", userId)
    );
    
    const notesSnapshot = await getDocs(notesQuery);
    
    if (notesSnapshot.empty) {
      console.log("📝 Nessuna nota trovata per l'utente");
      return;
    }
    
    // Usa batch per aggiornare tutte le note in una transazione
    const batch = writeBatch(db);
    let updateCount = 0;
    
    notesSnapshot.forEach((noteDoc) => {
      const noteRef = doc(db, "notes", noteDoc.id);
      batch.update(noteRef, {
        "createdBy.photoURL": newAvatarUrl
      });
      updateCount++;
    });
    
    // Esegui tutti gli aggiornamenti
    await batch.commit();
    console.log(`✅ Aggiornate ${updateCount} note con il nuovo avatar`);
    
    return updateCount;
  } catch (error) {
    console.error("❌ Errore nell'aggiornamento avatar note:", error);
    throw error;
  }
}

// 🔄 Listener per sincronizzazione tra tab/finestre
window.addEventListener('storage', (e) => {
  if (e.key === 'userAvatarUpdated' && e.newValue) {
    try {
      const data = JSON.parse(e.newValue);
      console.log("🔄 Ricevuto aggiornamento avatar da altra tab:", data.url);
      
      // Aggiorna avatar in questa pagina
      const sidebarAvatar = document.getElementById("userAvatar");
      if (sidebarAvatar) {
        sidebarAvatar.src = data.url;
      }
      
      const profileAvatar = document.getElementById("avatarPreview");
      if (profileAvatar) {
        profileAvatar.src = data.url;
      }
    } catch (err) {
      console.warn("⚠️ Errore parsing avatar update:", err);
    }
  }
});

// �🔒 Protezione accesso: login + groupId
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    console.warn("🔐 Nessun utente — redirect");
    window.location.href = "index.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    console.error("❌ Documento utente assente — logout forzato");
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    await signOut(auth);
    window.location.href = "index.html";
    return;
  }

  const data = snap.data();
  if (!data.groupId || data.groupId.trim() === "") {
    console.warn("🚫 Nessun groupId — redirect a group-setup.html");
    window.location.href = "group-setup.html";
    return;
  }

  console.log("✅ Accesso autorizzato con groupId:", data.groupId);
  document.getElementById("mainContainer").style.display = "block";
});

// 🔁 Caricamento UI
document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("userEmail");
  const avatarEl = document.getElementById("avatarPreview");
  const nameEl = document.getElementById("displayName");
  const uploadBtn = document.getElementById("upload_widget");
  const saveBtn = document.getElementById("saveProfile");

  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    // Email ora letta da Firestore (users collection)
    const userRef = doc(db, "users", user.uid);
    try {
      const snap = await getDoc(userRef);
      const data = snap.data();
      if (emailEl) emailEl.textContent = data?.email || "—";
      // Nickname
      if (nameEl) nameEl.value = data?.nickname || "";
      // Avatar
      if (avatarEl) avatarEl.src = data?.photoURL || "icone/default-avatar.png";
      // Name
      const firstNameEl = document.getElementById("firstName");
      if (firstNameEl) firstNameEl.textContent = data?.firstName || "—";
      // Last Name
      const lastNameEl = document.getElementById("lastName");
      if (lastNameEl) lastNameEl.textContent = data?.lastName || "—";
      // Country
      const countryEl = document.getElementById("country");
      if (countryEl) countryEl.textContent = data?.country || "—";
      // Group Name
      const groupNameEl = document.getElementById("userGroupName");
      if (groupNameEl) {
        if (data?.groupId) {
          try {
            const groupSnap = await getDoc(doc(db, "groups", data.groupId));
            groupNameEl.textContent = groupSnap.exists() ? groupSnap.data().name : data.groupId;
          } catch (e) {
            groupNameEl.textContent = data.groupId;
          }
        } else {
          groupNameEl.textContent = "—";
        }
      }
      // Invite Code
      const userGroupEl = document.getElementById("userGroup");
      if (userGroupEl) {
        if (data?.groupId) {
          try {
            const groupSnap = await getDoc(doc(db, "groups", data.groupId));
            userGroupEl.textContent = groupSnap.exists() && groupSnap.data().inviteCode ? groupSnap.data().inviteCode : data.groupId;
          } catch (e) {
            userGroupEl.textContent = data.groupId;
          }
        } else {
          userGroupEl.textContent = "—";
        }
      }
      // Birthdate
      const birthdateEl = document.getElementById("birthdate");
      if (birthdateEl) {
        if (data?.birthDate) {
          let birthdateStr = data.birthDate;
          if (/^\d{4}-\d{2}-\d{2}/.test(birthdateStr)) {
            const [y, m, d] = birthdateStr.split("-");
            birthdateStr = `${d}/${m}/${y}`;
          } else if (typeof birthdateStr === "object" && birthdateStr.toDate) {
            const dateObj = birthdateStr.toDate();
            birthdateStr = dateObj.toLocaleDateString("it-IT");
          }
          birthdateEl.textContent = birthdateStr;
        } else {
          birthdateEl.textContent = "—";
        }
      }
    } catch (e) {
      console.error("Errore lettura dati utente:", e);
    }

    const widget = cloudinary.createUploadWidget(
      {
        cloudName: "dpj6s7xvh",
        uploadPreset: "avatar_unsigned",
        cropping: true,
        multiple: false,
        folder: "avatars"
      },
      async (err, result) => {
        if (err) {
          console.error("Widget Cloudinary errore:", err);
          return;
        }

        if (result?.event === "success") {
          const imageUrl = result.info.secure_url;
          avatarEl.src = imageUrl;

          try {
            await updateDoc(userRef, { photoURL: imageUrl, email: user.email });
            const { updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
            await updateProfile(user, { photoURL: imageUrl });
            
            // 🔄 Aggiorna tutti gli avatar dell'utente nell'app
            if (typeof window.updateAllUserAvatars === 'function') {
              window.updateAllUserAvatars(imageUrl);
            }
            
            // 🔄 Aggiorna anche tutte le note dell'utente
            console.log("🔄 Avvio aggiornamento avatar nelle note...");
            const updatedNotes = await updateUserNotesAvatars(user.uid, imageUrl);
            
            alert(`✅ Foto aggiornata!\n📝 Aggiornate anche ${updatedNotes} note esistenti.`);
          } catch (e) {
            console.error("Errore salvataggio foto:", e);
            alert("❌ Errore nel salvataggio: " + e.message);
          }
        }
      }
    );

    uploadBtn.addEventListener("click", () => {
      widget.open();
    });

    saveBtn.addEventListener("click", async () => {
      const newName = nameEl.value.trim();
      if (!newName) {
        alert("⚠️ Inserisci un nome valido.");
        return;
      }
      try {
        await updateDoc(userRef, {
          nickname: newName,
          email: user.email
        });
        const { updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
        await updateProfile(user, { displayName: newName });
        alert("✅ Profilo aggiornato!");
      } catch (e) {
        console.error("Errore salvataggio profilo:", e);
      }
    });
  });
});

// 🔓 Logout sicuro
async function logoutUser() {
  try {
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    await signOut(auth);
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

//  Carica sidebar dinamica
const sidebarContainer = document.createElement("div");
sidebarContainer.id = "sidebar-container";
document.body.insertBefore(sidebarContainer, document.getElementById("profile-container"));

fetch("sidebar.html")
  .then((res) => res.text())
  .then((html) => {
    sidebarContainer.innerHTML = html;
    requestAnimationFrame(() => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "sidebar.js";
      script.onload = () => {
        if (typeof aggiornaEmail === "function") aggiornaEmail();
      };
      document.body.appendChild(script);
    });
  })
  .catch((err) => {
    console.error("Errore sidebar:", err);
  });

// 📦 Supporto funzioni globali
window.toggleSidebar = function () {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    const isVisible = sidebar.style.left === "0px";
    sidebar.style.left = isVisible ? "-350px" : "0px";
  }
};

window.navigateTo = function (page) {
  window.location.href = page;
};

window.aggiornaEmail = function () {
  const userEmailElement = document.getElementById("userEmail");
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("openSidebar");

  auth.onAuthStateChanged((user) => {
    if (user && userEmailElement) {
      userEmailElement.innerText = user.email;
      if (sidebar) sidebar.style.display = "block";
      if (toggleBtn) toggleBtn.style.display = "block";
    } else {
      if (userEmailElement) userEmailElement.innerText = "Non autenticato";
      if (sidebar) sidebar.style.display = "none";
      if (toggleBtn) toggleBtn.style.display = "none";
    }
  });
};
