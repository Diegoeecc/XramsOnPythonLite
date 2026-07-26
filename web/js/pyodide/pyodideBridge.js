let worker = null;
let escuchas = { salida: null, fin: null, estado: null, tortuga: null, validacion: null, error: null };

function adjuntarWorker() {
  worker.onmessage = (evento) => {
    const { tipo } = evento.data;
    if (tipo === "salida") escuchas.salida?.(evento.data);
    if (tipo === "fin") escuchas.fin?.(evento.data);
    if (tipo === "estado") escuchas.estado?.(evento.data);
    if (tipo === "tortuga") escuchas.tortuga?.(evento.data);
    if (tipo === "resultado_validacion") escuchas.validacion?.(evento.data);
    if (tipo === "error") escuchas.error?.(evento.data);
  };
}

export function iniciarPyodide() {
  worker = new Worker(`js/pyodide/pyodideWorker.js?v=${Date.now()}`);
  adjuntarWorker();
}

export function establecerEscuchas(nuevasEscuchas) {
  escuchas = { ...escuchas, ...nuevasEscuchas };
}

export function ejecutarCodigo(codigo) {
  worker?.postMessage({ tipo: "ejecutar", codigo });
}

export function detenerEjecucion() {
  worker?.terminate();
  worker = new Worker(`js/pyodide/pyodideWorker.js?v=${Date.now()}`);
  adjuntarWorker();
  escuchas.estado?.({ tipo: "estado", mensaje: "reiniciando" });
}

export function solicitarValidacion(especificacion) {
  worker?.postMessage({ tipo: "validar", especificacion });
}

export function sincronizarArchivos(arbol) {
  worker?.postMessage({ tipo: "sincronizar_archivos", archivos: aplanarArbol(arbol) });
}

function aplanarArbol(nodo, prefijo = "") {
  let lista = [];
  (nodo.hijos || []).forEach((hijo) => {
    const ruta = prefijo + hijo.nombre;
    if (hijo.tipo === "archivo") {
      lista.push({ ruta, contenido: hijo.contenido || "" });
    } else {
      lista = lista.concat(aplanarArbol(hijo, ruta + "/"));
    }
  });
  return lista;
}