import { mostrarPantalla } from "../pantallas.js";
import { obtenerNivelPorIdExacto, obtenerNiveles } from "./datosNiveles.js";
import { marcarNivelCompletado } from "../progreso/progreso.js";
import { ejecutarCodigo, detenerEjecucion, establecerEscuchas, solicitarValidacion } from "../pyodide/pyodideBridge.js";
import { inicializarLienzoTortuga, procesarComandoTortuga } from "../pyodide/tortugaCanvas.js";
import { crearEditorCodigo } from "../editorCodigo.js";
import { mostrarMapaNiveles, irANivelEspecifico } from "./mapaNiveles.js";
import { traducirError } from "../errores.js";

const RETRASO_VICTORIA_MS = 2000;

let nivelActual = null;
let editor = null;
let salidaAcumulada = "";
let ejecutando = false;
let temporizadorVictoria = null;

export async function inicializarPantallaNivel() {
  editor = crearEditorCodigo("nivel-codigo");

  document.querySelectorAll(".nivel-tab").forEach((boton) => {
    boton.addEventListener("click", () => mostrarVista(boton.dataset.vista));
  });

  document.getElementById("nivel-ejecutar").addEventListener("click", ejecutar);
  document.getElementById("nivel-detener").addEventListener("click", detener);
  document.getElementById("nivel-salir").addEventListener("click", salirDeNivel);
  document.getElementById("victoria-volver-niveles").addEventListener("click", () => mostrarMapaNiveles());
  document.getElementById("victoria-siguiente-nivel").addEventListener("click", irSiguienteNivel);
  document.getElementById("victoria-cerrar").addEventListener("click", cerrarPantallaVictoria);
  document.getElementById("nivel-limpiar-consola").addEventListener("click", () => {
    document.getElementById("nivel-consola").textContent = "";
  });
}

export function iniciarNivel(id) {
  nivelActual = obtenerNivelPorIdExacto(id);
  if (!nivelActual) return;

  inicializarLienzoTortuga(document.getElementById("nivel-canvas")); // reconecta el canvas cada vez (lo comparte con el Sandbox)
  cancelarVictoriaPendiente();

  document.getElementById("nivel-instrucciones-numero").textContent = `Nivel ${nivelActual.id}`;
  document.getElementById("nivel-instrucciones-titulo").textContent = nivelActual.titulo;
  document.getElementById("nivel-instrucciones-texto").textContent =
    nivelActual.instrucciones || "(instrucciones pendientes)";

  editor.establecerCodigo(nivelActual.codigoInicial || "# Escribe tu código aquí\n");

  salidaAcumulada = "";
  document.getElementById("nivel-consola").textContent = "";
  document.getElementById("pantalla-victoria").classList.add("oculto");
  mostrarVista(nivelActual.usaTortuga ? "resultado" : "consola");

  establecerEscuchasPantallaNivel();
  mostrarPantalla("jugar-nivel");
}

function mostrarVista(nombre) {
  document.querySelectorAll(".nivel-tab").forEach((boton) => {
    boton.classList.toggle("activa", boton.dataset.vista === nombre);
  });
  document.querySelectorAll(".nivel-vista").forEach((panel) => {
    panel.classList.toggle("activa", panel.dataset.vista === nombre);
  });
}

function establecerEscuchasPantallaNivel() {
  establecerEscuchas({
    salida: (d) => {
      salidaAcumulada += d.texto;
      document.getElementById("nivel-consola").textContent += d.texto;
    },
    error: (d) => {
      document.getElementById("nivel-consola").textContent += "\n" + traducirError(d.texto) + "\n";
    },
    tortuga: (d) => procesarComandoTortuga(d.comando),
    fin: (d) => {
      ejecutando = false;
      document.getElementById("nivel-ejecutar").disabled = false;
      document.getElementById("nivel-detener").disabled = true;
      if (!d.huboError) evaluarResultado();
    },
    validacion: (d) => { if (d.ok) programarVictoria(); },
    estado: () => {},
  });
}

function ejecutar() {
  if (ejecutando) return;
  cancelarVictoriaPendiente();
  ejecutando = true;
  salidaAcumulada = "";
  document.getElementById("nivel-consola").textContent = "";
  document.getElementById("nivel-ejecutar").disabled = true;
  document.getElementById("nivel-detener").disabled = false;
  ejecutarCodigo(editor.obtenerCodigo());
}

function detener() {
  detenerEjecucion();
  cancelarVictoriaPendiente();
  ejecutando = false;
  document.getElementById("nivel-ejecutar").disabled = false;
  document.getElementById("nivel-detener").disabled = true;
  document.getElementById("nivel-consola").textContent += "\n--- ejecución detenida ---\n";
}

function normalizarValidacion(validacion) {
  if (!validacion) return [];
  return Array.isArray(validacion) ? validacion : [validacion];
}

function evaluarResultado() {
  const specs = normalizarValidacion(nivelActual?.validacion);
  if (specs.length === 0) return;

  // Revisa localmente los tipos basados en la consola (no necesitan al worker).
  for (const spec of specs) {
    if (spec.tipo === "salida_contiene" || spec.tipo === "salida_exacta") {
      const real = salidaAcumulada.trim();
      const esperado = String(spec.valor).trim();
      const ok = spec.tipo === "salida_exacta"
        ? real === esperado
        : real.toLowerCase().includes(esperado.toLowerCase());
      if (!ok) return; // si algún check de consola falla, no sigue
    }
  }

  // El resto (variable, funcion, tortuga_posicion) los revisa el worker.
  const specsRemotos = specs.filter((s) => s.tipo !== "salida_contiene" && s.tipo !== "salida_exacta");
  if (specsRemotos.length === 0) {
    programarVictoria();
  } else {
    solicitarValidacion(specsRemotos);
  }
}

function programarVictoria() {
  cancelarVictoriaPendiente();
  temporizadorVictoria = setTimeout(() => {
    temporizadorVictoria = null;
    marcarNivelCompletado(nivelActual.id);
    document.getElementById("pantalla-victoria").classList.remove("oculto");
  }, RETRASO_VICTORIA_MS);
}

function cancelarVictoriaPendiente() {
  if (temporizadorVictoria) {
    clearTimeout(temporizadorVictoria);
    temporizadorVictoria = null;
  }
}

function cerrarPantallaVictoria() {
  document.getElementById("pantalla-victoria").classList.add("oculto");
}

function salirDeNivel() {
  cancelarVictoriaPendiente();
  detenerEjecucion();
  mostrarMapaNiveles();
}

function irSiguienteNivel() {
  const total = obtenerNiveles().length;
  const siguiente = (nivelActual.id % total) + 1;
  irANivelEspecifico(siguiente);
  iniciarNivel(siguiente);
}