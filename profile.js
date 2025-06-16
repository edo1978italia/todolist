// Assicurati che profile.html includa:
// <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>

const auth = firebase.auth();
const db = firebase.firestore();

document.getElementById("goBackButton").addEventListener("click", () => {
  if (document.referrer && !document.referrer.includes("profile.html")) {
    history.back();
  } else {
    window.location.href = "index.html";
  }
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    document.getElementById("userEmail").textContent = user.email;
    const userRef = db.collection("users").doc(user.uid);
    const snap = await userRef.get();
    const data = snap.data();
    if (data) {
      if (data.displayName) {
        document.getElementById("displayName").value = data.displayName;
      }
      if (data.photoURL) {
        document.getElementById("avatarPreview").src = data.photoURL;
      }
    }
  }
});

// Cloudinary
const widget = cloudinary.createUploadWidget({
  cloudName: "dpj6s7xvh",
  uploadPreset: "avatar_unsigned",
  cropping: true,
  multiple: false,
  folder: "avatars"
}, async (error, result) => {
  if (!error && result?.event === "success") {
    const imageUrl = result.info.secure_url;
    document.getElementById("avatarPreview").src = imageUrl;

    const user = auth.currentUser;
    if (user) {
      await db.collection("users").doc(user.uid).set(
        { photoURL: imageUrl },
        { merge: true }
      );
      alert("✅ Foto aggiornata!");
    }
  }
});

document.getElementById("upload_widget").addEventListener("click", () => {
  widget.open();
});

// Salvataggio nome
document.getElementById("saveProfile").addEventListener("click", async () => {
  const newName = document.getElementById("displayName").value.trim();
  const user = auth.currentUser;
  if (user && newName) {
    await db.collection("users").doc(user.uid).set(
      { displayName: newName },
      { merge: true }
    );
    alert("✅ Nome aggiornato!");
  }
});
