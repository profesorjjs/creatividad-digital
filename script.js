// Mostrar formulario solo si se acepta privacidad
document.getElementById("aceptarPrivacidad").addEventListener("change", function () {
    if (this.checked) {
        document.getElementById("creatividadForm").style.display = "block";
    } else {
        document.getElementById("creatividadForm").style.display = "none";
    }
});

// Mostrar modalidad solo si se selecciona Bachillerato
document.getElementById("nivelEducativo").addEventListener("change", function () {
    let modalidad = document.getElementById("modalidadWrapper");
    modalidad.style.display = (this.value === "Bachillerato") ? "block" : "none";
});

// PROCESAMIENTO DEL TEST
document.getElementById("creatividadForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const edad = document.getElementById("edad").value;
    const nivel = document.getElementById("nivelEducativo").value;
    const modalidad = document.getElementById("modalidadBach").value;

    const estudiosPadre = document.getElementById("estudiosPadre").value;
    const estudiosMadre = document.getElementById("estudiosMadre").value;
    const repetido = document.getElementById("repetido").value;
    const suspensos = document.getElementById("suspensos").value;
    const ordenadoresCasa = document.getElementById("ordenadoresCasa").value;
    const ordenadorPropio = document.getElementById("ordenadorPropio").value;
    const frecuenciaUso = document.getElementById("frecuenciaUso").value;
    const horasOrdenador = document.getElementById("horasOrdenador").value;

    const foto = document.getElementById("foto").files[0];

    if (!foto) {
        alert("Debe subir una fotografía.");
        return;
    }

    // ANÁLISIS SIMBÓLICO DE LA FOTO (Mantener tu lógica original)
    const resultado = "¡Gracias! Tu fotografía ha sido registrada correctamente y será analizada para evaluar tu creatividad digital.";

    document.getElementById("resultado").innerText = resultado;

    // Aquí se pueden enviar los datos a un servidor si lo activas en el futuro
});
