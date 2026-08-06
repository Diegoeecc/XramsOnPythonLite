import { sincronizarComponentesFrc, establecerEscuchas } from "../pyodide/pyodideBridge.js";
import { pedirConfirmacion } from "../modal.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const TIPOS_MOTOR = new Set(["MotorMCI", "MotorEMC"]);
const TAMANO_LED = 75;
const TAMANO_MOTOR = 250;
const TAMANO_OTRO = 150;

const TIPOS_COMPONENTE = [
  { tipo: "MotorEMC", nombre: "Motor EMC", imagen: "assets/imagenes/frc/motorEMC.png", tieneId: false, puedeEnlazar: true },
  { tipo: "MotorMCI", nombre: "Motor MCI", imagen: "assets/imagenes/frc/motorMCI.png", tieneId: true, puedeEnlazar: true },
  { tipo: "Encoder", nombre: "Encoder", imagen: "assets/imagenes/frc/encoder.png", tieneId: true, puedeEnlazar: true },
  { tipo: "MotorController", nombre: "Motor Controller", imagen: "assets/imagenes/frc/motorController.png", tieneId: true, puedeEnlazar: true },
  { tipo: "LED", nombre: "LED", imagen: null, tieneId: true, puedeEnlazar: false },
];

// --- Estado de la arena ACTUALMENTE activa (se resetea al cambiar de pantalla) ---
let componentes = [];
let contadorElId = 1;
let modoEnlace = null;
let menuActivo = null;
let temporizadorMensaje = null;

// --- Referencias a los elementos del DOM de la arena activa ---
let elArena = null, elPaleta = null, elMensaje = null, elCancelarEnlace = null, elSvg = null, elDefs = null;
const elementosConListeners = new WeakSet(); // evita enganchar el mismo listener 2 veces en el mismo <div>

function definicion(tipo) {
  return TIPOS_COMPONENTE.find((t) => t.tipo === tipo);
}

function tamanoDe(tipo) {
  if (tipo === "LED") return TAMANO_LED;
  if (TIPOS_MOTOR.has(tipo)) return TAMANO_MOTOR;
  return TAMANO_OTRO;
}

function sePuedenEnlazar(tipoA, tipoB) {
  if (tipoA === "LED" || tipoB === "LED") return false;
  if (tipoA === "Encoder" && tipoB === "Encoder") return false;
  const combo = (tipoA === "MotorMCI" && tipoB === "MotorController") || (tipoB === "MotorMCI" && tipoA === "MotorController");
  if (combo) return false;
  return true;
}

function mostrarMensaje(texto, esError, autoOcultar) {
  if (temporizadorMensaje) { clearTimeout(temporizadorMensaje); temporizadorMensaje = null; }
  elMensaje.textContent = texto;
  elMensaje.className = "ajustes-mensaje " + (esError ? "error" : "exito");

  if (autoOcultar) {
    temporizadorMensaje = setTimeout(() => {
      limpiarMensaje();
      temporizadorMensaje = null;
    }, 2000);
  }
}

function limpiarMensaje() {
  elMensaje.textContent = "";
  elMensaje.className = "ajustes-mensaje";
}

function pedirIdUnico(mensajeBase) {
  while (true) {
    const valor = prompt(mensajeBase);
    if (valor === null) return null;
    const texto = valor.trim();
    const numero = parseInt(texto, 10);
    if (!Number.isFinite(numero) || String(numero) !== texto) {
      alert("El ID debe ser un número entero.");
      continue;
    }
    if (componentes.some((c) => c.id === numero)) {
      alert(`El ID ${numero} ya está en uso en esta arena.`);
      continue;
    }
    return numero;
  }
}

function claveWorker(c) {
  return c.tipo === "MotorEMC" ? `emc:${c.elId}` : String(c.id);
}

function sincronizarConWorker() {
  const lista = componentes.map((c) => ({
    id: claveWorker(c),
    tipo: c.tipo,
    enlazadoCon: c.enlazadoConElId
      ? claveWorker(componentes.find((x) => x.elId === c.enlazadoConElId))
      : null,
  }));
  sincronizarComponentesFrc(lista);
}

