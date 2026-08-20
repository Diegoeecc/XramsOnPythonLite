// Sistema de archivos virtual reutilizable: cada instancia es independiente
// (Sandbox y cada nivel de FRC tienen su propio árbol en memoria, sin pisarse).

let contadorIdGlobal = 1;
function generarId() {
  return `nodo-${contadorIdGlobal++}`;
}

export function crearNodoArchivo(nombre, contenido = "") {
  return { id: generarId(), tipo: "archivo", nombre, contenido };
}

export function crearNodoCarpeta(nombre, hijos = []) {
  return { id: generarId(), tipo: "carpeta", nombre, hijos, expandido: true };
}

let prevencionGlobalInstalada = false;
function instalarPrevencionGlobalDeDrop() {
  if (prevencionGlobalInstalada) return;
  prevencionGlobalInstalada = true;
  // Sin esto, el navegador muestra el cursor de "prohibido" en cualquier zona
  // de la ventana que no haya declarado explícitamente que acepta el drop.
  document.addEventListener("dragover", (evento) => evento.preventDefault());
  document.addEventListener("drop", (evento) => evento.preventDefault());
}

export function crearExplorador({
  contenedorId, botonNuevoArchivoId, botonNuevaCarpetaId,
  onSeleccionarArchivo, alSolicitarConfirmacion, arbolPorDefecto,
}) {
  let raiz;
  let archivoActivo = null;

  const contenedor = document.getElementById(contenedorId);

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
        onSeleccionarArchivo?.(siguiente || crearNodoArchivo("(sin archivos)", ""));
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
    onSeleccionarArchivo?.(nodo);
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

  function renderizarNodo(nodo, contenedorPadre, profundidad) {
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
          evento.dataTransfer.dropEffect = "move";
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
        contenedorPadre.appendChild(fila);
        if (hijo.expandido) renderizarNodo(hijo, contenedorPadre, profundidad + 1);
      } else {
        fila.classList.add("explorador-archivo");
        if (hijo === archivoActivo) fila.classList.add("activo");
        nombreSpan.textContent = "📄 " + hijo.nombre;
        nombreSpan.addEventListener("click", () => seleccionarArchivo(hijo));

        fila.appendChild(nombreSpan);
        fila.appendChild(crearBotonEliminar(hijo));
        contenedorPadre.appendChild(fila);
      }
    });
  }

  function renderizarArbol() {
    contenedor.innerHTML = "";
    renderizarNodo(raiz, contenedor, 0);
  }

  function reiniciarArbol(arbolNuevo) {
    raiz = arbolNuevo || arbolPorDefecto?.() ||
      crearNodoCarpeta("", [crearNodoArchivo("main.py", "print(\"¡Hola!\")\n")]);
    renderizarArbol();
    const primero = encontrarPrimerArchivo(raiz);
    if (primero) seleccionarArchivo(primero);
  }

  function establecerArbol(nuevaRaiz) {
    raiz = nuevaRaiz;
    renderizarArbol();
    const primero = encontrarPrimerArchivo(raiz);
    if (primero) seleccionarArchivo(primero);
  }

  instalarPrevencionGlobalDeDrop();

  document.getElementById(botonNuevoArchivoId)?.addEventListener("click", () => {
    const nombre = prompt("Nombre del nuevo archivo (con extensión, ej. utilidades.py):");
    if (!nombre) return;
    const nodo = crearNodoArchivo(nombre, "");
    raiz.hijos.push(nodo);
    renderizarArbol();
    seleccionarArchivo(nodo);
  });

  document.getElementById(botonNuevaCarpetaId)?.addEventListener("click", () => {
    const nombre = prompt("Nombre de la nueva carpeta:");
    if (!nombre) return;
    raiz.hijos.push(crearNodoCarpeta(nombre));
    renderizarArbol();
  });

  contenedor.addEventListener("dragover", (evento) => {
    evento.preventDefault();
    evento.dataTransfer.dropEffect = "move";
  });
  contenedor.addEventListener("drop", (evento) => {
    evento.preventDefault();
    moverNodo(evento.dataTransfer.getData("text/plain"), raiz);
  });

  reiniciarArbol();

  function contarArchivos(nodo) {
    let total = 0;
    (nodo.hijos || []).forEach((hijo) => {
      total += hijo.tipo === "archivo" ? 1 : contarArchivos(hijo);
    });
    return total;
  }

  return {
    reiniciarArbol,
    establecerArbol,
    obtenerArbol: () => raiz,
    obtenerArchivoActivo: () => archivoActivo,
    actualizarContenidoArchivoActivo: (contenido) => { if (archivoActivo) archivoActivo.contenido = contenido; },
    contarArchivos: () => contarArchivos(raiz),
  };
}