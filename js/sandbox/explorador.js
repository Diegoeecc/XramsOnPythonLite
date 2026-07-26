// Sistema de archivos virtual del Sandbox: un árbol en memoria (no toca el disco real del usuario).

let raiz;
let archivoActivo = null;
let alSeleccionarArchivo = null;

export function inicializarExplorador({ onSeleccionarArchivo }) {
  alSeleccionarArchivo = onSeleccionarArchivo;
  reiniciarArbol();

  document.getElementById("sandbox-nuevo-archivo").addEventListener("click", () => {
    const nombre = prompt("Nombre del nuevo archivo (con extensión, ej. utilidades.py):");
    if (!nombre) return;
    const nodo = { tipo: "archivo", nombre, contenido: "" };
    raiz.hijos.push(nodo);
    renderizarArbol();
    seleccionarArchivo(nodo);
  });

  document.getElementById("sandbox-nueva-carpeta").addEventListener("click", () => {
    const nombre = prompt("Nombre de la nueva carpeta:");
    if (!nombre) return;
    raiz.hijos.push({ tipo: "carpeta", nombre, hijos: [] });
    renderizarArbol();
  });
}

export function reiniciarArbol() {
  raiz = {
    tipo: "carpeta",
    nombre: "",
    hijos: [
      { tipo: "archivo", nombre: "main.py", contenido: "print(\"¡Hola desde el Sandbox!\")\n" },
    ],
  };
  renderizarArbol();
  seleccionarArchivo(raiz.hijos[0]);
}

export function establecerArbol(nuevaRaiz) {
  raiz = nuevaRaiz;
  renderizarArbol();
  const primerArchivo = encontrarPrimerArchivo(raiz);
  if (primerArchivo) seleccionarArchivo(primerArchivo);
}

export function obtenerArbol() {
  return raiz;
}

export function actualizarContenidoArchivoActivo(contenido) {
  if (archivoActivo) archivoActivo.contenido = contenido;
}

function encontrarPrimerArchivo(nodo) {
  if (nodo.tipo === "archivo") return nodo;
  for (const hijo of nodo.hijos || []) {
    const encontrado = encontrarPrimerArchivo(hijo);
    if (encontrado) return encontrado;
  }
  return null;
}

function seleccionarArchivo(nodo) {
  archivoActivo = nodo;
  renderizarArbol();
  alSeleccionarArchivo?.(nodo);
}

function renderizarArbol() {
  const contenedor = document.getElementById("sandbox-arbol");
  contenedor.innerHTML = "";
  renderizarNodo(raiz, contenedor, 0);
}

function renderizarNodo(nodo, contenedor, profundidad) {
  (nodo.hijos || []).forEach((hijo) => {
    const item = document.createElement("div");
    item.className = "explorador-item";
    item.style.paddingLeft = `${profundidad * 16 + 8}px`;

    if (hijo.tipo === "carpeta") {
      item.classList.add("explorador-carpeta");
      item.textContent = "📁 " + hijo.nombre;
      contenedor.appendChild(item);
      renderizarNodo(hijo, contenedor, profundidad + 1);
    } else {
      item.classList.add("explorador-archivo");
      if (hijo === archivoActivo) item.classList.add("activo");
      item.textContent = "📄 " + hijo.nombre;
      item.addEventListener("click", () => seleccionarArchivo(hijo));
      contenedor.appendChild(item);
    }
  });
}