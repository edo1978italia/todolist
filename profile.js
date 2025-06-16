import firebaseConfig from "./config.js";

console.log("[log] Inizio esecuzione profile.js");

try {
  firebase.initializeApp(firebaseConfig);
  console.log("[✓] Firebase inizializzato");
} catch (error) {
  console.error("[!] Errore inizializzazione Firebase:", error);
}

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

    const widget = cloudinary.createUploadWidget({
      cloudName: "dpj6s7xvh",
      uploadPreset: "avatar_unsigned",
      cropping: true,
      multiple: false,
      folder: "avatars"
    }, async (err, result) => {
      if (err) {
        console.error("[!] Errore nel widget Cloudinary:", err);
        return;
      }

      if (result?.event === "success") {
        const imageUrl = result.info.secure_url;
        console.log("[✓] Upload riuscito:", imageUrl);

        avatarEl.src = imageUrl;
        try {
          await userRef.set({ photoURL: imageUrl }, { merge: true });
          console.log("[✓] URL immagine salvato su Firestore");
          alert("✅ Foto aggiornata!");
        } catch (e) {
          console.error("[!] Errore salvataggio foto su Firestore:", e);
        }
      }
    });

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
        await userRef.set({ displayName: newName }, { merge: true });
        console.log("[✓] Nome salvato su Firestore");
        alert("✅ Nome aggiornato!");
      } catch (e) {
        console.error("[!] Errore durante il salvataggio del nome:", e);
      }
    });
  });
});
