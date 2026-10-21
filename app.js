import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 1. CONFIGURACIÓN DE FIREBASE E IMGBB
const firebaseConfig = {
  apiKey: "AIzaSyCqrie1z9nQr3c-2xdJ_ojQ6i9AnpJbc9I",
  authDomain: "mapalexo.firebaseapp.com",
  projectId: "mapalexo",
  storageBucket: "mapalexo.firebasestorage.app",
  messagingSenderId: "703290685870",
  appId: "1:703290685870:web:363778777e09069c5df03f"
};

const IMGBB_API_KEY = "5cd7df258c90ce6e35fa4aa104a43c52";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Función para subir imágenes a ImgBB
async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error("No se pudo subir la imagen a ImgBB.");
  }
  return result.data.url;
}

// 2. ESTADO DE LA APLICACIÓN
let currentUser = null;
let currentUserProfile = null;
let isRegisterMode = false;
let currentWizardStep = 1;
let allNeologisms = [];

const procedimientosPorForma = {
  "Neologismo de forma": [
    "Ex-nihilo",
    "Onomatopeya",
    "Prefijación",
    "Sufijación",
    "Prefijación y sufijación",
    "Composición léxica u ortográfica",
    "Composición culta",
    "Composición sintagmática",
    "Abreviación / abreviamiento",
    "Acronimia",
    "Siglación",
    "Préstamo adaptado",
    "Préstamo no adaptado",
    "Calco semántico",
    "No lo sé"
  ],
  "Neologismo de sentido": [
    "Conversión categorial o sintáctica",
    "Lexicalización de forma flexiva",
    "Creación metafórica",
    "Creación antonomásica",
    "Creación metonímica o sinecdóquica",
    "Creación por elipsis originada en combinatoria léxica",
    "No lo sé"
  ],
  "Neologismo de préstamo": [
    "Préstamo adaptado",
    "Préstamo no adaptado",
    "No lo sé"
  ]
};

// 3. INICIALIZACIÓN DE MAPAS
let mainMap = null;
let mainMarkersLayer = null;
let pickerMap = null;
let pickerMarker = null;

function initMaps() {
  if (!mainMap) {
    mainMap = L.map("main-map").setView([36.5271, -6.2886], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(mainMap);
    mainMarkersLayer = L.layerGroup().addTo(mainMap);
  }

  if (!pickerMap) {
    pickerMap = L.map("picker-map").setView([36.5271, -6.2886], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(pickerMap);

    pickerMap.on("click", (e) => {
      setPickerCoordinates(e.latlng.lat, e.latlng.lng);
    });
  }
}

function setPickerCoordinates(lat, lng) {
  document.getElementById("inp-lat").value = lat.toFixed(6);
  document.getElementById("inp-lng").value = lng.toFixed(6);
  if (pickerMarker) {
    pickerMarker.setLatLng([lat, lng]);
  } else {
    pickerMarker = L.marker([lat, lng]).addTo(pickerMap);
  }
  pickerMap.setView([lat, lng], 16);
}

document.getElementById("btn-geocode").addEventListener("click", async () => {
  const query = document.getElementById("inp-direccion").value.trim();
  if (!query) return;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.length > 0) {
      setPickerCoordinates(parseFloat(data[0].lat), parseFloat(data[0].lon));
    } else {
      alert("No se encontraron coordenadas para esa dirección.");
    }
  } catch (err) {
    alert("Error al buscar la dirección.");
  }
});

// 4. AUTENTICACIÓN Y ROLES
const authForm = document.getElementById("auth-form");
const btnToggleAuth = document.getElementById("btn-toggle-auth");
const authTitle = document.getElementById("auth-title");
const btnAuthSubmit = document.getElementById("btn-auth-submit");
const authError = document.getElementById("auth-error");

btnToggleAuth.addEventListener("click", () => {
  isRegisterMode = !isRegisterMode;
  authTitle.textContent = isRegisterMode ? "Crear cuenta en Mapalexo" : "Iniciar sesión";
  btnAuthSubmit.textContent = isRegisterMode ? "Registrarme" : "Entrar";
  btnToggleAuth.textContent = isRegisterMode ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate";
  authError.classList.add("hidden");
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.classList.add("hidden");
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  try {
    if (isRegisterMode) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email: email,
        role: "colaborador",
        viewScope: "all",
        createdAt: new Date().toISOString()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    authError.textContent = "Error de autenticación: " + err.message;
    authError.classList.remove("hidden");
  }
});

