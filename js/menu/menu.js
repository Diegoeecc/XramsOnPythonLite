import { pedirConfirmacion } from "../modal.js";
import { resetearProgreso } from "../progreso/progreso.js";
import { mostrarMapaNiveles, refrescarMapaNiveles } from "../niveles/mapaNiveles.js";
import { mostrarSandbox } from "../sandbox/sandbox.js";

export function inicializarMenu() {
  document.querySelectorAll('[data-pantalla="menu"] .boton-menu').forEach((boton) => {
    boton.addEventListener("click", () => manejarClicMenu(boton.dataset.accion, boton));
  });
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

    case "resetear":
      pedirConfirmacion({
        mensaje: "¿Seguro que quieres borrar todo tu progreso en Niveles? Esta acción no se puede deshacer.",
        onConfirmar: () => {
          resetearProgreso();
          refrescarMapaNiveles();
        },
      });
      break;
  }
}