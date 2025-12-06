// script.js (versión con Firebase + Firestore)

// ----- IMPORTS DE FIREBASE DESDE CDN -----
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ----- CONFIGURACIÓN DE TU PROYECTO FIREBASE -----
const firebaseConfig = {
  apiKey: "AIzaSyAZdspFCOgzOPKPQ63b2MTs4ZjZz8QoBtg",
  authDomain: "creatividad-digital.firebaseapp.com",
  projectId: "creatividad-digital",
  storageBucket: "creatividad-digital.firebasestorage.app",
  messagingSenderId: "152517888172",
  appId: "1:152517888172:web:c81a4ff025f68925453709"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Colecciones en Firestore
const photosCol = collection(db, "photos");
const ratingsCol = collection(db, "ratings");
const configDocRef = doc(db, "config", "general");

// Ítems de valoración por defecto
const DEFAULT_RATING_ITEMS = [
  { id: "item1", label: "Originalidad y novedad" },
  { id: "item2", label: "Expresión creativa y emocional" },
  { id: "item3", label: "Uso innovador de técnicas digitales" },
  { id: "item4", label: "Composición visual y técnica" },
  { id: "item5", label: "Interacción y cocreación" }
];

// Configuración global simple
let globalConfig = {
  askCenter: false,
  centers: [],
  ratingItems: DEFAULT_RATING_ITEMS
};

// ----- CLAVES DE ACCESO -----
const PASSWORDS = {
  uploader: "alumno2025",
  expert: "experto2025",
  admin: "admin2025"
};

// ----- GESTIÓN DE SECCIONES -----
const loginSection = document.getElementById("login-section");
const uploadSection = document.getElementById("upload-section");
const expertSection = document.getElementById("expert-section");
const adminSection = document.getElementById("admin-section");

// Elementos de configuración visual
const centerWrapper = document.getElementById("center-wrapper");
const centerSelect = document.getElementById("center");
const centerNote = document.getElementById("center-note");
const askCenterToggle = document.getElementById("ask-center-toggle");
const centersTextarea = document.getElementById("centers-textarea");
const saveCentersButton = document.getElementById("save-centers-button");
const ratingItemsTextarea = document.getElementById("rating-items-textarea");
const saveRatingItemsButton = document.getElementById("save-rating-items-button");
const resetDbButton = document.getElementById("reset-db-button");
const studiesSelect = document.getElementById("studies");
const bachWrapper = document.getElementById("bach-wrapper");
const ageChart = document.getElementById("age-chart");
const ageChartNote = document.getElementById("age-chart-note");
const loadPhotosButton = document.getElementById("load-photos-button");
const photosList = document.getElementById("photos-list");

// Rating dinámico
const ratingItemsContainer = document.getElementById("rating-items-container");
const puntfSpan = document.getElementById("puntf-value");
let ratingControls = [];

// Botones "Volver al inicio"
const backButtons = document.querySelectorAll(".back-button");
backButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    uploadSection.classList.add("hidden");
    expertSection.classList.add("hidden");
    adminSection.classList.add("hidden");
    loginSection.classList.remove("hidden");

    const roleSelect = document.getElementById("role-select");
    const accessPassword = document.getElementById("access-password");
    if (roleSelect) roleSelect.value = "";
    if (accessPassword) accessPassword.value = "";
  });
});

// ---- APLICAR CONFIGURACIÓN ----
function applyCentersToSelect() {
  if (!centerSelect) return;

  centerSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  if (globalConfig.centers && globalConfig.centers.length > 0) {
    defaultOption.value = "";
    defaultOption.textContent = "Selecciona tu centro";
  } else {
    defaultOption.value = "";
    defaultOption.textContent = "No hay centros configurados";
  }
  centerSelect.appendChild(defaultOption);

  if (Array.isArray(globalConfig.centers)) {
    globalConfig.centers.forEach(name => {
      const trimmed = (name || "").trim();
      if (!trimmed) return;
      const opt = document.createElement("option");
      opt.value = trimmed;
      opt.textContent = trimmed;
      centerSelect.appendChild(opt);
    });
  }

  if (centerNote) {
    if (!globalConfig.centers || globalConfig.centers.length === 0) {
      centerNote.textContent = "Pregunta a tu profesor/a si no aparece tu centro.";
    } else {
      centerNote.textContent = "";
    }
  }
}