document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      currentUserProfile = userSnap.data();
    } else {
      currentUserProfile = { email: user.email, role: "colaborador", viewScope: "all" };
      await setDoc(userDocRef, currentUserProfile);
    }

    document.getElementById("auth-view").classList.add("hidden");
    document.getElementById("app-view").classList.remove("hidden");
    document.getElementById("user-Session-Bar").classList.remove("hidden");
    document.getElementById("current-user-email").textContent = currentUserProfile.email;
    document.getElementById("current-user-role").textContent = 
      `${currentUserProfile.role} (${currentUserProfile.viewScope === "own" ? "vista propia" : "vista total"})`;

    if (currentUserProfile.role === "admin") {
      document.getElementById("nav-admin").classList.remove("hidden");
      loadUsersForAdmin();
    } else {
      document.getElementById("nav-admin").classList.add("hidden");
    }

    initMaps();
    setTimeout(() => mainMap.invalidateSize(), 200);
    await loadNeologisms();
  } else {
    currentUser = null;
    currentUserProfile = null;
    document.getElementById("auth-view").classList.remove("hidden");
    document.getElementById("app-view").classList.add("hidden");
    document.getElementById("user-Session-Bar").classList.add("hidden");
  }
});

// 5. NAVEGACIÓN ENTRE SECCIONES
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".app-section").forEach((s) => s.classList.add("hidden"));

    btn.classList.add("active");
    const target = btn.getAttribute("data-target");
    document.getElementById(target).classList.remove("hidden");

    if (target === "section-map" && mainMap) {
      setTimeout(() => mainMap.invalidateSize(), 150);
    }
    if (target === "section-upload" && pickerMap) {
      setTimeout(() => pickerMap.invalidateSize(), 150);
    }
  });
});

// 6. ASISTENTE DE 13 PANTALLAS
const btnPrevStep = document.getElementById("btn-prev-step");
const btnNextStep = document.getElementById("btn-next-step");
const btnSubmitNeo = document.getElementById("btn-submit-neologism");
const wizardError = document.getElementById("wizard-error");

document.getElementById("inp-estadio").addEventListener("change", (e) => {
  const warning = document.getElementById("lexicalized-warning");
  if (e.target.value === "Palabra lexicalizada") {
    warning.classList.remove("hidden");
    btnNextStep.disabled = true;
  } else {
    warning.classList.add("hidden");
    btnNextStep.disabled = false;
  }
});

document.getElementById("inp-origen").addEventListener("change", (e) => {
  const subGroup = document.getElementById("sub-origen-group");
  if (e.target.value === "Individual") {
    subGroup.classList.remove("hidden");
  } else {
    subGroup.classList.add("hidden");
  }
});

function setupVariantToggle(selectId, inputId) {
  document.getElementById(selectId).addEventListener("change", (e) => {
    const txtInput = document.getElementById(inputId);
    if (e.target.value === "Sí") {
      txtInput.classList.remove("hidden");
      txtInput.required = true;
    } else {
      txtInput.classList.add("hidden");
      txtInput.required = false;
      txtInput.value = "";
    }
  });
}
setupVariantToggle("inp-var-ort-bool", "inp-var-ort-txt");
setupVariantToggle("inp-var-sin-bool", "inp-var-sin-txt");
setupVariantToggle("inp-var-ant-bool", "inp-var-ant-txt");

document.getElementById("inp-ctx-lengua").addEventListener("change", (e) => {
  const otra = document.getElementById("inp-ctx-lengua-otra");
  otra.classList.toggle("hidden", e.target.value !== "Otra");
});
document.getElementById("inp-ctx-alfabeto").addEventListener("change", (e) => {
  const otro = document.getElementById("inp-ctx-alfabeto-otro");
  otro.classList.toggle("hidden", e.target.value !== "Otro");
});

function populateProcedimientoOptions(formaSeleccionada) {
  const selectProc = document.getElementById("inp-procedimiento");
  selectProc.innerHTML = "";
  const lista = procedimientosPorForma[formaSeleccionada] || [];
  lista.forEach((op) => {
    const option = document.createElement("option");
    option.value = op;
    option.textContent = op;
    selectProc.appendChild(option);
  });
}

