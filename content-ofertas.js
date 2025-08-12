// Función para extraer y agrupar niveles y nomencladores desde la tabla ya cargada
	
function extraerHabilitadosDesdeTabla() {
  const rows = document.querySelectorAll("#\\31 08b_table tbody tr");
  let nivelActual = "";
  const temp = {};

  rows.forEach(row => {
    const nivelCell = row.querySelector("td.group[colspan='9']");
    if (nivelCell) {
      nivelActual = nivelCell.innerText.trim().toUpperCase();
    } else {
      const cells = row.querySelectorAll("td");
      if (cells.length > 0) {
        const nomenclador = cells[0].innerText.trim().toUpperCase();
        if (nomenclador) {
          if (!temp[nomenclador]) temp[nomenclador] = new Set();
          temp[nomenclador].add(nivelActual);
        }
      }
    }
  });

  // Convertir sets a arrays normales
  const habilitadosDinamicos = {};
  Object.entries(temp).forEach(([nomen, nivelesSet]) => {
    habilitadosDinamicos[nomen] = Array.from(nivelesSet);
  });

  return habilitadosDinamicos;
}


(async function () {


const { habilitados } = await new Promise(resolve =>
  chrome.storage.local.get(['habilitados'], resolve)
);



  const resultados = [];
  const rowsPerPage = 100;
  let start = 0;
  
const { distritosSolicitados } = await new Promise(resolve =>
  chrome.storage.local.get(['distritosSolicitados'], resolve)
);

async function fetchPage(start) {

  const baseURL = 'https://servicios3.abc.gob.ar/valoracion.docente/api/apd.oferta.encabezado/select';
	const fqValues = [
	  'estado:Publicada',
	  'finoferta:[2025-07-11T00:38:10Z TO *]',
	  `numdistrito:(${distritosSolicitados.join(' OR ')})`
	  
	];
	
  const url = new URL(baseURL);
  url.searchParams.append('q', '*:*');
  url.searchParams.append('facet', 'true');
  ['descdistrito', 'descnivelmodalidad', 'cargo', 'estado'].forEach(f => url.searchParams.append('facet.field', f));
  url.searchParams.append('facet.limit', '20');
  url.searchParams.append('facet.mincount', '1');
  url.searchParams.append('json.nl', 'map');
  url.searchParams.append('wt', 'json');
  url.searchParams.append('rows', rowsPerPage.toString());
  url.searchParams.append('start', start.toString());
  fqValues.forEach(fq => url.searchParams.append('fq', fq));
  url.searchParams.append('sort', 'finoferta asc');

  const response = await fetch(url.toString());

  if (!response.ok) throw new Error(`Error en la API: ${response.status}`);

  const data = await response.json();

  // 📊 MOSTRAR CUÁNTAS HAY EN TOTAL SEGÚN LA API
  console.log(`📊 Total de ofertas reportadas por la API: ${data.response?.numFound}`);

  return data;
}



function filtrarYProcesarOferta(oferta) {
  const cod = (oferta.areaincumbencia || "").toUpperCase();
  const nivel = (oferta.descnivelmodalidad || "").replace(/\s*\(.*?\)\s*/g, '').toUpperCase();

  // Chequear si el código y nivel están permitidos
  if (!cod || !(cod in habilitados)) return false;
  if (!habilitados[cod].includes(nivel)) return false;

  return true;
}


  function parsearDatosDeOferta(oferta) {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const horarios = dias
      .map(dia => oferta[dia] ? `${dia.charAt(0).toUpperCase() + dia.slice(1)}: ${oferta[dia].trim()}` : null)
      .filter(Boolean)
      .join(' | ');

    return {
      Area: oferta.descripcioncargo || oferta.descripcionarea || "",
      Escuela: oferta.escuela || "",
      Domicilio: (oferta.domiciliodesempeno || "").trim(),
      Horarios: horarios || "-",
      IdDetalle: oferta.iddetalle
    };
  }
  
 

 async function cargarTodasLasOfertas() {
  const rowsPerPage = 100;
  let start = 0;
  let totalOfertas = Infinity;

  while (start < totalOfertas) {
    console.log(`📦 Solicitando bloque desde ${start}...`);

    const data = await fetchPage(start);
    const ofertas = data.response?.docs || [];

    // Mostrar la cantidad total la primera vez
    if (start === 0 && data.response?.numFound) {
      totalOfertas = data.response.numFound;
      console.log(`📊 Total de ofertas crudas analizadas: ${totalOfertas}`);


	  
	  
	  
    }


    console.log(`🔍 Ofertas crudas:`, ofertas);
    console.log(`📦 Se analizarán ${ofertas.length} ofertas del bloque ${start} al ${start + ofertas.length - 1}`);

    if (ofertas.length === 0) {
      console.warn("⚠️ No se recibieron más ofertas, saliendo del bucle.");
      break;
    }

    ofertas.forEach(oferta => {
      if (filtrarYProcesarOferta(oferta)) {
        resultados.push(parsearDatosDeOferta(oferta));
      }
    });

    start += rowsPerPage;
  }

  console.log(`✅ Se cargaron ${resultados.length} ofertas filtradas.`);
}


  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function filtrarPorEscuelaYCargo(escuelaCodigo, cargoNombre) {
    // Encuentra el filtro "Escuela" y filtra con el código
    const filtros = [...document.querySelectorAll('.filtro')];
    const filtroEscuela = filtros.find(f => f.querySelector('.textFiltro')?.textContent.includes("Escuela"));
    if (!filtroEscuela) return alert("No se encontró la oferta.\n(recordá estar en la página de ofertas/postularse)");
    const btnEscuela = filtroEscuela.querySelector("button.btnFiltro");
    btnEscuela.click();

    await delay(300);

    // En modal, poner código en input y click buscar
    const inputEscuela = document.querySelector('.modal-content input#escuela');
    if (!inputEscuela) return alert("No se encontró input Escuela");
    inputEscuela.value = escuelaCodigo;
    inputEscuela.dispatchEvent(new Event('input', { bubbles: true }));

    await delay(300);

    const btnBuscarEscuela = [...document.querySelectorAll('.modal-content button')].find(b => b.textContent.trim() === "Buscar");
    if (!btnBuscarEscuela) return alert("No se encontró botón Buscar Escuela");
    btnBuscarEscuela.click();

    // Esperar que se cierre el modal y cargue el filtro
    await delay(800);

    // Ahora filtro Cargo
    const filtroCargo = filtros.find(f => f.querySelector('.textFiltro')?.textContent.includes("Cargo"));
    if (!filtroCargo) return alert("No se encontró filtro Cargo");
    const btnCargo = filtroCargo.querySelector("button.btnFiltro");
    btnCargo.click();

    await delay(500);

    // Abre el ng-select
    const ngSelect = document.querySelector('ng-select[name="cargo"]');
    if (!ngSelect) return alert("No se encontró ng-select cargo");

    const flecha = ngSelect.querySelector('.ng-arrow-wrapper');
    if (!flecha) return alert("No se encontró flecha para abrir combo cargo");
    flecha.click();

    await delay(300);

    const inputCargo = ngSelect.querySelector('.ng-input input[type="text"]');
    if (!inputCargo) return alert("No se encontró input para cargo");

    inputCargo.focus();
    inputCargo.value = cargoNombre;
    inputCargo.dispatchEvent(new Event('input', { bubbles: true }));

    await delay(600);

    const opcionCargo = document.querySelector('.ng-dropdown-panel .ng-option');
    if (!opcionCargo) return alert("No se encontró opción para cargo");
    opcionCargo.click();

    await delay(400);

    const btnBuscarCargo = [...document.querySelectorAll('.modal-content button')].find(b => b.textContent.trim() === "Buscar");
    if (!btnBuscarCargo) return alert("No se encontró botón Buscar cargo");
    btnBuscarCargo.click();
  }

  function mostrarTabla() {
    if (resultados.length === 0) return alert("❌ No se encontraron ofertas válidas.");

    const contenedor = document.createElement("div");
    Object.assign(contenedor.style, {
      position: "fixed", top: "10px", left: "10px", width: "600px", maxHeight: "80vh",
      overflow: "auto", background: "#fff", border: "2px solid #444", borderRadius: "6px",
      zIndex: 99999, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", fontSize: "12px",
      resize: "both", display: "flex", flexDirection: "column"
    });

    const header = document.createElement("div");
    header.innerText = "📋 Ofertas Coincidentes";
    Object.assign(header.style, {
      padding: "6px 10px", cursor: "move", background: "#333", color: "#fff",
      userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "center"
    });

    const closeBtn = document.createElement("button");
    closeBtn.innerText = "✕";
    Object.assign(closeBtn.style, {
      background: "transparent", color: "#fff", border: "none",
      fontSize: "16px", cursor: "pointer"
    });
    closeBtn.onclick = () => contenedor.remove();
    header.appendChild(closeBtn);
    contenedor.appendChild(header);

    const tabla = document.createElement("table");
    tabla.style.width = "100%";
    tabla.style.borderCollapse = "collapse";

    const thead = tabla.createTHead();
    const encabezado = thead.insertRow();
    ["Area", "Escuela", "Domicilio", "Horarios", "Postularse"].forEach(txt => {
      const th = document.createElement("th");
      th.innerText = txt;
      Object.assign(th.style, {
        padding: "4px", background: "#eee", borderBottom: "1px solid #aaa",
        position: "sticky", top: "0", zIndex: 10
      });
      encabezado.appendChild(th);
    });

    const tbody = tabla.createTBody();
    resultados.forEach(datos => {
      const fila = tbody.insertRow();
      fila.style.borderTop = "1px solid #ddd";

      ["Area", "Escuela", "Domicilio", "Horarios"].forEach(key => {
        const celda = fila.insertCell();
        celda.innerText = datos[key];
        celda.style.padding = "4px";
      });

      // Columna para postulación
      const celdaPostular = fila.insertCell();
      const link = document.createElement("a");
      link.href = "#";
      link.style.textDecoration = "none";
      link.style.fontSize = "18px";
      link.title = "Filtrar ofertas por Escuela y Cargo";
      link.innerText = "📝";

      link.onclick = async (e) => {
        e.preventDefault();
        await filtrarPorEscuelaYCargo(datos.Escuela, datos.Area);
      };

      celdaPostular.appendChild(link);
    });

    const cuerpo = document.createElement("div");
    cuerpo.style.overflowY = "auto";
    cuerpo.style.flex = "1";
    cuerpo.appendChild(tabla);
    contenedor.appendChild(cuerpo);
    document.body.appendChild(contenedor);

    // Para mover ventana
    let isDragging = false, offsetX = 0, offsetY = 0;
    header.onmousedown = function (e) {
      isDragging = true;
      offsetX = e.clientX - contenedor.offsetLeft;
      offsetY = e.clientY - contenedor.offsetTop;
      document.body.style.userSelect = "none";
    };
    document.onmouseup = () => {
      isDragging = false;
      document.body.style.userSelect = "";
    };
    document.onmousemove = function (e) {
      if (isDragging) {
        contenedor.style.left = (e.clientX - offsetX) + "px";
        contenedor.style.top = (e.clientY - offsetY) + "px";
      }
    };
  }

  await cargarTodasLasOfertas();
  mostrarTabla();
})();


