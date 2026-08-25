import { mostrarPantalla } from "../pantallas.js";
import { crearEditorCodigo } from "../editorCodigo.js";
import { ejecutarCodigo, detenerEjecucion, establecerEscuchas } from "../pyodide/pyodideBridge.js";
import { inicializarLienzoTortuga, procesarComandoTortuga } from "../pyodide/tortugaCanvas.js";
import { traducirError } from "../errores.js";

let editor = null;
let ejecutando = false;

export function inicializarSandbox() {
  editor = crearEditorCodigo("sandbox-codigo");

  document.querySelectorAll(".sandbox-tab").forEach((boton) => {
    boton.addEventListener("click", () => mostrarVista(boton.dataset.vista));
  });

  document.getElementById("sandbox-ejecutar").addEventListener("click", ejecutar);
  document.getElementById("sandbox-detener").addEventListener("click", detener);
  document.getElementById("sandbox-limpiar-consola").addEventListener("click", () => {
    document.getElementById("sandbox-consola").textContent = "";
  });
  document.getElementById("sandbox-salir").addEventListener("click", salir);
}

export function mostrarSandbox() {
  inicializarLienzoTortuga(document.getElementById("sandbox-canvas"));
  establecerEscuchasSandbox();
  mostrarPantalla("sandbox");
}

function mostrarVista(nombre) {
  document.querySelectorAll(".sandbox-tab").forEach((boton) => {
    boton.classList.toggle("activa", boton.dataset.vista === nombre);
  });
  document.querySelectorAll(".sandbox-vista").forEach((panel) => {
    panel.classList.toggle("activa", panel.dataset.vista === nombre);
  });
}

function establecerEscuchasSandbox() {
  establecerEscuchas({
    salida: (d) => { document.getElementById("sandbox-consola").textContent += d.texto; },
    error: (d) => {
      document.getElementById("sandbox-consola").textContent += "\n" + traducirError(d.texto, false) + "\n";
    },
    tortuga: (d) => procesarComandoTortuga(d.comando),
    fin: (d) => {
      ejecutando = false;
      document.getElementById("sandbox-ejecutar").disabled = false;
      document.getElementById("sandbox-detener").disabled = true;
    },
    estado: () => {},
    validacion: () => {},
  });
}

function ejecutar() {
  if (ejecutando) return;
  ejecutando = true;
  document.getElementById("sandbox-consola").textContent = "";
  document.getElementById("sandbox-ejecutar").disabled = true;
  document.getElementById("sandbox-detener").disabled = false;

  ejecutarCodigo(editor.obtenerCodigo());
}

function detener() {
  detenerEjecucion();
  ejecutando = false;
  document.getElementById("sandbox-ejecutar").disabled = false;
  document.getElementById("sandbox-detener").disabled = true;
  document.getElementById("sandbox-consola").textContent += "\n--- ejecución detenida ---\n";
}

function salir() {
  detenerEjecucion();
  document.getElementById("sandbox-consola").textContent = "";
  mostrarPantalla("menu");
}