function applyConfigToUpload() {
  if (!centerWrapper) return;
  applyCentersToSelect();
  centerWrapper.style.display = globalConfig.askCenter ? "block" : "none";
}

function applyConfigToAdmin() {
  if (askCenterToggle) {
    askCenterToggle.checked = !!globalConfig.askCenter;
  }
  if (centersTextarea) {
    centersTextarea.value = (globalConfig.centers || []).join("\n");
  }
  if (ratingItemsTextarea) {
    ratingItemsTextarea.value = (globalConfig.ratingItems || []).map(i => i.label).join("\n");
  }
}

function buildRatingControls() {
  if (!ratingItemsContainer) return;

  ratingItemsContainer.innerHTML = "";
  ratingControls = [];

  const items = globalConfig.ratingItems && globalConfig.ratingItems.length
    ? globalConfig.ratingItems
    : DEFAULT_RATING_ITEMS;

  items.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "rating-item";

    const labelEl = document.createElement("label");
    const inputId = `rating-item-${item.id}`;
    labelEl.setAttribute("for", inputId);
    labelEl.textContent = `${index + 1}. ${item.label}`;

    const input = document.createElement("input");
    input.type = "range";
    input.min = "1";
    input.max = "10";
    input.value = "5";
    input.id = inputId;

    const valueSpan = document.createElement("span");
    valueSpan.textContent = "5";

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    wrapper.appendChild(valueSpan);

    input.addEventListener("input", () => {
      valueSpan.textContent = input.value;
      updatePuntf();
    });

    ratingItemsContainer.appendChild(wrapper);

    ratingControls.push({
      config: item,
      input,
      valueSpan
    });
  });

  updatePuntf();
}

function updatePuntf() {
  if (!ratingControls.length) {
    if (puntfSpan) puntfSpan.textContent = "0.0";
    return;
  }
  const sum = ratingControls.reduce(
    (acc, rc) => acc + Number(rc.input.value || 0),
    0
  );
  const avg = sum / ratingControls.length;
  if (puntfSpan) {
    puntfSpan.textContent = avg.toFixed(1);
  }
}

async function loadGlobalConfig() {
  try {
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      const data = snap.data();
      globalConfig.askCenter = !!data.askCenter;
      globalConfig.centers = Array.isArray(data.centers) ? data.centers : [];
      if (Array.isArray(data.ratingItems) && data.ratingItems.length > 0) {
        globalConfig.ratingItems = data.ratingItems.map((it, idx) => ({
          id: it.id || `item${idx + 1}`,
          label: it.label || `Ítem ${idx + 1}`
        }));
      } else {
        globalConfig.ratingItems = DEFAULT_RATING_ITEMS;
      }
    } else {
      globalConfig.askCenter = false;
      globalConfig.centers = [];
      globalConfig.ratingItems = DEFAULT_RATING_ITEMS;
    }
  } catch (err) {
    console.error("Error cargando configuración global:", err);
    globalConfig.askCenter = false;
    globalConfig.centers = [];
    globalConfig.ratingItems = DEFAULT_RATING_ITEMS;
  }

  applyConfigToUpload();
  applyConfigToAdmin();
  buildRatingControls();
}

// Cargar configuración al inicio
loadGlobalConfig();

// Listener para mostrar/ocultar modalidad de Bachillerato según nivel
if (studiesSelect && bachWrapper) {
  studiesSelect.addEventListener("change", () => {
    if (studiesSelect.value === "Bachillerato") {
      bachWrapper.style.display = "block";
    } else {
      bachWrapper.style.display = "none";
      const bachTypeSelect = document.getElementById("bach-type");
      if (bachTypeSelect) bachTypeSelect.value = "";
    }
  });
}

// Listener del checkbox en el panel de admin para pedir centro educativo
if (askCenterToggle) {
  askCenterToggle.addEventListener("change", async () => {
    const newValue = askCenterToggle.checked;
    globalConfig.askCenter = newValue;
    applyConfigToUpload();

    try {
      const snap = await getDoc(configDocRef);
      const payload = { askCenter: newValue };
      if (!snap.exists()) {
        payload.centers = globalConfig.centers || [];
        payload.ratingItems = globalConfig.ratingItems || DEFAULT_RATING_ITEMS;
        await setDoc(configDocRef, payload);
      } else {
        await updateDoc(configDocRef, payload);
      }
    } catch (err) {
      console.error("Error actualizando configuración:", err);
      alert("No se ha podido guardar la configuración de centro educativo.");
    }
  });
}