// La pantalla activa la llama justo antes de cada "Ejecutar", como red de seguridad.
export function resincronizarArena() {
  limpiarEstadosMotores();
  sincronizarConWorker();
}

// --- Cables entre componentes enlazados ---

function limpiarSvgEnlaces() {
  if (!elSvg || !elDefs) return;
  Array.from(elSvg.querySelectorAll("line")).forEach((l) => l.remove());
  elDefs.innerHTML = "";
}

function redrawEnlaces() {
  if (!elSvg || !elDefs || !elArena) return;

  limpiarSvgEnlaces();
  const rectArena = elArena.getBoundingClientRect();
  const yaDibujados = new Set();

  componentes.forEach((c) => {
    if (!c.enlazadoConElId || !c.elemento) return;
    const parClave = [c.elId, c.enlazadoConElId].sort().join("|");
    if (yaDibujados.has(parClave)) return;
    yaDibujados.add(parClave);

    const otro = componentes.find((x) => x.elId === c.enlazadoConElId);
    if (!otro || !otro.elemento) return;

    const rectA = c.elemento.getBoundingClientRect();
    const rectB = otro.elemento.getBoundingClientRect();

    const x1 = rectA.left + rectA.width / 2 - rectArena.left;
    const y1 = rectA.top + rectA.height / 2 - rectArena.top;
    const x2 = rectB.left + rectB.width / 2 - rectArena.left;
    const y2 = rectB.top + rectB.height / 2 - rectArena.top;

    const idGradiente = `frc-grad-${parClave.replace(/[^a-zA-Z0-9]/g, "")}`;

    const gradiente = document.createElementNS(SVG_NS, "linearGradient");
    gradiente.setAttribute("id", idGradiente);
    gradiente.setAttribute("gradientUnits", "userSpaceOnUse");
    gradiente.setAttribute("x1", x1);
    gradiente.setAttribute("y1", y1);
    gradiente.setAttribute("x2", x2);
    gradiente.setAttribute("y2", y2);

    [0, 25, 50, 75, 100].forEach((offset, i) => {
      const stop = document.createElementNS(SVG_NS, "stop");
      stop.setAttribute("offset", `${offset}%`);
      stop.setAttribute("class", `frc-enlace-stop-${i + 1}`);
      gradiente.appendChild(stop);
    });
    elDefs.appendChild(gradiente);

    const linea = document.createElementNS(SVG_NS, "line");
    linea.setAttribute("x1", x1);
    linea.setAttribute("y1", y1);
    linea.setAttribute("x2", x2);
    linea.setAttribute("y2", y2);
    linea.setAttribute("stroke", `url(#${idGradiente})`);
    linea.setAttribute("stroke-width", "4");
    linea.setAttribute("stroke-linecap", "round");
    elSvg.appendChild(linea);
  });
}

// --- Flechas de dirección ---

export function actualizarFlechaMotor(datos) {
  const comp = componentes.find((c) => claveWorker(c) === datos.id);
  if (!comp || !comp.flechaEl) return;
  const flecha = comp.flechaEl;

  if (!datos.potencia) {
    flecha.classList.remove("frc-flecha--visible", "frc-flecha--izquierda", "frc-flecha--derecha");
    return;
  }

  flecha.classList.add("frc-flecha--visible");
  if (datos.potencia > 0) {
    flecha.classList.remove("frc-flecha--izquierda");
    flecha.classList.add("frc-flecha--derecha");
    flecha.textContent = "▶";
  } else {
    flecha.classList.remove("frc-flecha--derecha");
    flecha.classList.add("frc-flecha--izquierda");
    flecha.textContent = "◀";
  }
}

export function limpiarEstadosMotores() {
  componentes.forEach((c) => {
    c.flechaEl?.classList.remove("frc-flecha--visible", "frc-flecha--izquierda", "frc-flecha--derecha");
  });
}

