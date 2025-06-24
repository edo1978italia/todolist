import firebaseConfig from "./config.js";
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

console.log("[register.js] Firebase init...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log("[register.js] Firebase ready");

function calculateAge(dobStr) {
  const today = new Date();
  const birth = new Date(dobStr);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("[register.js] Form submit triggered");

  const form = e.target;
  const firstName = form.firstName.value.trim();
  const lastName = form.lastName.value.trim();
  const birthDate = form.birthDate.value;
  const country = form.country.value;
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;
  const accepted = form.acceptTerms.checked;

  if (!accepted) return alert("You must accept the terms.");
  if (password !== confirmPassword) return alert("Passwords do not match.");
  if (!birthDate) return alert("Please select your date of birth.");

  const age = calculateAge(birthDate);

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("[register.js] User created:", user.uid);

    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`
    });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email,
      firstName,
      lastName,
      country,
      birthDate,
      age,
      createdAt: serverTimestamp()
    });

    console.log("[register.js] User saved to Firestore");
    window.location.href = "group-setup.html";
  } catch (err) {
    console.error("[register.js] Registration error", err);
    alert("Registration error: " + err.message);
  }
});