function validateCurrentStep() {
  wizardError.classList.add("hidden");
  const stepEl = document.querySelector(`.wizard-step[data-step="${currentWizardStep}"]`);
  const requiredFields = stepEl.querySelectorAll("[required]");
  
  for (const field of requiredFields) {
    if (!field.value) {
      wizardError.textContent = "Completa todos los campos obligatorios de esta pantalla antes de continuar.";
      wizardError.classList.remove("hidden");
      return false;
    }
  }
  if (currentWizardStep === 2 && document.getElementById("inp-estadio").value === "Palabra lexicalizada") {
    return false;
  }
  return true;
}

function showWizardStep(stepNumber) {
  currentWizardStep = stepNumber;
  document.querySelectorAll(".wizard-step").forEach((el) => {
    el.classList.toggle("hidden", parseInt(el.getAttribute("data-step"), 10) !== currentWizardStep);
  });

  document.getElementById("wizard-step-indicator").textContent = `Pantalla ${currentWizardStep} de 13`;
  document.getElementById("wizard-progress").style.width = `${(currentWizardStep / 13) * 100}%`;

  btnPrevStep.classList.toggle("hidden", currentWizardStep === 1);
  btnNextStep.classList.toggle("hidden", currentWizardStep === 13);
  btnSubmitNeo.classList.toggle("hidden", currentWizardStep !== 13);

  if (currentWizardStep === 1 && pickerMap) {
    setTimeout(() => pickerMap.invalidateSize(), 150);
  }
}

btnNextStep.addEventListener("click", () => {
  if (!validateCurrentStep()) return;

  if (currentWizardStep === 6) {
    const forma = document.getElementById("inp-forma-ling").value;
    if (forma === "Neologismo de forma y sentido" || forma === "No lo sé") {
      document.getElementById("inp-procedimiento").innerHTML = "";
      showWizardStep(8);
      return;
    } else {
      populateProcedimientoOptions(forma);
    }
  }

  if (currentWizardStep < 13) {
    showWizardStep(currentWizardStep + 1);
  }
});

btnPrevStep.addEventListener("click", () => {
  wizardError.classList.add("hidden");
  if (currentWizardStep === 8) {
    const forma = document.getElementById("inp-forma-ling").value;
    if (forma === "Neologismo de forma y sentido" || forma === "No lo sé") {
      showWizardStep(6);
      return;
    }
  }
  if (currentWizardStep > 1) {
    showWizardStep(currentWizardStep - 1);
  }
});

// 7. GUARDAR NEOLOGISMO
document.getElementById("neologism-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateCurrentStep()) return;

  btnSubmitNeo.disabled = true;
  btnSubmitNeo.textContent = "Subiendo datos y fotos...";

  try {
    const fileUnidad = document.getElementById("inp-foto-unidad").files[0];
    const fileContexto = document.getElementById("inp-foto-contexto").files[0];

    const urlFotoUnidad = await uploadToImgBB(fileUnidad);
    const urlFotoContexto = await uploadToImgBB(fileContexto);

    const origenPrincipal = document.getElementById("inp-origen").value;
    const origenDetalle = origenPrincipal === "Individual" 
      ? `Individual (${document.getElementById("inp-origen-sub").value})` 
      : origenPrincipal;

    const lenguaSeleccionada = document.getElementById("inp-ctx-lengua").value;
    const lenguaFinal = lenguaSeleccionada === "Otra" 
      ? document.getElementById("inp-ctx-lengua-otra").value.trim() 
      : lenguaSeleccionada;

    const alfabetoSeleccionado = document.getElementById("inp-ctx-alfabeto").value;
    const alfabetoFinal = alfabetoSeleccionado === "Otro" 
      ? document.getElementById("inp-ctx-alfabeto-otro").value.trim() 
      : alfabetoSeleccionado;

    const nuevoRegistro = {
      creadorUid: currentUser.uid,
      creadorEmail: currentUser.email,
      creadoEn: new Date().toISOString(),
      infoBasica: {
        palabra: document.getElementById("inp-palabra").value.trim(),
        definicion: document.getElementById("inp-definicion").value.trim(),
        fotoUnidadUrl: urlFotoUnidad,
        fotoContextoUrl: urlFotoContexto,
        direccion: document.getElementById("inp-direccion").value.trim(),
        lat: parseFloat(document.getElementById("inp-lat").value),
        lng: parseFloat(document.getElementById("inp-lng").value),
        fecha: document.getElementById("inp-fecha").value
      },
      infoLinguistica: {
        estadio: document.getElementById("inp-estadio").value,
        pertenencia: document.getElementById("inp-pertenencia").value,
        origen: origenDetalle,
        finalidad: document.getElementById("inp-finalidad-ling").value,
        forma: document.getElementById("inp-forma-ling").value,
        procedimiento: document.getElementById("inp-procedimiento").value || "No aplica / pendiente",
        variantes: {
          ortograficas: document.getElementById("inp-var-ort-bool").value === "Sí" ? document.getElementById("inp-var-ort-txt").value.trim() : "No",
          sinonimicas: document.getElementById("inp-var-sin-bool").value === "Sí" ? document.getElementById("inp-var-sin-txt").value.trim() : "No",
          antonimicas: document.getElementById("inp-var-ant-bool").value === "Sí" ? document.getElementById("inp-var-ant-txt").value.trim() : "No"
        }
      },
      infoContextual: {
        forma: document.getElementById("inp-ctx-forma").value,
        emisor: document.getElementById("inp-ctx-emisor").value.trim(),
        receptor: document.getElementById("inp-ctx-receptor").value.trim(),
        lenguas: lenguaFinal,
        alfabeto: alfabetoFinal,
        finalidad: document.getElementById("inp-ctx-finalidad").value.trim(),
        tema: document.getElementById("inp-ctx-tema").value.trim(),
        escritura: document.getElementById("inp-ctx-escritura").value,
        estatus: document.getElementById("inp-ctx-estatus").value
      }
    };

    await addDoc(collection(db, "neologismos"), nuevoRegistro);

    document.getElementById("neologism-form").reset();
    showWizardStep(1);
    await loadNeologisms();
    alert("Neologismo guardado correctamente.");
  } catch (err) {
    alert("Error al guardar el neologismo: " + err.message);
  } finally {
    btnSubmitNeo.disabled = false;
    btnSubmitNeo.textContent = "Guardar en Mapalexo";
  }
});