export function apagarTodosLosLeds() {
  componentes.forEach((c) => {
    if (c.tipo !== "LED") return;
    const icono = document.getElementById(`frc-led-${c.elId}`);
    icono?.classList.remove("frc-led-icono--encendido");
  });
}

// --- Componentes: crear, mover, enlazar, eliminar ---

function crearComponenteEnArena(tipo, x, y) {
  const def = definicion(tipo);
  if (!def) return;

  let idAsignado = null;
  if (def.tieneId) {
    idAsignado = pedirIdUnico(`ID numérico para este ${def.nombre} (no se puede repetir en esta arena):`);
    if (idAsignado === null) return;
  }

  const componente = { elId: `el-${contadorElId++}`, tipo, id: idAsignado, enlazadoConElId: null, x, y, tamano: tamanoDe(tipo) };
  componentes.push(componente);
  renderizarComponente(componente);
  sincronizarConWorker();
}

function posicionarElemento(c) {
  if (!c.elemento) return;
  c.elemento.style.left = `${c.x - c.tamano / 2}px`;
  c.elemento.style.top = `${c.y - c.tamano / 2}px`;
}

function moverComponenteA(elId, x, y) {
  const c = componentes.find((c) => c.elId === elId);
  if (!c) return;
  c.x = x;
  c.y = y;
  posicionarElemento(c);
  redrawEnlaces();
}

function romperEnlace(elId) {
  const c = componentes.find((c) => c.elId === elId);
  if (!c || !c.enlazadoConElId) return;
  const otro = componentes.find((x) => x.elId === c.enlazadoConElId);
  if (otro) otro.enlazadoConElId = null;
  c.enlazadoConElId = null;
}

function quitarComponenteDelEstado(elId) {
  const comp = componentes.find((c) => c.elId === elId);
  if (!comp) return;
  componentes.forEach((c) => { if (c.enlazadoConElId === elId) c.enlazadoConElId = null; });
  comp.elemento?.remove();
  componentes = componentes.filter((c) => c.elId !== elId);
  sincronizarConWorker();
  redrawEnlaces();
}

function eliminarComponente(elId) {
  const comp = componentes.find((c) => c.elId === elId);
  if (!comp) return;
  pedirConfirmacion({
    mensaje: `¿Eliminar este ${definicion(comp.tipo).nombre} de la arena?`,
    onConfirmar: () => quitarComponenteDelEstado(elId),
  });
}

function iniciarModoEnlace(elId) {
  modoEnlace = elId;
  elArena.classList.add("frc-arena--modo-enlace");
  elCancelarEnlace.classList.remove("oculto");
  mostrarMensaje("Modo enlazar: haz clic en el componente con el que quieres enlazarlo.", false);
}

function salirModoEnlace() {
  modoEnlace = null;
  elArena.classList.remove("frc-arena--modo-enlace");
  elCancelarEnlace.classList.add("oculto");
  limpiarMensaje();
}

function intentarCompletarEnlace(elIdDestino) {
  const origen = componentes.find((c) => c.elId === modoEnlace);
  const destino = componentes.find((c) => c.elId === elIdDestino);
  if (!origen || !destino || origen.elId === destino.elId) return;

  if (!sePuedenEnlazar(origen.tipo, destino.tipo)) {
    mostrarMensaje(`Un ${definicion(origen.tipo).nombre} no se puede enlazar con un ${definicion(destino.tipo).nombre}.`, true);
    return;
  }

  romperEnlace(origen.elId);
  romperEnlace(destino.elId);
  origen.enlazadoConElId = destino.elId;
  destino.enlazadoConElId = origen.elId;

  salirModoEnlace();
  sincronizarConWorker();
  redrawEnlaces();
  mostrarMensaje("Componentes enlazados.", false, true);
}

function cerrarMenuComponente() {
  menuActivo?.remove();
  menuActivo = null;
}

