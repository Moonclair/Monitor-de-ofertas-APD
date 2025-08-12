document.getElementById("analizar").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const url = tab.url;
    const baseUrl = "https://misservicios.abc.gob.ar/servaddo/puntaje.ingreso.docencia/";

    const estaEnPaginaBase = url === baseUrl;
    const estaEnSubpagina = url.startsWith(baseUrl) && url.includes("documento=");

    if (estaEnSubpagina || estaEnPaginaBase) {
      // Ejecutar inline script que verifica la tabla y muestra alerta si no está
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          function mostrarAlerta(mensaje) {
            const anterior = document.getElementById("alerta-puntajes-ext");
            if (anterior) anterior.remove();

            const alerta = document.createElement("div");
            alerta.id = "alerta-puntajes-ext";
            alerta.textContent = mensaje;
            Object.assign(alerta.style, {
              position: "fixed",
              top: "20px",
              right: "20px",
              backgroundColor: "#ffcc00",
              color: "#000",
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: "bold",
              borderRadius: "8px",
              boxShadow: "0 0 10px rgba(0,0,0,0.3)",
              zIndex: 9999,
              fontFamily: "sans-serif"
            });

            document.body.appendChild(alerta);

            setTimeout(() => {
              alerta.style.transition = "opacity 0.5s ease";
              alerta.style.opacity = 0;
              setTimeout(() => alerta.remove(), 500);
            }, 4000);
          }

          const tabla = document.querySelector("#\\31 08b_table");

          if (!tabla) {
            mostrarAlerta("\u26A0\uFE0F Ingrese listado, DNI y apriete IR");
          } else {
            // Si la tabla está, inyectar content-puntajes.js para hacer el análisis
            chrome.runtime.sendMessage({ action: "ejecutarContenido" });
          }
        }
      });
    } else {
      // Si no está en la página base o subpágina, abrir a la base
      chrome.tabs.create({ url: baseUrl });

    }
  });
});

// Escuchar mensaje para inyectar content-puntajes.js (una sola vez al confirmar tabla)
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "ejecutarContenido" && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ["content-puntajes.js"]
    });
  }
});


document.getElementById("ofertas").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    alert("No se encontró una pestaña activa.");
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content-ofertas.js"] // Asegurate de que se llame así el archivo
  });
});

document.getElementById('donacion').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('sobre-mi.html') });
});
