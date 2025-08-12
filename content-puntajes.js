function cssEscapedSelector(id) {
  return /^[0-9]/.test(id) ? `#\\3${id[0]} ${id.slice(1).replace(/_/g, '\\_')}` : `#${id}`;
}
//distritos
let distritosSolicitados = [];
document.querySelectorAll('fieldset label b')
  .forEach(label => {
    const text = label.parentNode.textContent;
    const matches = text.match(/\((\d+)\)/g);
    if (matches) {
      matches.forEach(m => distritosSolicitados.push(m.replace(/\(|\)/g, '')));
    }
  });
  
// eliminar duplicados
distritosSolicitados = [...new Set(distritosSolicitados)];

chrome.storage.local.set({ distritosSolicitados }, () => {
console.log("✅ Distritos guardados: " + distritosSolicitados);
});

console.log(distritosSolicitados);
//nomencladores
function parseNomencladores(tablaId) {
  const selector = `${cssEscapedSelector(tablaId)} tbody tr`;
  const rows = document.querySelectorAll(selector);
  let nivelActual = "";
  const temp = {};

  rows.forEach(row => {
    const nivelCell = row.querySelector("td.group");
    if (nivelCell) {
      nivelActual = nivelCell.innerText.trim().replace(/\s*\(.*?\)\s*/g, '').toUpperCase();
    } else {
      const cells = row.querySelectorAll("td");
      if (cells.length > 0) {
        const nomenclador = cells[0].innerText.trim().toUpperCase().replace(/[()]/g, "");
        if (nomenclador) {
          if (!temp[nomenclador]) temp[nomenclador] = new Set();
          temp[nomenclador].add(nivelActual);
        }
      }
    }
  });

  const habilitados = {};
  Object.entries(temp).forEach(([nomen, nivelesSet]) => {
    habilitados[nomen] = Array.from(nivelesSet);
  });

  chrome.storage.local.set({ habilitados }, () => {
    console.log("✅ Nomencladores cargados:", habilitados);
    mostrarAlerta("✅ Nomencladores cargados. Ya podés ir al APD haciendo click ", "https://misservicios.abc.gob.ar/actos.publicos.digitales/");
  });
}

function iniciarCargaAutomatica() {
  const tabla = document.querySelector("table[id$='_table']"); // detecta cualquier ID que termine en "_table"
  if (!tabla) {
    console.log("⚠️ No se encontró la tabla aún.");
    mostrarAlerta("⚠️ Ingrese listado, DNI y apriete IR");
    observarAparicionTabla();
    return;
  }

  const tablaId = tabla.id;
  ejecutarCargaConTabla(tabla, tablaId);
}

function ejecutarCargaConTabla(tabla, tablaId) {
  const selectLength = document.querySelector(`select[name='${tablaId}_length']`);
  if (selectLength && selectLength.value !== "-1") {
    selectLength.value = "-1";
    selectLength.dispatchEvent(new Event('change'));
  }

  const tbody = tabla.querySelector("tbody");
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        console.log("🔁 Tabla modificada, recargando nomencladores...");
        parseNomencladores(tablaId);
        break;
      }
    }
  });

  if (tbody) {
    observer.observe(tbody, { childList: true, subtree: true });
    console.log("👁️ Observando cambios en la tabla...");
  }

  const filas = tbody.querySelectorAll("tr");
  if (filas.length > 0) {
    parseNomencladores(tablaId);
  } else {
    console.log("⏳ Esperando a que se complete la búsqueda...");
  }
}

function observarAparicionTabla() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1 && node.tagName === "TABLE" && node.id.endsWith("_table")) {
          console.log("✅ Tabla detectada en el DOM.");
          observer.disconnect();
          ejecutarCargaConTabla(node, node.id);
          return;
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
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

// Iniciar el proceso
iniciarCargaAutomatica();
