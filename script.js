// script.js (versión con Firebase + Firestore + IA ligera)

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

// Ítems de valoración por defecto (expertos)
const DEFAULT_RATING_ITEMS = [
  { id: "item1", label: "Originalidad y novedad" },
  { id: "item2", label: "Expresión creativa y emocional" },
  { id: "item3", label: "Uso innovador de técnicas digitales" },
  { id: "item4", label: "Composición visual y técnica" },
  { id: "item5", label: "Interacción y cocreación" }
];

// Configuración IA ligera por defecto
const DEFAULT_AI_CONFIG = {
  enabled: false,
  features: {
    brightness: { enabled: true, weight: 25 },
    contrast: { enabled: true, weight: 25 },
    colorfulness: { enabled: true, weight: 25 },
    edgeDensity: { enabled: true, weight: 25 }
  }
};

// Configuración global simple
let globalConfig = {
  askCenter: false,
  centers: [],
  ratingItems: DEFAULT_RATING_ITEMS,
  aiConfig: DEFAULT_AI_CONFIG
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

// IA ligera: controles en Admin
const aiEnabledToggle = document.getElementById("ai-enabled-toggle");
const aiBrightnessEnabled = document.getElementById("ai-brightness-enabled");
const aiBrightnessWeight = document.getElementById("ai-brightness-weight");
const aiContrastEnabled = document.getElementById("ai-contrast-enabled");
const aiContrastWeight = document.getElementById("ai-contrast-weight");
const aiColorfulnessEnabled = document.getElementById("ai-colorfulness-enabled");
const aiColorfulnessWeight = document.getElementById("ai-colorfulness-weight");
const aiEdgeDensityEnabled = document.getElementById("ai-edgedensity-enabled");
const aiEdgeDensityWeight = document.getElementById("ai-edgedensity-weight");
const saveAiConfigButton = document.getElementById("save-ai-config-button");

// Rating dinámico (expertos)
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

function applyAiConfigToAdmin() {
  const ai = globalConfig.aiConfig || DEFAULT_AI_CONFIG;

  if (aiEnabledToggle) {
    aiEnabledToggle.checked = !!ai.enabled;
  }

  const feats = ai.features || DEFAULT_AI_CONFIG.features;

  if (aiBrightnessEnabled && feats.brightness) {
    aiBrightnessEnabled.checked = !!feats.brightness.enabled;
    aiBrightnessWeight.value = feats.brightness.weight ?? 25;
  }

  if (aiContrastEnabled && feats.contrast) {
    aiContrastEnabled.checked = !!feats.contrast.enabled;
    aiContrastWeight.value = feats.contrast.weight ?? 25;
  }

  if (aiColorfulnessEnabled && feats.colorfulness) {
    aiColorfulnessEnabled.checked = !!feats.colorfulness.enabled;
    aiColorfulnessWeight.value = feats.colorfulness.weight ?? 25;
  }

  if (aiEdgeDensityEnabled && feats.edgeDensity) {
    aiEdgeDensityEnabled.checked = !!feats.edgeDensity.enabled;
    aiEdgeDensityWeight.value = feats.edgeDensity.weight ?? 25;
  }
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
  applyAiConfigToAdmin();
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

// Merge IA config con defaults
function mergeAiConfig(dataAi) {
  const base = JSON.parse(JSON.stringify(DEFAULT_AI_CONFIG));
  if (!dataAi) return base;

  base.enabled = !!dataAi.enabled;

  const srcFeat = dataAi.features || {};
  for (const key of Object.keys(base.features)) {
    if (srcFeat[key]) {
      base.features[key].enabled = !!srcFeat[key].enabled;
      const w = Number(srcFeat[key].weight);
      base.features[key].weight = Number.isFinite(w) ? w : base.features[key].weight;
    }
  }
  return base;
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
      globalConfig.aiConfig = mergeAiConfig(data.aiConfig);
    } else {
      globalConfig.askCenter = false;
      globalConfig.centers = [];
      globalConfig.ratingItems = DEFAULT_RATING_ITEMS;
      globalConfig.aiConfig = DEFAULT_AI_CONFIG;
    }
  } catch (err) {
    console.error("Error cargando configuración global:", err);
    globalConfig.askCenter = false;
    globalConfig.centers = [];
    globalConfig.ratingItems = DEFAULT_RATING_ITEMS;
    globalConfig.aiConfig = DEFAULT_AI_CONFIG;
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
        payload.aiConfig = globalConfig.aiConfig || DEFAULT_AI_CONFIG;
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
        payload.aiConfig = globalConfig.aiConfig || DEFAULT_AI_CONFIG;
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
        payload.aiConfig = globalConfig.aiConfig || DEFAULT_AI_CONFIG;
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

// Guardar configuración IA ligera
if (saveAiConfigButton) {
  saveAiConfigButton.addEventListener("click", async () => {
    const ai = {
      enabled: aiEnabledToggle ? aiEnabledToggle.checked : false,
      features: {
        brightness: {
          enabled: aiBrightnessEnabled ? aiBrightnessEnabled.checked : true,
          weight: Number(aiBrightnessWeight?.value || 0)
        },
        contrast: {
          enabled: aiContrastEnabled ? aiContrastEnabled.checked : true,
          weight: Number(aiContrastWeight?.value || 0)
        },
        colorfulness: {
          enabled: aiColorfulnessEnabled ? aiColorfulnessEnabled.checked : true,
          weight: Number(aiColorfulnessWeight?.value || 0)
        },
        edgeDensity: {
          enabled: aiEdgeDensityEnabled ? aiEdgeDensityEnabled.checked : true,
          weight: Number(aiEdgeDensityWeight?.value || 0)
        }
      }
    };

    globalConfig.aiConfig = ai;

    try {
      const snap = await getDoc(configDocRef);
      const payload = { aiConfig: ai };
      if (!snap.exists()) {
        payload.askCenter = globalConfig.askCenter;
        payload.centers = globalConfig.centers || [];
        payload.ratingItems = globalConfig.ratingItems || DEFAULT_RATING_ITEMS;
        await setDoc(configDocRef, payload);
      } else {
        await updateDoc(configDocRef, payload);
      }
      alert("Configuración de IA actualizada.");
    } catch (err) {
      console.error("Error guardando configuración IA:", err);
      alert("No se ha podido guardar la configuración de IA.");
    }
  });
}

// Reinicializar base de datos (borrar todas las fotos y valoraciones)
if (resetDbButton) {
  resetDbButton.addEventListener("click", async () => {
    const ok = confirm(
      "Esta acción borrará TODAS las fotografías y valoraciones de la base de datos. " +
      "La configuración (centros, ítems, IA, etc.) se mantendrá. ¿Seguro que quieres continuar?"
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

// ================================================
// Redimensionar y comprimir la imagen (ya adaptado a móvil)
// ================================================
function resizeImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith("image/")) {
      reject(new Error("El archivo seleccionado no es una imagen."));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
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

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se ha podido leer la imagen. El formato puede no ser compatible con este navegador."));
    };

    img.src = url;
  });
}

// ================================================
// IA ligera: análisis simple de la imagen en el cliente
// ================================================
function clamp01(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function computeAiFeaturesFromDataUrl(dataUrl, aiConfig) {
  return new Promise((resolve) => {
    if (!aiConfig || !aiConfig.enabled) {
      resolve({ features: null, score: null });
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        // Reducimos la imagen a algo manejable, por ejemplo 256 px de lado mayor
        const maxSide = 256;
        let w = img.width;
        let h = img.height;
        const scale = Math.min(maxSide / w, maxSide / h, 1);
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const n = w * h;

        let sumLum = 0;
        let sumLum2 = 0;
        let sumColorDiff = 0;

        const lumArr = new Float32Array(n);

        for (let i = 0; i < n; i++) {
          const r = data[i * 4] / 255;
          const g = data[i * 4 + 1] / 255;
          const b = data[i * 4 + 2] / 255;

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          lumArr[i] = lum;
          sumLum += lum;
          sumLum2 += lum * lum;

          const cd = (Math.abs(r - g) + Math.abs(r - b) + Math.abs(g - b)) / 3;
          sumColorDiff += cd;
        }

        const meanLum = sumLum / n;
        const varLum = sumLum2 / n - meanLum * meanLum;
        const stdLum = Math.sqrt(Math.max(varLum, 0));

        const brightnessRaw = meanLum;              // 0–1
        const contrastRaw = stdLum;                // ~0–0.5
        const colorfulnessRaw = sumColorDiff / n;  // 0–1 aprox

        // Edge density (muy simple, usando gradiente sobre la luminancia)
        let edgeSum = 0;
        let edgeCount = 0;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            const idxL = y * w + (x - 1);
            const idxR = y * w + (x + 1);
            const idxU = (y - 1) * w + x;
            const idxD = (y + 1) * w + x;

            const dx = lumArr[idxR] - lumArr[idxL];
            const dy = lumArr[idxD] - lumArr[idxU];
            const mag = Math.sqrt(dx * dx + dy * dy);
            edgeSum += mag;
            edgeCount++;
          }
        }
        const edgeDensityRaw = edgeCount > 0 ? edgeSum / edgeCount : 0; // 0–~0.7

        const features = {
          brightness: brightnessRaw,
          contrast: contrastRaw,
          colorfulness: colorfulnessRaw,
          edgeDensity: edgeDensityRaw
        };

        // Normalización heurística por parámetro (0–1)
        function normalizeFeature(name, value) {
          switch (name) {
            case "brightness":
              // Máximo cerca de 0.5, penaliza muy oscuro o muy quemado
              return clamp01(1 - 2 * Math.abs(value - 0.5));
            case "contrast":
              // Asumimos contraste "interesante" en torno a 0.25
              return clamp01(value / 0.25);
            case "colorfulness":
              // Valores habituales 0–0.6 aprox
              return clamp01(value / 0.4);
            case "edgeDensity":
              // Algo de estructura; asumimos interesante hasta ~0.3
              return clamp01(value / 0.3);
            default:
              return clamp01(value);
          }
        }

        const weights = aiConfig.features || {};
        let num = 0;
        let den = 0;

        for (const key of Object.keys(features)) {
          const fConf = weights[key];
          if (!fConf || !fConf.enabled) continue;
          const wgt = Number(fConf.weight) || 0;
          if (wgt <= 0) continue;
          const normVal = normalizeFeature(key, features[key]);
          num += normVal * wgt;
          den += wgt;
        }

        let score = null;
        if (den > 0) {
          const avg01 = num / den;          // 0–1
          score = +(avg01 * 10).toFixed(1); // 0–10 con 1 decimal
        }

        resolve({ features, score });
      } catch (err) {
        console.error("Error calculando IA ligera:", err);
        resolve({ features: null, score: null });
      }
    };

    img.onerror = () => {
      console.error("No se ha podido cargar la imagen para IA ligera.");
      resolve({ features: null, score: null });
    };

    img.src = dataUrl;
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

    // IA ligera: cálculo de parámetros y score
    let aiFeatures = null;
    let aiScore = null;
    try {
      const aiResult = await computeAiFeaturesFromDataUrl(dataUrl, globalConfig.aiConfig);
      aiFeatures = aiResult.features;
      aiScore = aiResult.score;
    } catch (err) {
      console.error("Error IA ligera:", err);
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
      aiFeatures: aiFeatures,
      aiScore: aiScore,
      createdAt: new Date().toISOString()
    });

    const photoId = docRef.id;

    uploadMessage.textContent = "Fotografía guardada correctamente en la base de datos. ¡Gracias por tu participación!";
    uploadMessage.className = "message success";

    uploadPreview.classList.remove("hidden");
    previewImage.src = dataUrl;
    const aiText = aiScore != null ? ` | AI_PUNTF: ${aiScore}` : "";
    previewMeta.textContent =
      "ID: " + photoId +
      " | Edad: " + ageValue +
      " | Sexo: " + gender +
      " | Estudios: " + studies +
      " | Bachillerato: " + (bachType || "N/A") +
      aiText;

    uploadForm.reset();
    if (bachWrapper) bachWrapper.style.display = "none";
    applyConfigToUpload(); // reconstruir select de centros tras reset
  } catch (err) {
    console.error("Error al procesar o guardar la fotografía:", err);
    uploadMessage.textContent =
      "Ha ocurrido un problema al procesar la fotografía. Es posible que el formato de la imagen no sea compatible en este dispositivo.";
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
    const aiText = photo.aiScore != null ? ` | AI_PUNTF: ${photo.aiScore}` : "";
    ratingPhotoInfo.textContent =
      `ID: ${photo.id} | Edad: ${photo.age} | Sexo: ${photo.gender} | ` +
      `Estudios: ${photo.studies} | Bachillerato: ${photo.bachType || "N/A"}` +
      aiText;

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

// Guardar valoración de experto
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

      const aiText = p.aiScore != null ? ` | AI_PUNTF: ${p.aiScore}` : "";

      const meta = document.createElement("p");
      meta.innerHTML = `
        <strong>ID:</strong> ${photoId}<br>
        Edad: ${p.age ?? ""} | Sexo: ${p.gender || ""}<br>
        Estudios: ${p.studies || ""} | Bachillerato: ${p.bachType || ""}<br>
        Vocación: ${p.vocation || ""}<br>
        Estudios padre: ${p.studiesFather || ""} | madre: ${p.studiesMother || ""}<br>
        Centro: ${p.center || ""}${aiText ? "<br>" + aiText : ""}
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

// Exportar CSV dinámico con ítems configurables + IA ligera
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
      "ai_brightness",
      "ai_contrast",
      "ai_colorfulness",
      "ai_edgeDensity",
      "ai_score",
      "expertoId"
    ];

    items.forEach(item => {
      header.push(item.label);
    });

    header.push("puntf");

    const rows = [];
    rows.push(header);

    if (ratingsSnap.empty) {
      Object.entries(photos).forEach(([id, p]) => {
        const f = p.aiFeatures || {};
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
          f.brightness ?? "",
          f.contrast ?? "",
          f.colorfulness ?? "",
          f.edgeDensity ?? "",
          p.aiScore ?? "",
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

        const f = p.aiFeatures || {};

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
          f.brightness ?? "",
          f.contrast ?? "",
          f.colorfulness ?? "",
          f.edgeDensity ?? "",
          p.aiScore ?? "",
          r.expertId || ""
        ];

        const ratingsMap = r.ratings || {};
        items.forEach((item, idx) => {
          let val = ratingsMap[item.id];
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
