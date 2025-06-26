import firebaseConfig from "./config.js";

console.log("[log] Inizio esecuzione profile.js");

// ✅ Inizializzazione Firebase (modular compat)
try {
  firebase.initializeApp(firebaseConfig);
  console.log("[✓] Firebase inizializzato");
} catch (error) {
  console.error("[!] Errore inizializzazione Firebase:", error);
}

const auth = firebase.auth();
const db = firebase.firestore();

// 🔒 Protezione accesso: login + groupId
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    console.warn("🔐 Nessun utente — redirect");
    window.location.href = "index.html";
    return;
  }

  const userRef = db.collection("users").doc(user.uid);
  const snap = await userRef.get();

  if (!snap.exists) {
    console.error("❌ Documento utente assente — logout forzato");
    await auth.signOut();
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
    const userRef = db.collection("users").doc(user.uid);
    try {
      const snap = await userRef.get();
      const data = snap.data();
      if (emailEl) emailEl.textContent = data?.email || "—";
      // Nickname
      if (nameEl) nameEl.value = data?.displayName || "";
      // Avatar
      if (avatarEl) avatarEl.src = data?.photoURL || "/todolist/img/default-avatar.png";
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
            const groupSnap = await db.collection("groups").doc(data.groupId).get();
            groupNameEl.textContent = groupSnap.exists ? groupSnap.data().name : data.groupId;
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
            const groupSnap = await db.collection("groups").doc(data.groupId).get();
            userGroupEl.textContent = groupSnap.exists && groupSnap.data().inviteCode ? groupSnap.data().inviteCode : data.groupId;
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
            await userRef.set({ photoURL: imageUrl, email: user.email }, { merge: true });
            await user.updateProfile({ photoURL: imageUrl });
            alert("✅ Foto aggiornata!");
          } catch (e) {
            console.error("Errore salvataggio foto:", e);
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
        await userRef.set({
          displayName: newName,
          email: user.email
        }, { merge: true });
        await user.updateProfile({ displayName: newName });
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

  firebase.auth().onAuthStateChanged((user) => {
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
