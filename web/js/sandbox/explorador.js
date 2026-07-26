// Sistema de archivos virtual del Sandbox: un árbol en memoria (no toca el disco real del usuario).

let raiz;
let archivoActivo = null;
let alSeleccionarArchivo = null;
let alSolicitarConfirmacion = null;
let contadorId = 1;

function generarId() {
  return `nodo-${contadorId++}`;
}

export function crearNodoArchivo(nombre, contenido = "") {
  return { id: generarId(), tipo: "archivo", nombre, contenido };
}

export function crearNodoCarpeta(nombre, hijos = []) {
  return { id: generarId(), tipo: "carpeta", nombre, hijos, expandido: true };
}

// sandbox.js conecta aquí su propio modal de confirmación (el mismo que usa "Resetear").
export function establecerConfirmadorEliminacion(fn) {
  alSolicitarConfirmacion = fn;
}

export function inicializarExplorador({ onSeleccionarArchivo }) {
  alSeleccionarArchivo = onSeleccionarArchivo;
  reiniciarArbol();

  document.getElementById("sandbox-nuevo-archivo").addEventListener("click", () => {
    const nombre = prompt("Nombre del nuevo archivo (con extensión, ej. utilidades.py):");
    if (!nombre) return;
    const nodo = crearNodoArchivo(nombre, "");
    raiz.hijos.push(nodo);
    renderizarArbol();
    seleccionarArchivo(nodo);
  });

  document.getElementById("sandbox-nueva-carpeta").addEventListener("click", () => {
    const nombre = prompt("Nombre de la nueva carpeta:");
    if (!nombre) return;
    raiz.hijos.push(crearNodoCarpeta(nombre));
    renderizarArbol();
  });

  // Soltar sobre el área vacía del explorador (fuera de cualquier carpeta) regresa el archivo a la raíz.
  const contenedor = document.getElementById("sandbox-arbol");
  contenedor.addEventListener("dragover", (evento) => evento.preventDefault());
  contenedor.addEventListener("drop", (evento) => {
    evento.preventDefault();
    moverNodo(evento.dataTransfer.getData("text/plain"), raiz);
  });
}

export function reiniciarArbol() {
  raiz = crearNodoCarpeta("", [crearNodoArchivo("main.py", "print(\"¡Hola desde el Sandbox!\")\n")]);
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

function buscarNodoYPadre(nodoActual, id, padre = null) {
  if (nodoActual.id === id) return { nodo: nodoActual, padre };
  for (const hijo of nodoActual.hijos || []) {
    const encontrado = buscarNodoYPadre(hijo, id, nodoActual);
    if (encontrado) return encontrado;
  }
  return null;
}

function esDescendienteOIgual(posibleAncestro, idBuscado) {
  if (posibleAncestro.id === idBuscado) return true;
  return (posibleAncestro.hijos || []).some((hijo) => esDescendienteOIgual(hijo, idBuscado));
}

function moverNodo(idArrastrado, carpetaDestino) {
  if (!idArrastrado) return;
  const resultado = buscarNodoYPadre(raiz, idArrastrado);
  if (!resultado) return;
  const { nodo, padre } = resultado;

  if (nodo.tipo === "carpeta" && esDescendienteOIgual(nodo, carpetaDestino.id)) return;
  if (padre === carpetaDestino) return;

  padre.hijos = padre.hijos.filter((hijo) => hijo.id !== nodo.id);
  carpetaDestino.hijos.push(nodo);
  renderizarArbol();
}

function solicitarEliminarNodo(nodo) {
  const tipoTexto = nodo.tipo === "carpeta" ? "la carpeta" : "el archivo";
  const mensaje = `¿Seguro que quieres eliminar ${tipoTexto} "${nodo.nombre}"? Esta acción no se puede deshacer.`;

  const confirmarEliminacion = () => {
    const resultado = buscarNodoYPadre(raiz, nodo.id);
    if (!resultado || !resultado.padre) return;
    resultado.padre.hijos = resultado.padre.hijos.filter((h) => h.id !== nodo.id);

    const seEliminoElActivo = archivoActivo && (
      archivoActivo.id === nodo.id ||
      (nodo.tipo === "carpeta" && esDescendienteOIgual(nodo, archivoActivo.id))
    );

    if (seEliminoElActivo) {
      const siguiente = encontrarPrimerArchivo(raiz);
      archivoActivo = siguiente;
      alSeleccionarArchivo?.(siguiente || crearNodoArchivo("(sin archivos)", ""));
    }
    renderizarArbol();
  };

  if (alSolicitarConfirmacion) {
    alSolicitarConfirmacion(mensaje, confirmarEliminacion);
  } else if (confirm(mensaje)) {
    confirmarEliminacion();
  }
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

function crearBotonEliminar(nodo) {
  const boton = document.createElement("button");
  boton.className = "explorador-eliminar";
  boton.title = "Eliminar";
  boton.textContent = "🗑";
  boton.addEventListener("click", (evento) => {
    evento.stopPropagation();
    solicitarEliminarNodo(nodo);
  });
  return boton;
}

function renderizarNodo(nodo, contenedor, profundidad) {
  (nodo.hijos || []).forEach((hijo) => {
    const fila = document.createElement("div");
    fila.className = "explorador-item";
    fila.style.paddingLeft = `${profundidad * 16 + 8}px`;
    fila.draggable = true;

    fila.addEventListener("dragstart", (evento) => {
      evento.dataTransfer.setData("text/plain", hijo.id);
      evento.dataTransfer.effectAllowed = "move";
    });

    const nombreSpan = document.createElement("span");
    nombreSpan.className = "explorador-nombre";

    if (hijo.tipo === "carpeta") {
      fila.classList.add("explorador-carpeta");
      const flecha = hijo.expandido ? "▾" : "▸";
      nombreSpan.textContent = `${flecha} 📁 ${hijo.nombre}`;
      nombreSpan.addEventListener("click", () => {
        hijo.expandido = !hijo.expandido;
        renderizarArbol();
      });

      fila.addEventListener("dragover", (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        fila.classList.add("explorador-carpeta--sobre-drop");
      });
      fila.addEventListener("dragleave", () => fila.classList.remove("explorador-carpeta--sobre-drop"));
      fila.addEventListener("drop", (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        fila.classList.remove("explorador-carpeta--sobre-drop");
        moverNodo(evento.dataTransfer.getData("text/plain"), hijo);
      });

      fila.appendChild(nombreSpan);
      fila.appendChild(crearBotonEliminar(hijo));
      contenedor.appendChild(fila);
      if (hijo.expandido) renderizarNodo(hijo, contenedor, profundidad + 1);
    } else {
      fila.classList.add("explorador-archivo");
      if (hijo === archivoActivo) fila.classList.add("activo");
      nombreSpan.textContent = "📄 " + hijo.nombre;
      nombreSpan.addEventListener("click", () => seleccionarArchivo(hijo));

      fila.appendChild(nombreSpan);
      fila.appendChild(crearBotonEliminar(hijo));
      contenedor.appendChild(fila);
    }
  });
}