// Guardar lista de centros desde el panel admin
if (saveCentersButton) {
  saveCentersButton.addEventListener("click", async () => {
    if (!centersTextarea) return;
    const rawLines = centersTextarea.value.split("\n");
    const centersList = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0);

    globalConfig.centers = centersList;
    applyConfigToUpload();

    try {
      const snap = await getDoc(configDocRef);
      const payload = { centers: centersList };
      if (!snap.exists()) {
        payload.askCenter = globalConfig.askCenter;
        payload.ratingItems = globalConfig.ratingItems || DEFAULT_RATING_ITEMS;
        await setDoc(configDocRef, payload);
      } else {
        await updateDoc(configDocRef, payload);
      }
      alert("Lista de centros actualizada.");
    } catch (err) {
      console.error("Error guardando centros:", err);
      alert("No se ha podido guardar la lista de centros.");
    }
  });
}

// Guardar ítems de valoración desde el panel admin
if (saveRatingItemsButton) {
  saveRatingItemsButton.addEventListener("click", async () => {
    if (!ratingItemsTextarea) return;
    const rawLines = ratingItemsTextarea.value.split("\n");
    const labels = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (!labels.length) {
      alert("Debes introducir al menos un ítem de valoración.");
      return;
    }

    const ratingItems = labels.map((label, idx) => ({
      id: `item${idx + 1}`,
      label
    }));

    globalConfig.ratingItems = ratingItems;
    buildRatingControls();

    try {
      const snap = await getDoc(configDocRef);
      const payload = { ratingItems };
      if (!snap.exists()) {
        payload.askCenter = globalConfig.askCenter;
        payload.centers = globalConfig.centers || [];
        await setDoc(configDocRef, payload);
      } else {
        await updateDoc(configDocRef, payload);
      }
      alert("Ítems de valoración actualizados.");
    } catch (err) {
      console.error("Error guardando ítems de valoración:", err);
      alert("No se ha podido guardar los ítems de valoración.");
    }
  });
}

// Reinicializar base de datos (borrar todas las fotos y valoraciones)
if (resetDbButton) {
  resetDbButton.addEventListener("click", async () => {
    const ok = confirm(
      "Esta acción borrará TODAS las fotografías y valoraciones de la base de datos. " +
      "La configuración (centros, ítems, etc.) se mantendrá. ¿Seguro que quieres continuar?"
    );
    if (!ok) return;

    try {
      const [photosSnap, ratingsSnap] = await Promise.all([
        getDocs(photosCol),
        getDocs(ratingsCol)
      ]);

      const ops = [];
      photosSnap.forEach(docSnap => ops.push(deleteDoc(docSnap.ref)));
      ratingsSnap.forEach(docSnap => ops.push(deleteDoc(docSnap.ref)));

      await Promise.all(ops);

      alert("Base de datos reinicializada. Se han borrado todas las fotografías y valoraciones.");
      if (photosList) photosList.innerHTML = "";
      updateAdminSummary();
    } catch (err) {
      console.error("Error al reinicializar la base de datos:", err);
      alert("Ha ocurrido un error al reinicializar la base de datos.");
    }
  });
}

// Función para redimensionar y comprimir la imagen antes de subirla (máx. 1920 px lado mayor)
function resizeImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        let width = img.width;
        let height = img.height;

        const scale = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);

        try {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = function (err) {
        reject(err);
      };

      img.src = event.target.result;
    };

    reader.onerror = function (err) {
      reject(err);
    };

    reader.readAsDataURL(file);
  });
}

function showSection(sectionId) {
  [uploadSection, expertSection, adminSection].forEach(sec => sec.classList.add("hidden"));
  if (sectionId === "upload") uploadSection.classList.remove("hidden");
  if (sectionId === "expert") expertSection.classList.remove("hidden");
  if (sectionId === "admin") {
    adminSection.classList.remove("hidden");
    applyConfigToAdmin();
  }
}

// ----- LOGIN / ACCESO POR ROL -----
document.getElementById("login-button").addEventListener("click", () => {
  const role = document.getElementById("role-select").value;
  const password = document.getElementById("access-password").value.trim();

  if (!role) {
    alert("Selecciona un tipo de acceso.");
    return;
  }

  if (password !== PASSWORDS[role]) {
    alert("Clave incorrecta.");
    return;
  }

  loginSection.classList.add("hidden");

  if (role === "uploader") {
    showSection("upload");
  } else if (role === "expert") {
    showSection("expert");
  } else if (role === "admin") {
    showSection("admin");
    updateAdminSummary();
  }
});