function manejarClicComponente(c) {
  if (modoEnlace) {
    intentarCompletarEnlace(c.elId);
    return;
  }

  cerrarMenuComponente();
  const def = definicion(c.tipo);

  const menu = document.createElement("div");
  menu.className = "frc-menu-componente";
  menu.style.left = `${c.x}px`;
  menu.style.top = `${c.y + c.tamano / 2 + 8}px`;

  if (def.puedeEnlazar) {
    const btnEnlazar = document.createElement("button");
    btnEnlazar.textContent = "Enlazar";
    btnEnlazar.addEventListener("click", () => { cerrarMenuComponente(); iniciarModoEnlace(c.elId); });
    menu.appendChild(btnEnlazar);
  }

  const btnEliminar = document.createElement("button");
  btnEliminar.textContent = "Eliminar";
  btnEliminar.addEventListener("click", () => { cerrarMenuComponente(); eliminarComponente(c.elId); });
  menu.appendChild(btnEliminar);

  elArena.appendChild(menu);
  menuActivo = menu;

  setTimeout(() => {
    document.addEventListener("click", function alClicFuera(evento) {
      if (menuActivo && !menuActivo.contains(evento.target)) cerrarMenuComponente();
    }, { once: true });
  }, 0);
}

function estaDentroDeLaArena(clientX, clientY) {
  const rect = elArena.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function renderizarComponente(c) {
  const def = definicion(c.tipo);
  const el = document.createElement("div");
  el.className = "frc-componente";
  el.style.width = `${c.tamano}px`;
  el.style.height = `${c.tamano}px`;
  el.draggable = true;
  posicionarElemento(c);
  c.elemento = el;

  if (c.id !== null) {
    const etiqueta = document.createElement("span");
    etiqueta.className = "frc-componente-id";
    etiqueta.textContent = c.id;
    el.appendChild(etiqueta);
  }

  let elementoParaArrastre = el;

  if (c.tipo === "LED") {
    const icono = document.createElement("div");
    icono.className = "frc-led-icono frc-led-icono--arena";
    icono.id = `frc-led-${c.elId}`;
    el.appendChild(icono);
    elementoParaArrastre = icono;
  } else if (def.imagen) {
    const img = document.createElement("img");
    img.className = "frc-componente-imagen-sola";
    img.src = def.imagen;
    img.alt = def.nombre;
    img.onerror = () => { img.style.display = "none"; };
    el.appendChild(img);
    elementoParaArrastre = img;
  }

  if (TIPOS_MOTOR.has(c.tipo)) {
    const flecha = document.createElement("span");
    flecha.className = "frc-flecha-motor";
    flecha.textContent = "▶";
    el.appendChild(flecha);
    c.flechaEl = flecha;
  }

  el.addEventListener("dragstart", (evento) => {
    evento.dataTransfer.setData("application/frc-elid", c.elId);
    evento.dataTransfer.effectAllowed = "move";
    evento.dataTransfer.setDragImage(elementoParaArrastre, c.tamano / 2, c.tamano / 2);
  });

  el.addEventListener("dragend", (evento) => {
    if (!estaDentroDeLaArena(evento.clientX, evento.clientY)) {
      quitarComponenteDelEstado(c.elId);
    }
  });

  el.addEventListener("click", (evento) => {
    evento.stopPropagation();
    manejarClicComponente(c);
  });

  elArena.appendChild(el);
}

function renderizarPaleta() {
  elPaleta.innerHTML = "";

  TIPOS_COMPONENTE.forEach((def) => {
    const item = document.createElement("div");
    item.className = "frc-paleta-item";
    item.draggable = true;

    const recuadro = document.createElement("div");
    recuadro.className = "frc-paleta-recuadro";

    let elementoParaArrastre;

    if (def.tipo === "LED") {
      const icono = document.createElement("div");
      icono.className = "frc-led-icono";
      recuadro.appendChild(icono);
      elementoParaArrastre = icono;
    } else {
      const img = document.createElement("img");
      img.className = "frc-paleta-imagen";
      img.src = def.imagen;
      img.alt = def.nombre;
      img.onerror = () => { img.style.display = "none"; };
      recuadro.appendChild(img);
      elementoParaArrastre = img;
    }

    const nombre = document.createElement("span");
    nombre.className = "frc-paleta-nombre";
    nombre.textContent = def.nombre;
    recuadro.appendChild(nombre);

    item.addEventListener("dragstart", (evento) => {
      evento.dataTransfer.setData("application/frc-tipo", def.tipo);
      evento.dataTransfer.effectAllowed = "copy";
      const tam = tamanoDe(def.tipo);
      evento.dataTransfer.setDragImage(elementoParaArrastre, tam / 2, tam / 2);
    });

    item.appendChild(recuadro);
    elPaleta.appendChild(item);
  });
}

function actualizarVisualLed(datos) {
  const comp = componentes.find((c) => c.tipo === "LED" && String(c.id) === String(datos.id));
  if (!comp) return;
  const icono = document.getElementById(`frc-led-${comp.elId}`);
  if (!icono) return;
  const [r, g, b] = datos.color;
  icono.style.setProperty("--color-led", `rgb(${r}, ${g}, ${b})`);
  icono.classList.toggle("frc-led-icono--encendido", Boolean(datos.encendido));
}

export function reiniciarArena() {
  componentes.forEach((c) => c.elemento?.remove());
  componentes = [];
  cerrarMenuComponente();
  salirModoEnlace();
  limpiarMensaje();
  limpiarSvgEnlaces();
  sincronizarConWorker();
}

function engancharListenersDeArena() {
  if (elementosConListeners.has(elArena)) return; // ya tiene sus listeners, no duplicar
  elementosConListeners.add(elArena);

  elArena.addEventListener("dragover", (evento) => {
    evento.preventDefault();
    const esComponenteNuevo = evento.dataTransfer.types.includes("application/frc-tipo");
    evento.dataTransfer.dropEffect = esComponenteNuevo ? "copy" : "move";
  });

  elArena.addEventListener("drop", (evento) => {
    evento.preventDefault();
    const rect = elArena.getBoundingClientRect();
    const x = evento.clientX - rect.left;
    const y = evento.clientY - rect.top;
    const tipoNuevo = evento.dataTransfer.getData("application/frc-tipo");
    const elIdExistente = evento.dataTransfer.getData("application/frc-elid");
    if (tipoNuevo) crearComponenteEnArena(tipoNuevo, x, y);
    else if (elIdExistente) moverComponenteA(elIdExistente, x, y);
  });

  elCancelarEnlace.addEventListener("click", salirModoEnlace);
}

// Activa la arena en un juego de elementos del DOM específico (identificados por id),
// reseteando su estado. Se llama cada vez que se ENTRA a una pantalla que tiene arena
// (un nivel de FRC, o el Sandbox) — el mismo patrón que ya usamos con el canvas de la tortuga.
export function activarArenaEn({ arenaId, paletaId, mensajeId, cancelarEnlaceId }) {
  elArena = document.getElementById(arenaId);
  elPaleta = document.getElementById(paletaId);
  elMensaje = document.getElementById(mensajeId);
  elCancelarEnlace = document.getElementById(cancelarEnlaceId);
  elSvg = elArena.querySelector(".frc-enlaces-svg");
  elDefs = elSvg.querySelector("defs");

  engancharListenersDeArena();
  renderizarPaleta();
  reiniciarArena();
}

// Se llama UNA vez al arrancar la app: deja lista la prevención global de "cursor
// prohibido" y conecta los escuchas del bridge (comparten TODAS las arenas de la app).
export function inicializarSistemaArenaFrc() {
  document.addEventListener("dragover", (evento) => evento.preventDefault());
  document.addEventListener("drop", (evento) => evento.preventDefault());
  window.addEventListener("resize", redrawEnlaces);
  establecerEscuchas({ ledFrc: actualizarVisualLed, motorFrc: actualizarFlechaMotor });
}