import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { app } from "./config.js"; // Assicurati che esporta correttamente `app`

const auth = getAuth(app);
const db = getFirestore(app);

// Mostra email e carica dati utente (nome + avatar)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    document.getElementById("userEmail").textContent = user.email;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.displayName) {
        document.getElementById("displayName").value = data.displayName;
      }
      if (data.photoURL) {
        document.getElementById("avatarPreview").src = data.photoURL;
      }
    }
  }
});

// Inizializza Cloudinary e bottone "Carica immagine"
window.addEventListener("DOMContentLoaded", () => {
  const widget = window.cloudinary.createUploadWidget({
    cloudName: "dpj6s7xvh",
    uploadPreset: "avatar_unsigned",
    cropping: true,
    multiple: false,
    folder: "avatars"
  }, async (err, result) => {
    if (!err && result?.event === "success") {
      const imageUrl = result.info.secure_url;
      document.getElementById("avatarPreview").src = imageUrl;

      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          photoURL: imageUrl
        }, { merge: true });

        alert("✅ Foto aggiornata!");
        console.log("✅ Foto profilo salvata in Firestore.");
      }
    }
  });

  const uploadBtn = document.getElementById("upload_widget");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => widget.open());
  }
});

// Bottone "Salva nome"
document.getElementById("saveProfile").addEventListener("click", async () => {
  const user = auth.currentUser;
  const newName = document.getElementById("displayName").value.trim();

  if (user && newName) {
    await setDoc(doc(db, "users", user.uid), {
      displayName: newName
    }, { merge: true });

    alert("✅ Nome utente aggiornato!");
    console.log("✅ displayName aggiornato in Firestore.");
  }
});
