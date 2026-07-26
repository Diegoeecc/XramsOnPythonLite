import { obtenerArbol, establecerArbol } from "./explorador.js";

export function inicializarCargarGuardar() {
  const inputCargar = document.getElementById("sandbox-input-cargar");

  document.getElementById("sandbox-cargar").addEventListener("click", () => {
    inputCargar.value = "";
    inputCargar.click();
  });

  inputCargar.addEventListener("change", async (evento) => {
    const archivos = Array.from(evento.target.files);
    if (archivos.length === 0) return;
    const arbol = await construirArbolDesdeArchivos(archivos);
    establecerArbol(arbol);
  });

  document.getElementById("sandbox-guardar").addEventListener("click", guardarComoZip);
}

async function construirArbolDesdeArchivos(archivos) {
  const raiz = { tipo: "carpeta", nombre: "", hijos: [] };
  for (const archivo of archivos) {
    const partes = archivo.webkitRelativePath.split("/").slice(1); // quita el nombre de la carpeta raíz elegida
    if (partes.length === 0) continue;
    const contenido = await archivo.text();
    insertarEnArbol(raiz, partes, contenido);
  }
  return raiz;
}

function insertarEnArbol(nodo, partes, contenido) {
  const [actual, ...resto] = partes;
  if (resto.length === 0) {
    nodo.hijos.push({ tipo: "archivo", nombre: actual, contenido });
    return;
  }
  let carpeta = nodo.hijos.find((h) => h.tipo === "carpeta" && h.nombre === actual);
  if (!carpeta) {
    carpeta = { tipo: "carpeta", nombre: actual, hijos: [] };
    nodo.hijos.push(carpeta);
  }
  insertarEnArbol(carpeta, resto, contenido);
}

async function guardarComoZip() {
  const nombre = prompt("¿Cómo quieres llamar al archivo descargado? (sin .zip)", "mi_proyecto");
  if (!nombre) return;

  const zip = new JSZip();
  agregarNodoAZip(zip, obtenerArbol());

  const contenidoZip = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(contenidoZip);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${nombre}.zip`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function agregarNodoAZip(carpetaZip, nodo) {
  (nodo.hijos || []).forEach((hijo) => {
    if (hijo.tipo === "archivo") {
      carpetaZip.file(hijo.nombre, hijo.contenido);
    } else {
      agregarNodoAZip(carpetaZip.folder(hijo.nombre), hijo);
    }
  });
}