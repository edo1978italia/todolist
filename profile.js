
import firebaseConfig from "./config.js";

console.log("[log] Inizio esecuzione profile.js");

try {
  firebase.initializeApp(firebaseConfig);
  console.log("[✓] Firebase inizializzato");
} catch (error) {
  console.error("[!] Errore inizializzazione Firebase:", error);
}










// 🔥 Gestione logout (versione più sicura)
async function logoutUser() {
  try {
    await auth.signOut();
    localStorage.clear();
    console.log("✅ Logout completato, utente disconnesso!");

    setTimeout(() => {
      if (!auth.currentUser) {
        console.log("✅ Conferma: utente disconnesso.");
        window.location.href = "index.html";
      } else {
        console.warn("⚠ L'utente risulta ancora autenticato, ricarico la pagina.");
        window.location.reload();
      }
    }, 1000);
  } catch (error) {
    console.error("❌ Errore nel logout:", error);
    alert("Errore nel logout: " + error.message);
  }
}


// 🔥 Registra il pulsante logout al caricamento della pagina
document.addEventListener("DOMContentLoaded", function () {
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", logoutUser);
    console.log("✅ Pulsante logout registrato correttamente!");
  } else {
    console.warn("⚠ Pulsante logout non trovato!");
  }
});

window.logoutUser = logoutUser;






document.addEventListener("DOMContentLoaded", function () {
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", logoutUser);
    console.log("✅ Pulsante logout registrato correttamente!");
  } else {
    console.warn("⚠ Pulsante logout non trovato!");
  }
});

const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  console.log("[log] DOM completamente caricato");

  const emailEl = document.getElementById("userEmail");
  const avatarEl = document.getElementById("avatarPreview");
  const nameEl = document.getElementById("displayName");
  const uploadBtn = document.getElementById("upload_widget");
  const saveBtn = document.getElementById("saveProfile");
  const backBtn = document.getElementById("goBackButton");

  backBtn.addEventListener("click", () => {
    console.log("[log] Tasto 'Back' premuto");
    if (document.referrer && !document.referrer.includes("profile.html")) {
      history.back();
    } else {
      window.location.href = "index.html";
    }
  });

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      console.warn("[!] Nessun utente autenticato");
      return;
    }

    console.log("[✓] Utente autenticato:", user.email);
    emailEl.textContent = user.email;

    const userRef = db.collection("users").doc(user.uid);
    console.log("[log] Tentativo lettura dati utente da Firestore...");

    try {
      const snap = await userRef.get();
      const data = snap.data();
      console.log("[✓] Documento Firestore letto:", data);

      if (data?.displayName) {
        nameEl.value = data.displayName;
        console.log("[✓] Nome visualizzato:", data.displayName);
      }

      if (data?.photoURL) {
        avatarEl.src = data.photoURL;
        console.log("[✓] Avatar caricato:", data.photoURL);
      }
    } catch (e) {
      console.error("[!] Errore lettura dati utente:", e);
    }

    console.log("[log] Inizializzazione Cloudinary...");

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
          console.error("[!] Errore nel widget Cloudinary:", err);
          return;
        }

        if (result?.event === "success") {
          const imageUrl = result.info.secure_url;
          console.log("[✓] Upload riuscito:", imageUrl);

          avatarEl.src = imageUrl;

          try {
            await userRef.set({ photoURL: imageUrl, email: user.email }, { merge: true });
            console.log("[✓] Foto salvata su Firestore e email registrata");

            await user.updateProfile({ photoURL: imageUrl });
            console.log("[✓] Foto sincronizzata in auth.currentUser:", user.photoURL);

            alert("✅ Foto aggiornata!");
          } catch (e) {
            console.error("[!] Errore salvataggio foto su Firestore:", e);
          }
        }
      }
    );

    uploadBtn.addEventListener("click", () => {
      console.log("[log] Bottone 📷 cliccato → apertura widget...");
      widget.open();
    });

    saveBtn.addEventListener("click", async () => {
      console.log("[log] Bottone Save cliccato");

      const newName = nameEl.value.trim();
      if (!newName) {
        console.warn("[!] Nome non valido o vuoto");
        alert("⚠️ Inserisci un nome valido.");
        return;
      }

      console.log("[log] Nome da salvare:", newName);

      try {
        await userRef.set({ displayName: newName, email: user.email }, { merge: true });
        console.log("[✓] Nome salvato su Firestore");

        await user.updateProfile({ displayName: newName });
        console.log("[✓] Nome sincronizzato in auth.currentUser:", user.displayName);

        alert("✅ Nome aggiornato!");
      } catch (e) {
        console.error("[!] Errore durante il salvataggio del nome:", e);
      }
    });
  });
});

// 🔁 Caricamento dinamico della sidebar
const sidebarContainer = document.createElement("div");
sidebarContainer.id = "sidebar-container";
document.body.insertBefore(sidebarContainer, document.getElementById("profile-container"));

fetch("sidebar.html")
  .then((res) => res.text())
  .then((html) => {
    sidebarContainer.innerHTML = html;
    console.log("[✓] Sidebar inserita nel DOM");

    requestAnimationFrame(() => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "sidebar.js";
      script.onload = () => {
        console.log("[✓] sidebar.js caricato correttamente");
        if (typeof aggiornaEmail === "function") aggiornaEmail();
      };
      document.body.appendChild(script);
    });
  })
  .catch((err) => {
    console.error("❌ Errore nel caricamento della sidebar:", err);
  });

// 🌐 Navigazione e apertura sidebar
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