// ----- SUBIDA DE FOTOGRAFÍA (FIRESTORE) -----
const uploadForm = document.getElementById("upload-form");
const uploadMessage = document.getElementById("upload-message");
const uploadPreview = document.getElementById("upload-preview");
const previewImage = document.getElementById("preview-image");
const previewMeta = document.getElementById("preview-meta");

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  uploadMessage.textContent = "";
  uploadMessage.className = "message";

  if (!uploadForm.reportValidity()) {
    return;
  }

  const fileInput = document.getElementById("photo-file");
  const ageValue = Number(document.getElementById("age").value);
  const gender = document.getElementById("gender").value;
  const studies = document.getElementById("studies").value;
  const bachType = document.getElementById("bach-type").value || "";
  const vocation = document.getElementById("vocation").value.trim();
  const studiesFather = document.getElementById("studies-father").value;
  const studiesMother = document.getElementById("studies-mother").value;

  const rep = document.querySelector('input[name="rep"]:checked')?.value || "";
  const fail = document.querySelector('input[name="fail"]:checked')?.value || "";
  const pcsHome = Number(document.getElementById("pcs-home").value);
  const pcRoom = document.querySelector('input[name="pc-room"]:checked')?.value || "";
  const pcFrequency = document.getElementById("pc-frequency").value;
  const pcHours = Number(document.getElementById("pc-hours").value);
  const center = centerSelect ? centerSelect.value.trim() : "";

  const privacyOk = document.getElementById("privacy-ok");

  if (!Number.isFinite(ageValue) || ageValue < 10 || ageValue > 100) {
    uploadMessage.textContent = "Introduce una edad válida entre 10 y 100 años.";
    uploadMessage.classList.add("error");
    return;
  }

  if (!privacyOk || !privacyOk.checked) {
    uploadMessage.textContent = "Debes aceptar la política de privacidad.";
    uploadMessage.classList.add("error");
    return;
  }

  if (!fileInput.files || !fileInput.files[0]) {
    uploadMessage.textContent = "Debes seleccionar una fotografía.";
    uploadMessage.classList.add("error");
    return;
  }

  const file = fileInput.files[0];

  uploadMessage.textContent = "Procesando fotografía...";
  uploadMessage.className = "message";

  try {
    const dataUrl = await resizeImage(file, 1920, 1920, 0.7);

    if (dataUrl.length > 950000) {
      uploadMessage.textContent =
        "La fotografía sigue siendo demasiado pesada incluso tras comprimirla. Prueba con una imagen más pequeña.";
      uploadMessage.classList.add("error");
      return;
    }

    const docRef = await addDoc(photosCol, {
      dataUrl: dataUrl,
      age: ageValue,
      gender: gender,
      studies: studies,
      bachType: bachType,
      vocation: vocation,
      studiesFather: studiesFather,
      studiesMother: studiesMother,
      rep: rep,
      fail: fail,
      pcsHome: pcsHome,
      pcRoom: pcRoom,
      pcFrequency: pcFrequency,
      pcHours: pcHours,
      center: center,
      createdAt: new Date().toISOString()
    });

    const photoId = docRef.id;

    uploadMessage.textContent = "Fotografía guardada correctamente en la base de datos. ¡Gracias por tu participación!";
    uploadMessage.className = "message success";

    uploadPreview.classList.remove("hidden");
    previewImage.src = dataUrl;
    previewMeta.textContent =
      "ID: " + photoId +
      " | Edad: " + ageValue +
      " | Sexo: " + gender +
      " | Estudios: " + studies +
      " | Bachillerato: " + (bachType || "N/A");

    uploadForm.reset();
    if (bachWrapper) bachWrapper.style.display = "none";
    applyConfigToUpload(); // reconstruir select de centros tras reset
  } catch (err) {
    console.error("Error al procesar o guardar la fotografía:", err);
    uploadMessage.textContent =
      "Ha ocurrido un error al guardar la fotografía: " + (err && err.message ? err.message : "");
    uploadMessage.classList.add("error");
  }
});

