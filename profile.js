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

    emailEl.textContent = user.email;
    const userRef = db.collection("users").doc(user.uid);

    try {
      const snap = await userRef.get();
      const data = snap.data();

      if (data?.displayName) nameEl.value = data.displayName;
      if (data?.photoURL) avatarEl.src = data.photoURL;
      if (data?.firstName) document.getElementById("firstName").textContent = data.firstName;
      if (data?.lastName) document.getElementById("lastName").textContent = data.lastName;
      // Country sotto Last Name
      if (data?.country) {
        document.getElementById("country").textContent = data.country;
      } else {
        document.getElementById("country").textContent = "—";
      }
      // Group sotto Email
      if (data?.groupId) {
        try {
          const groupSnap = await db.collection("groups").doc(data.groupId).get();
          if (groupSnap.exists) {
            document.getElementById("userGroup").textContent = groupSnap.data().name || data.groupId;
          } else {
            document.getElementById("userGroup").textContent = data.groupId;
          }
        } catch (e) {
          document.getElementById("userGroup").textContent = data.groupId;
        }
      } else {
        document.getElementById("userGroup").textContent = "—";
      }
      if (data?.birthDate) {
        // Prova a formattare la data se è in formato ISO o timestamp
        let birthdateStr = data.birthDate;
        console.log('[DEBUG] birthDate raw:', birthdateStr);
        if (/^\d{4}-\d{2}-\d{2}/.test(birthdateStr)) {
          // Formato YYYY-MM-DD
          const [y, m, d] = birthdateStr.split("-");
          birthdateStr = `${d}/${m}/${y}`;
        } else if (typeof birthdateStr === "object" && birthdateStr.toDate) {
          // Firestore Timestamp
          const dateObj = birthdateStr.toDate();
          birthdateStr = dateObj.toLocaleDateString("it-IT");
        }
        document.getElementById("birthdate").textContent = birthdateStr;
      } else {
        document.getElementById("birthdate").textContent = "—";
        console.warn('[DEBUG] Nessun campo birthDate trovato per questo utente');
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
