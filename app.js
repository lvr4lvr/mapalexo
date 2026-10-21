import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqrie1z9nQr3c-2xdJ_ojQ6i9AnpJbc9I",
  authDomain: "mapalexo.firebaseapp.com",
  projectId: "mapalexo",
  storageBucket: "mapalexo.firebasestorage.app",
  messagingSenderId: "703290685870",
  appId: "1:703290685870:web:363778777e09069c5df03f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let isRegisterMode = false;
const btnToggle = document.getElementById("btn-toggle-auth");
const authTitle = document.getElementById("auth-title");
const btnSubmit = document.getElementById("btn-auth-submit");

btnToggle.addEventListener("click", () => {
  isRegisterMode = !isRegisterMode;
  authTitle.textContent = isRegisterMode ? "Crear cuenta" : "Iniciar sesión";
  btnSubmit.textContent = isRegisterMode ? "Registrarme" : "Entrar";
  btnToggle.textContent = isRegisterMode ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate";
});

document.getElementById("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  try {
    if (isRegisterMode) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), { email, role: "admin", viewScope: "all" });
      alert("¡Cuenta creada con éxito!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      alert("¡Sesión iniciada con éxito!");
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
});