// ----- VALORACIÓN POR EXPERTOS -----
const ratingArea = document.getElementById("rating-area");
const noPhotosMessage = document.getElementById("no-photos-message");
const photoRatingCard = document.getElementById("photo-rating-card");
const ratingPhoto = document.getElementById("rating-photo");
const ratingPhotoInfo = document.getElementById("rating-photo-info");
const ratingMessage = document.getElementById("rating-message");

let currentPhotoForExpert = null;

document.getElementById("start-rating-button").addEventListener("click", () => {
  const expertId = document.getElementById("expert-id").value.trim();
  if (!expertId) {
    alert("Introduce tu código de experto/a.");
    return;
  }

  ratingArea.classList.remove("hidden");
  loadNextPhotoForExpert();
});

async function loadNextPhotoForExpert() {
  const expertId = document.getElementById("expert-id").value.trim();
  if (!expertId) return;

  try {
    const photosSnap = await getDocs(photosCol);
    const photos = photosSnap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    const ratingsSnap = await getDocs(
      query(ratingsCol, where("expertId", "==", expertId))
    );

    const ratedPhotoIds = new Set(
      ratingsSnap.docs.map(d => d.data().photoId)
    );

    const pending = photos.filter(p => !ratedPhotoIds.has(p.id));

    if (pending.length === 0) {
      currentPhotoForExpert = null;
      photoRatingCard.classList.add("hidden");
      noPhotosMessage.classList.remove("hidden");
      ratingMessage.textContent = "";
      return;
    }

    noPhotosMessage.classList.add("hidden");
    photoRatingCard.classList.remove("hidden");

    const randomIndex = Math.floor(Math.random() * pending.length);
    const photo = pending[randomIndex];
    currentPhotoForExpert = photo;

    ratingPhoto.src = photo.dataUrl;
    ratingPhotoInfo.textContent =
      `ID: ${photo.id} | Edad: ${photo.age} | Sexo: ${photo.gender} | ` +
      `Estudios: ${photo.studies} | Bachillerato: ${photo.bachType || "N/A"}`;

    ratingControls.forEach(rc => {
      rc.input.value = 5;
      rc.valueSpan.textContent = "5";
    });
    updatePuntf();
    ratingMessage.textContent = "";
  } catch (err) {
    console.error(err);
    noPhotosMessage.textContent = "Error cargando fotografías.";
    noPhotosMessage.classList.remove("hidden");
    photoRatingCard.classList.add("hidden");
  }
}

// Guardar valoración
document.getElementById("save-rating-button").addEventListener("click", async () => {
  if (!currentPhotoForExpert) return;

  const expertId = document.getElementById("expert-id").value.trim();
  if (!expertId) {
    alert("Introduce tu código de experto/a.");
    return;
  }

  if (!ratingControls.length) {
    alert("No hay ítems de valoración configurados.");
    return;
  }

  const ratingsMap = {};
  let sum = 0;
  ratingControls.forEach(rc => {
    const v = Number(rc.input.value);
    sum += v;
    ratingsMap[rc.config.id] = v;
  });
  const puntf = sum / ratingControls.length;

  try {
    await addDoc(ratingsCol, {
      photoId: currentPhotoForExpert.id,
      expertId,
      ratings: ratingsMap,
      puntf,
      createdAt: new Date().toISOString()
    });

    ratingMessage.textContent = "Valoración guardada.";
    ratingMessage.className = "message success";

    loadNextPhotoForExpert();
  } catch (err) {
    console.error(err);
    ratingMessage.textContent = "Error al guardar la valoración.";
    ratingMessage.className = "message error";
  }
});

// Omitir foto
document.getElementById("skip-photo-button").addEventListener("click", () => {
  loadNextPhotoForExpert();
});

// ----- PANEL ADMIN / RESUMEN + EXPORTAR CSV + VISUALIZACIÓN -----
async function updateAdminSummary() {
  try {
    const photosSnap = await getDocs(photosCol);
    const ratingsSnap = await getDocs(ratingsCol);

    const summaryList = document.getElementById("admin-summary-list");
    summaryList.innerHTML = "";

    const li1 = document.createElement("li");
    li1.textContent = `Número de fotografías almacenadas: ${photosSnap.size}`;
    summaryList.appendChild(li1);

    const li2 = document.createElement("li");
    li2.textContent = `Número total de valoraciones registradas: ${ratingsSnap.size}`;
    summaryList.appendChild(li2);

    const expertIds = Array.from(
      new Set(ratingsSnap.docs.map(d => d.data().expertId))
    );
    const li3 = document.createElement("li");
    li3.textContent = `Número de expertos/as activos: ${expertIds.length}`;
    summaryList.appendChild(li3);

    renderAgeChart(photosSnap);
  } catch (err) {
    console.error(err);
  }
}

