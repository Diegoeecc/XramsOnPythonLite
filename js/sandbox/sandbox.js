import { mostrarPantalla } from "../pantallas.js";
import { crearEditorCodigo } from "../editorCodigo.js";
import { ejecutarCodigo, detenerEjecucion, establecerEscuchas, sincronizarArchivos } from "../pyodide/pyodideBridge.js";
import { inicializarLienzoTortuga, procesarComandoTortuga } from "../pyodide/tortugaCanvas.js";
import { traducirError } from "../errores.js";
import { pedirConfirmacion } from "../modal.js";
import { crearExplorador } from "./explorador.js";
import { inicializarCargarGuardar } from "./cargarGuardar.js";

let editor = null;
let explorador = null;
let ejecutando = false;

export function inicializarSandbox() {
  editor = crearEditorCodigo("sandbox-codigo");

  explorador = crearExplorador({
    contenedorId: "sandbox-arbol",
    botonNuevoArchivoId: "sandbox-nuevo-archivo",
    botonNuevaCarpetaId: "sandbox-nueva-carpeta",
    onSeleccionarArchivo: (nodo) => {
      editor.establecerCodigo(nodo.contenido || "");
      document.getElementById("sandbox-archivo-actual").textContent = nodo.nombre;
    },
    alSolicitarConfirmacion: (mensaje, onConfirmar) => pedirConfirmacion({ mensaje, onConfirmar }),
  });

  inicializarCargarGuardar(explorador);

  editor.textarea.addEventListener("input", () => {
    explorador.actualizarContenidoArchivoActivo(editor.obtenerCodigo());
  });

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
      const huboVarios = explorador.contarArchivos() > 1;
      document.getElementById("sandbox-consola").textContent += "\n" + traducirError(d.texto, huboVarios) + "\n";
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

  explorador.actualizarContenidoArchivoActivo(editor.obtenerCodigo());
  sincronizarArchivos(explorador.obtenerArbol());
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
  explorador.reiniciarArbol();
  document.getElementById("sandbox-consola").textContent = "";
  mostrarPantalla("menu");
}