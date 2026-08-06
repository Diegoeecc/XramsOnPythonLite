import { mostrarPantalla } from "../pantallas.js";
import { estaCompletadoFrc } from "../progreso/progreso.js";
import { cargarNivelesFrc, obtenerNivelesFrc } from "./datosNivelesFrc.js";

let nivelActualId = 1;
let animando = false;
let elementos = [];
let alComenzarNivelFrc = null;

export function establecerAlComenzarNivelFrc(callback) {
  alComenzarNivelFrc = callback;
}

function obtenerNivelPorId(id) {
  const niveles = obtenerNivelesFrc();
  const total = niveles.length;
  if (total === 0) return null;
  const idNormalizado = ((id - 1 + total) % total) + 1;
  return niveles.find((n) => n.id === idNormalizado);
}

function nivelDesbloqueado(id) {
  return id === 1 || estaCompletadoFrc(id - 1);
}

function llenarTarjeta(elemento, nivel) {
  if (!nivel) return;
  const desbloqueado = nivelDesbloqueado(nivel.id);
  elemento.querySelector(".tarjeta-nivel-numero").textContent = `Nivel ${nivel.id}`;
  elemento.querySelector(".tarjeta-nivel-titulo").textContent = nivel.titulo;
  elemento.querySelector(".tarjeta-nivel-descripcion").textContent = nivel.descripcion;
  elemento.querySelector(".tarjeta-nivel-tema").textContent = `Tema: ${nivel.tema}`;
  elemento.classList.toggle("tarjeta-nivel--bloqueada", !desbloqueado);

  const img = elemento.querySelector(".tarjeta-nivel-imagen img");
  img.style.display = "";
  img.onerror = () => { img.style.display = "none"; };
  img.src = `assets/imagenes/niveles-frc/nivel${nivel.id}.png?v=${Date.now()}`;

  const boton = elemento.querySelector(".boton-comenzar-nivel");
  boton.disabled = !desbloqueado;
  boton.textContent = desbloqueado ? "Comenzar" : "Bloqueado";
}

function renderizarTarjetas() {
  llenarTarjeta(elementos[0], obtenerNivelPorId(nivelActualId - 1));
  llenarTarjeta(elementos[1], obtenerNivelPorId(nivelActualId));
  llenarTarjeta(elementos[2], obtenerNivelPorId(nivelActualId + 1));
}

function obtenerVariablesCarrusel() {
  const estilos = getComputedStyle(document.documentElement);
  const tamano = parseFloat(estilos.getPropertyValue("--tarjeta-nivel-tamano"));
  const espacio = parseFloat(estilos.getPropertyValue("--tarjeta-nivel-espacio"));
  const vistazo = parseFloat(estilos.getPropertyValue("--carrusel-vistazo"));
  return { paso: tamano + espacio, reposo: vistazo - tamano - espacio };
}

function cambiarNivel(direccion) {
  if (animando || obtenerNivelesFrc().length === 0) return;
  animando = true;

  const pista = document.getElementById("carrusel-pista-frc");
  const { paso, reposo } = obtenerVariablesCarrusel();

  const entrante = direccion === 1 ? elementos[2] : elementos[0];
  const reciclado = direccion === 1 ? elementos[0] : elementos[2];

  elementos[1].classList.add("tarjeta-nivel--lateral");
  entrante.classList.remove("tarjeta-nivel--lateral");

  pista.style.transition = "transform 450ms cubic-bezier(0.4, 0, 0.2, 1)";
  pista.style.transform = `translateX(${reposo - direccion * paso}px)`;

  pista.addEventListener("transitionend", function alTerminar() {
    pista.removeEventListener("transitionend", alTerminar);

    const total = obtenerNivelesFrc().length;
    nivelActualId = ((nivelActualId - 1 + direccion + total) % total) + 1;

    if (direccion === 1) {
      pista.appendChild(reciclado);
      elementos = [elementos[1], elementos[2], elementos[0]];
    } else {
      pista.insertBefore(reciclado, elementos[0]);
      elementos = [elementos[2], elementos[0], elementos[1]];
    }

    elementos[0].classList.add("tarjeta-nivel--lateral");
    elementos[2].classList.add("tarjeta-nivel--lateral");
    elementos[1].classList.remove("tarjeta-nivel--lateral");

    renderizarTarjetas();

    pista.style.transition = "none";
    pista.style.transform = `translateX(${reposo}px)`;
    void pista.offsetWidth;
    animando = false;
  }, { once: true });
}

function irANivel(numeroDeseado) {
  if (animando || obtenerNivelesFrc().length === 0) return;
  const total = obtenerNivelesFrc().length;
  const numero = Math.round(numeroDeseado);

  if (!Number.isFinite(numero) || numero < 1 || numero > total) {
    document.getElementById("input-ir-a-nivel-frc").value = "";
    return;
  }

  nivelActualId = numero;
  renderizarTarjetas();
  document.getElementById("input-ir-a-nivel-frc").value = "";
}

function manejarClicComenzar(evento) {
  const boton = evento.target.closest(".boton-comenzar-nivel");
  if (!boton) return;
  const tarjeta = boton.closest(".tarjeta-nivel");
  if (tarjeta.classList.contains("tarjeta-nivel--lateral")) return;
  if (!nivelDesbloqueado(nivelActualId)) return;
  alComenzarNivelFrc?.(nivelActualId);
}

export async function inicializarMapaNivelesFrc() {
  await cargarNivelesFrc();

  const pista = document.getElementById("carrusel-pista-frc");
  elementos = Array.from(pista.children);
  renderizarTarjetas();

  document.getElementById("flecha-izquierda-frc").addEventListener("click", () => cambiarNivel(-1));
  document.getElementById("flecha-derecha-frc").addEventListener("click", () => cambiarNivel(1));
  pista.addEventListener("click", manejarClicComenzar);

  document.getElementById("form-ir-a-nivel-frc").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const valor = document.getElementById("input-ir-a-nivel-frc").value;
    irANivel(Number(valor));
  });
}

export async function mostrarMapaNivelesFrc() {
  await cargarNivelesFrc();
  renderizarTarjetas();
  mostrarPantalla("on-frc");
}

export function refrescarMapaNivelesFrc() {
  renderizarTarjetas();
}

export function irANivelFrcEspecifico(id) {
  nivelActualId = id;
  renderizarTarjetas();
}