function renderAgeChart(photosSnap) {
  if (!ageChart) return;

  const ageCounts = {};
  photosSnap.docs.forEach(docSnap => {
    const p = docSnap.data();
    if (typeof p.age === "number") {
      ageCounts[p.age] = (ageCounts[p.age] || 0) + 1;
    }
  });

  ageChart.innerHTML = "";
  if (ageChartNote) ageChartNote.textContent = "";

  const ages = Object.keys(ageCounts).map(a => Number(a)).sort((a, b) => a - b);
  if (ages.length === 0) {
    if (ageChartNote) {
      ageChartNote.textContent = "Todavía no hay datos suficientes para mostrar la distribución por edad.";
    }
    return;
  }

  const maxCount = Math.max(...ages.map(a => ageCounts[a]));
  ages.forEach(age => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = `${age} años`;

    const outer = document.createElement("div");
    outer.className = "chart-bar-outer";

    const inner = document.createElement("div");
    inner.className = "chart-bar-inner";
    const widthPercent = (ageCounts[age] / maxCount) * 100;
    inner.style.width = `${widthPercent}%`;

    outer.appendChild(inner);
    row.appendChild(label);
    row.appendChild(outer);
    ageChart.appendChild(row);
  });

  if (ageChartNote) {
    ageChartNote.textContent = "Cada barra representa el número relativo de fotografías por edad.";
  }
}

