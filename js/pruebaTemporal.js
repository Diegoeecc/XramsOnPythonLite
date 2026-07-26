import { ejecutarCodigo, establecerEscuchas } from "./pyodide/pyodideBridge.js";
import { inicializarLienzoTortuga, procesarComandoTortuga } from "./pyodide/tortugaCanvas.js";
import { crearEditorCodigo } from "./editorCodigo.js";

export function inicializarPruebaTemporal() {
  const editor = crearEditorCodigo("prueba-codigo");
  const botonEjecutar = document.getElementById("prueba-ejecutar");
  const consola = document.getElementById("prueba-consola");
  const canvas = document.getElementById("prueba-canvas");

  inicializarLienzoTortuga(canvas);

  establecerEscuchas({
    salida: (d) => { consola.textContent += d.texto; },
    tortuga: (d) => procesarComandoTortuga(d.comando),
    fin: (d) => { consola.textContent += `\n--- terminó (¿error? ${d.huboError}) ---\n`; },
  });

  botonEjecutar.addEventListener("click", () => {
    consola.textContent = "";
    ejecutarCodigo(editor.obtenerCodigo());
  });
}