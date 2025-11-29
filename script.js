// script.js (versión con Firebase + Firestore)

// ----- IMPORTS DE FIREBASE DESDE CDN -----
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where
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

// Botones "Volver al inicio"
const backButtons = document.querySelectorAll(".back-button");
backButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    // Ocultar secciones de roles
    uploadSection.classList.add("hidden");
    expertSection.classList.add("hidden");
    adminSection.classList.add("hidden");

    // Mostrar de nuevo la pantalla de login
    loginSection.classList.remove("hidden");

    // Resetear selector y contraseña
    const roleSelect = document.getElementById("role-select");
    const accessPassword = document.getElementById("access-password");
    if (roleSelect) roleSelect.value = "";
    if (accessPassword) accessPassword.value = "";
  });
});


function showSection(sectionId) {
  [uploadSection, expertSection, adminSection].forEach(sec => sec.classList.add("hidden"));
  if (sectionId === "upload") uploadSection.classList.remove("hidden");
  if (sectionId === "expert") expertSection.classList.remove("hidden");
  if (sectionId === "admin") adminSection.classList.remove("hidden");
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

uploadForm.addEventListener("submit", (e) => {
  e.preventDefault();
  uploadMessage.textContent = "";
  uploadMessage.className = "message";

  const fileInput = document.getElementById("photo-file");
  const age = document.getElementById("age").value;
  const gender = document.getElementById("gender").value;
  const studies = document.getElementById("studies").value;
  const bachType = document.getElementById("bach-type").value;
  const vocation = document.getElementById("vocation").value.trim();

  if (!fileInput.files || !fileInput.files[0]) {
    uploadMessage.textContent = "Debes seleccionar una fotografía.";
    uploadMessage.classList.add("error");
    return;
  }

  const file = fileInput.files[0];
  if (file.size > 5 * 1024 * 1024) {
    uploadMessage.textContent = "La fotografía supera el tamaño máximo de 5 MB.";
    uploadMessage.classList.add("error");
    return;
  }

  // Indicamos visualmente que está procesando
  uploadMessage.textContent = "Procesando fotografía...";
  uploadMessage.className = "message";

  const reader = new FileReader();

  reader.onload = async function (event) {
    const dataUrl = event.target.result;

    try {
      const docRef = await addDoc(photosCol, {
        dataUrl: dataUrl,
        age: Number(age),
        gender: gender,
        studies: studies,
        bachType: bachType,
        vocation: vocation,
        createdAt: new Date().toISOString()
      });

      const photoId = docRef.id;

      uploadMessage.textContent = "Fotografía guardada correctamente en la base de datos. ¡Gracias por tu participación!";
      uploadMessage.className = "message success";

      uploadPreview.classList.remove("hidden");
      previewImage.src = dataUrl;
      previewMeta.textContent =
        "ID: " + photoId +
        " | Edad: " + age +
        " | Sexo: " + gender +
        " | Estudios: " + studies +
        " | Bachillerato: " + (bachType || "N/A");

      uploadForm.reset();
      document.getElementById("bach-type").value = "";
    } catch (err) {
      console.error("Error al guardar en Firestore:", err);
      uploadMessage.textContent =
        "Ha ocurrido un error al guardar la fotografía: " + (err && err.message ? err.message : "");
      uploadMessage.className = "message error";
    }
  };

  reader.onerror = function (event) {
    console.error("Error al leer el archivo con FileReader:", event);
    uploadMessage.textContent = "No se ha podido leer la fotografía en este navegador.";
    uploadMessage.className = "message error";
  };

  try {
    reader.readAsDataURL(file);
  } catch (err) {
    console.error("Excepción al iniciar FileReader:", err);
    uploadMessage.textContent = "Ha ocurrido un error al procesar la fotografía.";
    uploadMessage.className = "message error";
  }
});

// ----- VALORACIÓN POR EXPERTOS -----
const sub1 = document.getElementById("sub1");
const sub2 = document.getElementById("sub2");
const sub3 = document.getElementById("sub3");
const sub4 = document.getElementById("sub4");
const sub5 = document.getElementById("sub5");

const sub1Value = document.getElementById("sub1-value");
const sub2Value = document.getElementById("sub2-value");
const sub3Value = document.getElementById("sub3-value");
const sub4Value = document.getElementById("sub4-value");
const sub5Value = document.getElementById("sub5-value");
const puntfSpan = document.getElementById("puntf-value");

const ratingArea = document.getElementById("rating-area");
const noPhotosMessage = document.getElementById("no-photos-message");
const photoRatingCard = document.getElementById("photo-rating-card");
const ratingPhoto = document.getElementById("rating-photo");
const ratingPhotoInfo = document.getElementById("rating-photo-info");
const ratingMessage = document.getElementById("rating-message");

let currentPhotoForExpert = null;

function updatePuntf() {
  const values = [sub1, sub2, sub3, sub4, sub5].map(i => Number(i.value));
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  puntfSpan.textContent = avg.toFixed(1);
}

[sub1, sub2, sub3, sub4, sub5].forEach((input, index) => {
  const spans = [sub1Value, sub2Value, sub3Value, sub4Value, sub5Value];
  input.addEventListener("input", () => {
    spans[index].textContent = input.value;
    updatePuntf();
  });
});

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
    const photos = photosSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
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
      `Estudios: ${photo.studies} | Bachillerato: ${photo.bachType}`;

    [sub1, sub2, sub3, sub4, sub5].forEach(slider => { slider.value = 5; });
    [sub1Value, sub2Value, sub3Value, sub4Value, sub5Value].forEach(span => {
      span.textContent = "5";
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

  const v1 = Number(sub1.value);
  const v2 = Number(sub2.value);
  const v3 = Number(sub3.value);
  const v4 = Number(sub4.value);
  const v5 = Number(sub5.value);
  const puntf = (v1 + v2 + v3 + v4 + v5) / 5;

  try {
    await addDoc(ratingsCol, {
      photoId: currentPhotoForExpert.id,
      expertId,
      sub1: v1,
      sub2: v2,
      sub3: v3,
      sub4: v4,
      sub5: v5,
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

// ----- PANEL ADMIN / RESUMEN + EXPORTAR CSV -----
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
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("export-csv-button").addEventListener("click", async () => {
  try {
    const photosSnap = await getDocs(photosCol);
    const ratingsSnap = await getDocs(ratingsCol);

    if (photosSnap.empty) {
      alert("No hay fotografías almacenadas.");
      return;
    }

    const photos = {};
    photosSnap.docs.forEach(doc => {
      photos[doc.id] = doc.data();
    });

    const header = [
      "fotoId",
      "sexo",
      "edad",
      "estudios",
      "tipoBach",
      "vocacion",
      "expertoId",
      "sub1_originalidad",
      "sub2_expresion",
      "sub3_tecnicas_digitales",
      "sub4_composicion",
      "sub5_interaccion",
      "puntf"
    ];

    const rows = [];
    rows.push(header);

    if (ratingsSnap.empty) {
      Object.entries(photos).forEach(([id, p]) => {
        rows.push([
          id,
          p.gender,
          p.age,
          p.studies,
          p.bachType,
          p.vocation || "",
          "",
          "",
          "",
          "",
          "",
          "",
          ""
        ]);
      });
    } else {
      ratingsSnap.docs.forEach(doc => {
        const r = doc.data();
        const p = photos[r.photoId];
        if (!p) return;

        rows.push([
          r.photoId,
          p.gender,
          p.age,
          p.studies,
          p.bachType,
          p.vocation || "",
          r.expertId,
          r.sub1,
          r.sub2,
          r.sub3,
          r.sub4,
          r.sub5,
          r.puntf.toFixed(2)
        ]);
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
    const a = document.createElement("a");
    a.href = url;
    const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
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
