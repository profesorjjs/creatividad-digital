// --- Configuración básica de claves (prototipo) ---
const PASSWORDS = {
  uploader: "alumno2025",
  expert: "experto2025",
  admin: "admin2025"
};

// --- Utilidades de almacenamiento en localStorage ---
function getStoredArray(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setStoredArray(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

// Claves de almacenamiento
const PHOTOS_KEY = "cd_photos";
const RATINGS_KEY = "cd_ratings";

// --- Gestión de secciones ---
const loginSection = document.getElementById("login-section");
const uploadSection = document.getElementById("upload-section");
const expertSection = document.getElementById("expert-section");
const adminSection = document.getElementById("admin-section");

function showSection(sectionId) {
  [uploadSection, expertSection, adminSection].forEach(sec => sec.classList.add("hidden"));
  if (sectionId === "upload") uploadSection.classList.remove("hidden");
  if (sectionId === "expert") expertSection.classList.remove("hidden");
  if (sectionId === "admin") adminSection.classList.remove("hidden");
}

// --- Login / acceso por rol ---
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

  // Acceso concedido
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

// --- Subida de fotografía ---
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

  // Convertimos la imagen a URL local (DataURL) para el prototipo
  const reader = new FileReader();
  reader.onload = function (event) {
    const dataUrl = event.target.result;

    // Creamos un ID sencillo para la foto
    const photoId = "F" + Date.now();

    const photo = {
      id: photoId,
      dataUrl,
      age: Number(age),
      gender,
      studies,
      bachType,
      vocation,
      createdAt: new Date().toISOString()
    };

    const photos = getStoredArray(PHOTOS_KEY);
    photos.push(photo);
    setStoredArray(PHOTOS_KEY, photos);

    uploadMessage.textContent = "Fotografía guardada correctamente. ¡Gracias por tu participación!";
    uploadMessage.classList.add("success");

    // Mostrar vista previa
    uploadPreview.classList.remove("hidden");
    previewImage.src = dataUrl;
    previewMeta.textContent = `ID: ${photoId} | Edad: ${age} | Sexo: ${gender} | Estudios: ${studies} | Bachillerato: ${bachType || "N/A"}`;

    // Resetear formulario
    uploadForm.reset();
    document.getElementById("bach-type").value = "";
  };

  reader.readAsDataURL(file);
});

// --- Valoración por expertos ---
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
  input.addEventListener("input", () => {
    const spans = [sub1Value, sub2Value, sub3Value, sub4Value, sub5Value];
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

function loadNextPhotoForExpert() {
  const expertId = document.getElementById("expert-id").value.trim();
  if (!expertId) return;

  const photos = getStoredArray(PHOTOS_KEY);
  const ratings = getStoredArray(RATINGS_KEY);

  // Filtrar fotos ya valoradas por este experto
  const ratedPhotoIds = new Set(
    ratings.filter(r => r.expertId === expertId).map(r => r.photoId)
  );

  // Elegimos una foto pendiente al azar
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
  ratingPhotoInfo.textContent = `ID: ${photo.id} | Edad: ${photo.age} | Sexo: ${photo.gender} | Estudios: ${photo.studies} | Bachillerato: ${photo.bachType}`;

  // Reset de sliders
  [sub1, sub2, sub3, sub4, sub5].forEach(slider => {
    slider.value = 5;
  });
  [sub1Value, sub2Value, sub3Value, sub4Value, sub5Value].forEach(span => {
    span.textContent = "5";
  });
  updatePuntf();
  ratingMessage.textContent = "";
}

// Guardar valoración
document.getElementById("save-rating-button").addEventListener("click", () => {
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

  const rating = {
    photoId: currentPhotoForExpert.id,
    expertId,
    sub1: v1,
    sub2: v2,
    sub3: v3,
    sub4: v4,
    sub5: v5,
    puntf,
    createdAt: new Date().toISOString()
  };

  const ratings = getStoredArray(RATINGS_KEY);
  ratings.push(rating);
  setStoredArray(RATINGS_KEY, ratings);

  ratingMessage.textContent = "Valoración guardada.";
  ratingMessage.className = "message success";

  // Cargar siguiente foto
  loadNextPhotoForExpert();
});

// Omitir foto (no guarda nada)
document.getElementById("skip-photo-button").addEventListener("click", () => {
  loadNextPhotoForExpert();
});

// --- Panel de administración / exportar CSV ---
function updateAdminSummary() {
  const photos = getStoredArray(PHOTOS_KEY);
  const ratings = getStoredArray(RATINGS_KEY);

  const summaryList = document.getElementById("admin-summary-list");
  summaryList.innerHTML = "";

  const li1 = document.createElement("li");
  li1.textContent = `Número de fotografías almacenadas: ${photos.length}`;
  summaryList.appendChild(li1);

  const li2 = document.createElement("li");
  li2.textContent = `Número total de valoraciones registradas: ${ratings.length}`;
  summaryList.appendChild(li2);

  const expertIds = Array.from(new Set(ratings.map(r => r.expertId)));
  const li3 = document.createElement("li");
  li3.textContent = `Número de expertos/as activos: ${expertIds.length}`;
  summaryList.appendChild(li3);
}

// Exportar CSV
document.getElementById("export-csv-button").addEventListener("click", () => {
  const photos = getStoredArray(PHOTOS_KEY);
  const ratings = getStoredArray(RATINGS_KEY);

  if (photos.length === 0) {
    alert("No hay fotografías almacenadas.");
    return;
  }

  if (ratings.length === 0) {
    const proceed = confirm("No hay valoraciones registradas. ¿Quieres exportar sólo los datos de las fotografías?");
    if (!proceed) return;
  }

  // Creamos un diccionario de fotos por ID
  const photoMap = {};
  photos.forEach(p => {
    photoMap[p.id] = p;
  });

  // Cabecera
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

  if (ratings.length === 0) {
    // Sólo filas de fotos sin valoraciones (expertId vacío)
    photos.forEach(p => {
      rows.push([
        p.id,
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
    // Una fila por valoración
    ratings.forEach(r => {
      const p = photoMap[r.photoId];
      if (!p) return; // Por si acaso

      rows.push([
        p.id,
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

  // Construimos el CSV
  const csvContent = rows.map(row =>
    row.map(value => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes("\"")) {
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
});