// 8. CARGA DE DATOS Y PINES EN EL MAPA
async function loadNeologisms() {
  const snap = await getDocs(collection(db, "neologismos"));
  const rawList = [];
  snap.forEach((docSnap) => {
    rawList.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (currentUserProfile.role === "colaborador" && currentUserProfile.viewScope === "own") {
    allNeologisms = rawList.filter((item) => item.creadorUid === currentUser.uid);
  } else {
    allNeologisms = rawList;
  }

  renderMapPins("all");
  renderSearchResults(allNeologisms);
}

function renderMapPins(filterCriteria) {
  if (!mainMarkersLayer) return;
  mainMarkersLayer.clearLayers();

  const filtered = allNeologisms.filter((item) => {
    if (filterCriteria === "all") return true;
    return (
      item.infoLinguistica.estadio === filterCriteria ||
      item.infoLinguistica.forma === filterCriteria
    );
  });

  filtered.forEach((item) => {
    const { lat, lng, palabra, definicion, fotoUnidadUrl, fecha } = item.infoBasica;
    if (!isNaN(lat) && !isNaN(lng)) {
      const marker = L.marker([lat, lng]);
      marker.bindPopup(`
        <div style="color:#000000; max-width:220px;">
          <h3 style="color:#CC5500; margin-bottom:4px;">${palabra}</h3>
          <p><strong>Definición:</strong> ${definicion}</p>
          <p><strong>Estadio:</strong> ${item.infoLinguistica.estadio}</p>
          <p><strong>Forma:</strong> ${item.infoLinguistica.forma}</p>
          <p><strong>Soporte:</strong> ${item.infoContextual.forma}</p>
          <p><strong>Fecha:</strong> ${fecha}</p>
          <img src="${fotoUnidadUrl}" alt="${palabra}" style="width:100%; margin-top:6px; border:1px solid #000;">
        </div>
      `);
      mainMarkersLayer.addLayer(marker);
    }
  });
}

document.getElementById("map-category-filter").addEventListener("change", (e) => {
  renderMapPins(e.target.value);
});

// 9. BÚSQUEDA Y FILTRADO
document.getElementById("btn-run-search").addEventListener("click", () => {
  const qWord = document.getElementById("search-word").value.trim().toLowerCase();
  const qEstadio = document.getElementById("search-estadio").value;
  const qFormaLing = document.getElementById("search-forma-ling").value;
  const qFormaCtx = document.getElementById("search-forma-ctx").value;
  const qEstatus = document.getElementById("search-estatus").value;
  const qMine = document.getElementById("search-mine").value;

  const results = allNeologisms.filter((item) => {
    const matchWord = !qWord || 
      item.infoBasica.palabra.toLowerCase().includes(qWord) || 
      item.infoBasica.definicion.toLowerCase().includes(qWord);
    const matchEstadio = !qEstadio || item.infoLinguistica.estadio === qEstadio;
    const matchFormaLing = !qFormaLing || item.infoLinguistica.forma === qFormaLing;
    const matchFormaCtx = !qFormaCtx || item.infoContextual.forma === qFormaCtx;
    const matchEstatus = !qEstatus || item.infoContextual.estatus === qEstatus;
    const matchMine = qMine !== "mine" || item.creadorUid === currentUser.uid;

    return matchWord && matchEstadio && matchFormaLing && matchFormaCtx && matchEstatus && matchMine;
  });

  renderSearchResults(results);
});

function renderSearchResults(list) {
  const container = document.getElementById("search-results");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = "<p>No se encontraron neologismos con esos criterios.</p>";
    return;
  }

  list.forEach((item) => {
    const canDelete = 
      currentUserProfile.role === "admin" || 
      currentUserProfile.role === "moderador" || 
      item.creadorUid === currentUser.uid;

    const card = document.createElement("div");
    card.className = "neo-card";
    card.innerHTML = `
      <h3 style="color:#CC5500;">${item.infoBasica.palabra}</h3>
      <p><strong>Definición:</strong> ${item.infoBasica.definicion}</p>
      <p><strong>Fecha:</strong> ${item.infoBasica.fecha}</p>
      <p><strong>Estadio:</strong> ${item.infoLinguistica.estadio}</p>
      <p><strong>Pertenencia:</strong> ${item.infoLinguistica.pertenencia}</p>
      <p><strong>Origen:</strong> ${item.infoLinguistica.origen}</p>
      <p><strong>Forma lingüística:</strong> ${item.infoLinguistica.forma}</p>
      <p><strong>Procedimiento:</strong> ${item.infoLinguistica.procedimiento}</p>
      <p><strong>Soporte:</strong> ${item.infoContextual.forma} (${item.infoContextual.escritura}, ${item.infoContextual.estatus})</p>
      <p><strong>Lengua / Alfabeto:</strong> ${item.infoContextual.lenguas} / ${item.infoContextual.alfabeto}</p>
      <img src="${item.infoBasica.fotoUnidadUrl}" alt="Foto de la unidad">
      <img src="${item.infoBasica.fotoContextoUrl}" alt="Foto contextual">
      ${canDelete ? `<button type="button" class="btn-delete-neo" data-id="${item.id}" style="margin-top:10px; width:100%;">Eliminar entrada</button>` : ""}
    `;
    container.appendChild(card);
  });

  container.querySelectorAll(".btn-delete-neo").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (confirm("¿Seguro que deseas eliminar este neologismo?")) {
        await deleteDoc(doc(db, "neologismos", id));
        await loadNeologisms();
      }
    });
  });
}