// Listado de todas las fotografías y valoraciones
async function loadAllPhotosWithRatings() {
  if (!photosList) return;
  photosList.textContent = "Cargando fotografías y valoraciones...";

  try {
    const [photosSnap, ratingsSnap] = await Promise.all([
      getDocs(photosCol),
      getDocs(ratingsCol)
    ]);

    if (photosSnap.empty) {
      photosList.textContent = "No hay fotografías almacenadas.";
      return;
    }

    const ratingsByPhoto = {};
    ratingsSnap.docs.forEach(docSnap => {
      const r = docSnap.data();
      const photoId = r.photoId;
      if (!photoId) return;
      if (!ratingsByPhoto[photoId]) ratingsByPhoto[photoId] = [];
      ratingsByPhoto[photoId].push({
        id: docSnap.id,
        ...r
      });
    });

    const items = globalConfig.ratingItems && globalConfig.ratingItems.length
      ? globalConfig.ratingItems
      : DEFAULT_RATING_ITEMS;

    photosList.innerHTML = "";
    photosSnap.docs.forEach(docSnap => {
      const p = docSnap.data();
      const photoId = docSnap.id;

      const card = document.createElement("div");
      card.className = "photo-card";

      const img = document.createElement("img");
      img.src = p.dataUrl;
      img.alt = "Fotografía " + photoId;

      const meta = document.createElement("p");
      meta.innerHTML = `
        <strong>ID:</strong> ${photoId}<br>
        Edad: ${p.age ?? ""} | Sexo: ${p.gender || ""}<br>
        Estudios: ${p.studies || ""} | Bachillerato: ${p.bachType || ""}<br>
        Vocación: ${p.vocation || ""}<br>
        Estudios padre: ${p.studiesFather || ""} | madre: ${p.studiesMother || ""}<br>
        Centro: ${p.center || ""}
      `;

      card.appendChild(img);
      card.appendChild(meta);

      const rList = ratingsByPhoto[photoId] || [];
      const ratingsInfo = document.createElement("div");
      ratingsInfo.className = "photo-ratings";

      if (rList.length === 0) {
        ratingsInfo.textContent = "Sin valoraciones aún.";
      } else {
        const avg = rList.reduce(
          (sum, r) => sum + (typeof r.puntf === "number" ? r.puntf : 0),
          0
        ) / rList.length;

        const resumen = document.createElement("p");
        resumen.textContent = `Valoraciones: ${rList.length} | PUNTF media: ${avg.toFixed(2)}`;
        ratingsInfo.appendChild(resumen);

        const table = document.createElement("table");
        const thead = document.createElement("thead");

        let headerHtml = "<tr><th>Experto/a</th>";
        items.forEach(item => {
          headerHtml += `<th>${item.label}</th>`;
        });
        headerHtml += "<th>PUNTF</th></tr>";
        thead.innerHTML = headerHtml;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        rList.forEach(r => {
          const tr = document.createElement("tr");

          const ratingsMap = r.ratings || {};
          let rowHtml = `<td>${r.expertId || ""}</td>`;
          items.forEach((item, idx) => {
            let val = ratingsMap[item.id];
            // Compatibilidad con datos antiguos tipo sub1, sub2...
            if (val === undefined && r[`sub${idx + 1}`] !== undefined) {
              val = r[`sub${idx + 1}`];
            }
            rowHtml += `<td>${val ?? ""}</td>`;
          });
          rowHtml += `<td>${typeof r.puntf === "number" ? r.puntf.toFixed(2) : ""}</td>`;

          tr.innerHTML = rowHtml;
          tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        ratingsInfo.appendChild(table);
      }

      card.appendChild(ratingsInfo);
      photosList.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    photosList.textContent = "Error cargando fotografías y valoraciones.";
  }
}

if (loadPhotosButton) {
  loadPhotosButton.addEventListener("click", loadAllPhotosWithRatings);
}

// Exportar CSV dinámico con ítems configurables
document.getElementById("export-csv-button").addEventListener("click", async () => {
  try {
    const photosSnap = await getDocs(photosCol);
    const ratingsSnap = await getDocs(ratingsCol);

    if (photosSnap.empty) {
      alert("No hay fotografías almacenadas.");
      return;
    }

    const photos = {};
    photosSnap.docs.forEach(docSnap => {
      photos[docSnap.id] = docSnap.data();
    });

    const items = globalConfig.ratingItems && globalConfig.ratingItems.length
      ? globalConfig.ratingItems
      : DEFAULT_RATING_ITEMS;

    const header = [
      "fotoId",
      "sexo",
      "edad",
      "estudios",
      "tipoBach",
      "vocacion",
      "estudios_padre",
      "estudios_madre",
      "repite_curso",
      "suspensos",
      "num_ordenadores_casa",
      "ordenador_habitacion",
      "frecuencia_uso_ordenador",
      "horas_diarias_ordenador",
      "centro_educativo",
      "expertoId"
    ];

    // Añadimos columnas para cada ítem usando su etiqueta
    items.forEach(item => {
      header.push(item.label);
    });

    header.push("puntf");

    const rows = [];
    rows.push(header);

    if (ratingsSnap.empty) {
      Object.entries(photos).forEach(([id, p]) => {
        const base = [
          id,
          p.gender || "",
          p.age ?? "",
          p.studies || "",
          p.bachType || "",
          p.vocation || "",
          p.studiesFather || "",
          p.studiesMother || "",
          p.rep || "",
          p.fail || "",
          p.pcsHome ?? "",
          p.pcRoom || "",
          p.pcFrequency || "",
          p.pcHours ?? "",
          p.center || "",
          ""
        ];

        items.forEach(() => {
          base.push("");
        });

        base.push("");
        rows.push(base);
      });
    } else {
      ratingsSnap.docs.forEach(docSnap => {
        const r = docSnap.data();
        const p = photos[r.photoId];
        if (!p) return;

        const base = [
          r.photoId,
          p.gender || "",
          p.age ?? "",
          p.studies || "",
          p.bachType || "",
          p.vocation || "",
          p.studiesFather || "",
          p.studiesMother || "",
          p.rep || "",
          p.fail || "",
          p.pcsHome ?? "",
          p.pcRoom || "",
          p.pcFrequency || "",
          p.pcHours ?? "",
          p.center || "",
          r.expertId || ""
        ];

        const ratingsMap = r.ratings || {};
        items.forEach((item, idx) => {
          let val = ratingsMap[item.id];
          // compatibilidad con sub1..sub5 antiguos
          if (val === undefined && r[`sub${idx + 1}`] !== undefined) {
            val = r[`sub${idx + 1}`];
          }
          base.push(val ?? "");
        });

        base.push(typeof r.puntf === "number" ? r.puntf.toFixed(2) : "");
        rows.push(base);
      });
    }

    const csvContent = rows.map(row =>
      row.map(value => {
        const str = String(value ?? "");
        if (str.includes(";") || str.includes("\"")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(";")
    ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `creatividad_digital_${now}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert("CSV generado y descargado.");
  } catch (err) {
    console.error(err);
    alert("Ha ocurrido un error al generar el CSV.");
  }
});
