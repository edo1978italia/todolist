import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import { app } from "./config.js"; // 🧩 assicurati che esporti `app`

const auth = getAuth(app);
const db = getFirestore(app);

// Mostra email e carica photoURL già salvata
onAuthStateChanged(auth, async (user) => {
  if (user) {
    document.getElementById("userEmail").textContent = user.email;

    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const { photoURL } = snap.data();
      if (photoURL) {
        document.getElementById("avatarPreview").src = photoURL;
      }
    }
  }
});

// Widget Cloudinary
const widget = cloudinary.createUploadWidget({
  cloudName: "dpj6s7xvh",
  uploadPreset: "avatar_unsigned",
  cropping: true,
  multiple: false,
  folder: "avatars"
}, async (err, result) => {
  if (!err && result && result.event === "success") {
    const imageUrl = result.info.secure_url;
    document.getElementById("avatarPreview").src = imageUrl;

    const user = auth.currentUser;
    if (user) {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { photoURL: imageUrl });
      console.log("✅ Foto profilo aggiornata!");
    }
  }
});

document.getElementById("upload_widget").addEventListener("click", () => widget.open());