// 10. PANEL DE ADMINISTRACIÓN
async function loadUsersForAdmin() {
  const tbody = document.getElementById("admin-users-tbody");
  tbody.innerHTML = "";
  const snap = await getDocs(collection(db, "users"));

  snap.forEach((userDoc) => {
    const u = userDoc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.email}</td>
      <td>
        <select class="adm-role" data-uid="${userDoc.id}">
          <option value="colaborador" ${u.role === "colaborador" ? "selected" : ""}>Colaborador</option>
          <option value="moderador" ${u.role === "moderador" ? "selected" : ""}>Moderador</option>
          <option value="admin" ${u.role === "admin" ? "selected" : ""}>Administrador</option>
        </select>
      </td>
      <td>
        <select class="adm-scope" data-uid="${userDoc.id}">
          <option value="all" ${u.viewScope === "all" ? "selected" : ""}>Ver todos los neologismos</option>
          <option value="own" ${u.viewScope === "own" ? "selected" : ""}>Ver solo los subidos por él</option>
        </select>
      </td>
      <td>
        <button type="button" class="btn-save-user" data-uid="${userDoc.id}">Guardar cambios</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".btn-save-user").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.getAttribute("data-uid");
      const newRole = tbody.querySelector(`.adm-role[data-uid="${uid}"]`).value;
      const newScope = tbody.querySelector(`.adm-scope[data-uid="${uid}"]`).value;
      await updateDoc(doc(db, "users", uid), {
        role: newRole,
        viewScope: newScope
      });
      alert("Permisos actualizados.");
    });
  });
}
