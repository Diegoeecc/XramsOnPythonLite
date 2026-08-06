import { mostrarPantalla } from "../pantallas.js";
import { crearEditorCodigo } from "../editorCodigo.js";
import { crearExplorador, crearNodoArchivo, crearNodoCarpeta } from "../sandbox/explorador.js";
import { ejecutarCodigo, detenerEjecucion, establecerEscuchas, sincronizarArchivos, solicitarValidacion } from "../pyodide/pyodideBridge.js";
import { traducirError } from "../errores.js";
import { activarArenaEn, resincronizarArena, limpiarEstadosMotores, apagarTodosLosLeds } from "../frc/arena.js";
import { obtenerNivelFrcPorIdExacto, obtenerNivelesFrc } from "./datosNivelesFrc.js";
import { marcarNivelFrcCompletado } from "../progreso/progreso.js";
import { mostrarMapaNivelesFrc, irANivelFrcEspecifico, refrescarMapaNivelesFrc } from "./mapaNivelesFrc.js";

const RETRASO_VICTORIA_MS = 2000;

let editor = null;
let explorador = null;
let ejecutando = false;
let nivelActual = null;
let temporizadorVictoria = null;

export function inicializarPantallaNivelFrc() {
  editor = crearEditorCodigo("nivel-frc-codigo");

  explorador = crearExplorador({
    contenedorId: "nivel-frc-arbol",
    botonNuevoArchivoId: "nivel-frc-nuevo-archivo",
    botonNuevaCarpetaId: "nivel-frc-nueva-carpeta",
    onSeleccionarArchivo: (nodo) => {
      editor.establecerCodigo(nodo.contenido || "");
      document.getElementById("nivel-frc-archivo-actual").textContent = nodo.nombre;
    },
  });

  editor.textarea.addEventListener("input", () => {
    explorador.actualizarContenidoArchivoActivo(editor.obtenerCodigo());
  });

  document.querySelectorAll(".nivel-frc-tab").forEach((boton) => {
    boton.addEventListener("click", () => mostrarVista(boton.dataset.vista));
  });

  document.getElementById("nivel-frc-ejecutar").addEventListener("click", ejecutar);
  document.getElementById("nivel-frc-detener").addEventListener("click", detener);
  document.getElementById("nivel-frc-salir").addEventListener("click", salir);
  document.getElementById("nivel-frc-limpiar-consola").addEventListener("click", () => {
    document.getElementById("nivel-frc-consola").textContent = "";
  });

  document.getElementById("victoria-frc-cerrar").addEventListener("click", cerrarPantallaVictoria);
  document.getElementById("victoria-frc-volver-niveles").addEventListener("click", () => mostrarMapaNivelesFrc());
  document.getElementById("victoria-frc-siguiente-nivel").addEventListener("click", irSiguienteNivel);
}

export function iniciarNivelFrc(id) {
  nivelActual = obtenerNivelFrcPorIdExacto(id);
  if (!nivelActual) return;

  // Corta cualquier ejecución/motor/LED que hubiera quedado activo del nivel anterior,
  // para que el nuevo nivel siempre arranque en un estado limpio.
  detenerEjecucion();
  limpiarEstadosMotores();
  apagarTodosLosLeds();
  ejecutando = false;
  document.getElementById("nivel-frc-ejecutar").disabled = false;
  document.getElementById("nivel-frc-detener").disabled = true;

  cancelarVictoriaPendiente();

  document.getElementById("nivel-frc-instrucciones-texto").textContent = nivelActual.instrucciones || "";
  document.getElementById("nivel-frc-consola").textContent = "";
  document.getElementById("pantalla-victoria-frc").classList.add("oculto");

  const archivos = nivelActual.archivosIniciales || { "main.py": "# Escribe tu código aquí\n" };
  const nodosArchivo = Object.keys(archivos).map((nombre) => crearNodoArchivo(nombre, archivos[nombre]));
  explorador.establecerArbol(crearNodoCarpeta("", nodosArchivo));
  activarArenaEn({ arenaId: "frc-arena", paletaId: "frc-paleta", mensajeId: "frc-mensaje", cancelarEnlaceId: "frc-cancelar-enlace" });

  const botonResultado = document.querySelector('.nivel-frc-tab[data-vista="resultado"]');
  const usaArena = nivelActual.usaArena !== false;
  botonResultado.style.display = usaArena ? "" : "none";

  mostrarVista("instrucciones");
  establecerEscuchasNivelFrc();
  mostrarPantalla("jugar-nivel-frc");
}

