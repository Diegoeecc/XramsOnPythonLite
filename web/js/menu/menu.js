import { mostrarPantalla } from "../pantallas.js";
import { pedirConfirmacion } from "../modal.js";
import { resetearProgreso, tieneAccesoFrc } from "../progreso/progreso.js";
import { mostrarMapaNiveles, refrescarMapaNiveles } from "../niveles/mapaNiveles.js";
import { mostrarSandbox } from "../sandbox/sandbox.js";
import { cargarNiveles, obtenerNiveles } from "../niveles/datosNiveles.js";

export function inicializarMenu() {
  document.querySelectorAll('[data-pantalla="menu"] .boton-menu').forEach((boton) => {
    boton.addEventListener("click", () => manejarClicMenu(boton.dataset.accion, boton));
  });
  actualizarEstadoBotonFrc();
}

// Se llama cada vez que el progreso pudo haber cambiado (nivel completado, reset, código
// aplicado en Ajustes) para decidir si "On FRC" debe verse bloqueado o no.
export async function actualizarEstadoBotonFrc() {
  await cargarNiveles();
  const total = obtenerNiveles().length;
  const boton = document.querySelector('[data-pantalla="menu"] [data-accion="on-frc"]');
  if (!boton) return;
  boton.dataset.bloqueado = tieneAccesoFrc(total) ? "false" : "true";
}

function manejarClicMenu(accion, boton) {
  if (boton?.dataset.bloqueado === "true") return;

  switch (accion) {
    case "niveles":
      mostrarMapaNiveles();
      break;

    case "sandbox":
      mostrarSandbox();
      break;

    case "on-frc":
      mostrarPantalla("on-frc");
      break;

    case "resetear":
      pedirConfirmacion({
        mensaje: "¿Seguro que quieres borrar todo tu progreso en Niveles? Esta acción no se puede deshacer.",
        onConfirmar: () => {
          resetearProgreso();
          refrescarMapaNiveles();
          actualizarEstadoBotonFrc();
        },
      });
      break;
  }
}