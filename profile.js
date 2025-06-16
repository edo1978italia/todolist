import firebaseConfig from "./config.js";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("userEmail");
  const avatarEl = document.getElementById("avatarPreview");
  const nameEl = document.getElementById("displayName");
  const uploadBtn = document.getElementById("upload_widget");
  const saveBtn = document.getElementById("saveProfile");
  const backBtn = document.getElementById("goBackButton");

  backBtn.addEventListener("click", () => {
    if (document.referrer && !document.referrer.includes("profile.html")) {
      history.back();
    } else {
      window.location.href = "index.html";
    }
  });

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      console.warn("Nessun utente autenticato");
      return;
    }

    emailEl.textContent = user.email;
    const userRef = db.collection("users").doc(user.uid);
    try {
      const snap = await userRef.get();
      const data = snap.data();
      if (data?.displayName) nameEl.value = data.displayName;
      if (data?.photoURL) avatarEl.src = data.photoURL;
    } catch (e) {
      console.warn("Errore lettura profilo:", e);
    }

    const widget = cloudinary.createUploadWidget({
      cloudName: "dpj6s7xvh",
      uploadPreset: "avatar_unsigned",
      cropping: true,
      multiple: false,
      folder: "avatars"
    }, async (err, result) => {
      if (!err && result?.event === "success") {
        const imageUrl = result.info.secure_url;
        avatarEl.src = imageUrl;
        await userRef.set({ photoURL: imageUrl }, { merge: true });
        alert("✅ Foto aggiornata!");
      }
    });

    uploadBtn.addEventListener("click", () => {
      widget.open();
    });

    saveBtn.addEventListener("click", async () => {
      const newName = nameEl.value.trim();
      if (!newName) return alert("⚠️ Inserisci un nome valido.");
      await userRef.set({ displayName: newName }, { merge: true });
      alert("✅ Nome aggiornato!");
    });
  });
});