function mostrarVista(nombre) {
  document.querySelectorAll(".nivel-frc-tab").forEach((boton) => {
    boton.classList.toggle("activa", boton.dataset.vista === nombre);
  });
  document.querySelectorAll(".nivel-frc-vista").forEach((panel) => {
    panel.classList.toggle("activa", panel.dataset.vista === nombre);
  });
}

function establecerEscuchasNivelFrc() {
  establecerEscuchas({
    salida: (d) => { document.getElementById("nivel-frc-consola").textContent += d.texto; },
    error: (d) => {
      const huboVarios = explorador.contarArchivos() > 1;
      document.getElementById("nivel-frc-consola").textContent += "\n" + traducirError(d.texto, huboVarios) + "\n";
    },
    tortuga: () => {},
    fin: (d) => {
      if (!d.huboError) evaluarResultado();

      if (d.ledActivo || d.motorActivo) return;

      ejecutando = false;
      document.getElementById("nivel-frc-ejecutar").disabled = false;
      document.getElementById("nivel-frc-detener").disabled = true;
      limpiarEstadosMotores();
      apagarTodosLosLeds();
    },
    estado: () => {},
    validacion: (d) => { if (d.ok) programarVictoria(); },
  });
}

function evaluarResultado() {
  const spec = nivelActual?.validacion;
  if (!spec) return;
  solicitarValidacion(spec);
}

function ejecutar() {
  if (ejecutando) return;
  cancelarVictoriaPendiente();
  ejecutando = true;
  document.getElementById("nivel-frc-consola").textContent = "";
  document.getElementById("nivel-frc-ejecutar").disabled = true;
  document.getElementById("nivel-frc-detener").disabled = false;

  explorador.actualizarContenidoArchivoActivo(editor.obtenerCodigo());
  sincronizarArchivos(explorador.obtenerArbol());
  resincronizarArena();
  ejecutarCodigo(editor.obtenerCodigo());
}

function detener() {
  detenerEjecucion();
  cancelarVictoriaPendiente();
  limpiarEstadosMotores();
  apagarTodosLosLeds();
  ejecutando = false;
  document.getElementById("nivel-frc-ejecutar").disabled = false;
  document.getElementById("nivel-frc-detener").disabled = true;
  document.getElementById("nivel-frc-consola").textContent += "\n--- ejecución detenida ---\n";
}

function programarVictoria() {
  cancelarVictoriaPendiente();
  temporizadorVictoria = setTimeout(() => {
    temporizadorVictoria = null;
    marcarNivelFrcCompletado(nivelActual.id);
    refrescarMapaNivelesFrc();

    const esUltimoNivel = nivelActual.id === obtenerNivelesFrc().length;
    document.getElementById("victoria-frc-siguiente-nivel").style.display = esUltimoNivel ? "none" : "";

    document.getElementById("pantalla-victoria-frc").classList.remove("oculto");
  }, RETRASO_VICTORIA_MS);
}

function cancelarVictoriaPendiente() {
  if (temporizadorVictoria) {
    clearTimeout(temporizadorVictoria);
    temporizadorVictoria = null;
  }
}

function cerrarPantallaVictoria() {
  document.getElementById("pantalla-victoria-frc").classList.add("oculto");
}

function salir() {
  cancelarVictoriaPendiente();
  detenerEjecucion();
  mostrarMapaNivelesFrc();
}

function irSiguienteNivel() {
  const total = obtenerNivelesFrc().length;
  const siguiente = (nivelActual.id % total) + 1;
  irANivelFrcEspecifico(siguiente);
  iniciarNivelFrc(siguiente);
}