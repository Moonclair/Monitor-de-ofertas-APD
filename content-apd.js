// Solo ejecutar si venimos desde la extensión
if (sessionStorage.getItem("autoClickPostularse") === "true") {
  mostrarAlerta("⚠️ Para continuar, hacé clic en el botón 'Postularse'. Si no aparece, debés iniciar sesión");
  sessionStorage.removeItem("autoClickPostularse");
}


function mostrarAlerta(mensaje, url) {
  if (document.getElementById("alerta-puntajes-ext")) return;

  const alerta = document.createElement("div");
  alerta.id = "alerta-puntajes-ext";
  alerta.style = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #ccffcc;
    color: #000;
    padding: 12px 18px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    z-index: 9999;
    font-family: sans-serif;
  `;

  if (url) {
    alerta.innerHTML = `${mensaje} <a href="#" id="ir-apd-link" style="color: blue; text-decoration: underline; cursor: pointer;">aquí</a>`;
  } else {
    alerta.textContent = mensaje;
  }

  document.body.appendChild(alerta);

  // ⬇️ Si hay URL, interceptar el click
  if (url) {
 document.getElementById("ir-apd-link").addEventListener("click", () => {
  sessionStorage.setItem("autoClickPostularse", "true");
  window.open(url, "_blank");
});

  }

  setTimeout(() => {
    alerta.style.transition = "opacity 0.5s ease";
    alerta.style.opacity = 0;
    setTimeout(() => alerta.remove(), 500);
  }, 6000);
}


