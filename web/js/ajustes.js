import { obtenerNiveles } from "./niveles/datosNiveles.js";
import { cargarNivelesFrc, obtenerNivelesFrc } from "./niveles/datosNivelesFrc.js";
import { desbloquearTodosLosNiveles, desbloquearNivelesHasta, desbloquearNivelesFrcHasta, otorgarAccesoFrc, otorgarTodosLosNivelesFrc } from "./progreso/progreso.js";
import { refrescarMapaNivelesFrc } from "./niveles/mapaNivelesFrc.js";
import { refrescarMapaNiveles } from "./niveles/mapaNiveles.js";
import { actualizarEstadoBotonFrc } from "./menu/menu.js";

// 3 listas independientes — agrega aquí los códigos que quieras para cada una.
// Se comparan sin importar mayúsculas/minúsculas.

// Desbloquea los 37 niveles del curso "Básico" (el que ya construimos).
const CODIGOS_DESBLOQUEO_BASICO = [
  "xramsdecadencia",
];

// Le quita el candado al botón "On FRC" (aunque no hayas terminado el Básico todavía).
const CODIGOS_ACCESO_FRC = [
  "2027registro",
];

// Desbloquea todos los niveles DENTRO de "On FRC" (una vez que existan).
const CODIGOS_NIVELES_FRC = [
  "lorenitonuncaestuvoaqui",
];

export function inicializarAjustes() {
  const modal = document.getElementById("modal-ajustes");
  const input = document.getElementById("ajustes-input-codigo");
  const mensaje = document.getElementById("ajustes-mensaje-codigo");

  document.getElementById("boton-ajustes").addEventListener("click", () => {
    input.value = "";
    mensaje.textContent = "";
    mensaje.className = "ajustes-mensaje";
    modal.classList.remove("oculto");
  });

  document.getElementById("ajustes-cerrar").addEventListener("click", () => {
    modal.classList.add("oculto");
  });

  async function aplicarCodigo() {
    const valor = input.value.trim();
    if (!valor) return;

    function sacaDeDondeEsElCodigo() {
      if (CODIGOS_DESBLOQUEO_BASICO.some((codigo) => codigo.toLowerCase() === valor.toLowerCase())) {
        return { tipo: "basico", texto: `Niveles "Básico" desbloqueados: ${obtenerNiveles().length}` };
      }
      if (CODIGOS_ACCESO_FRC.some((codigo) => codigo.toLowerCase() === valor.toLowerCase())) {
        return { tipo: "acceso-frc", texto: "Acceso a \"On FRC\" desbloqueado." };
      }
      if (CODIGOS_NIVELES_FRC.some((codigo) => codigo.toLowerCase() === valor.toLowerCase())) {
        return { tipo: "niveles-frc", texto: "Todos los niveles de \"On FRC\" desbloqueados." };
      }

      // Patrón especial: U_OB()-N  →  desbloquea del nivel 1 al N del curso Básico.
      const coincidenciaPatron = valor.match(/^U_OB\(\)-(\d+)$/i);
      if (coincidenciaPatron) {
        const hastaId = parseInt(coincidenciaPatron[1], 10);
        const total = obtenerNiveles().length;
        if (hastaId < 1 || hastaId > total) {
          return { tipo: "invalido", texto: `Ese código es válido, pero el número debe estar entre 1 y ${total}.` };
        }
        return { tipo: "basico-parcial", hastaId, texto: `Niveles "Básico" desbloqueados: 1 al ${hastaId}` };
      }

      return null;
    }

    const resultado = sacaDeDondeEsElCodigo();

    if (resultado != null && resultado.tipo !== "invalido") {
      if (resultado.tipo === "basico") {
        desbloquearTodosLosNiveles(obtenerNiveles().length);
        refrescarMapaNiveles();
      } else if (resultado.tipo === "basico-parcial") {
        desbloquearNivelesHasta(resultado.hastaId);
        refrescarMapaNiveles();
      } else if (resultado.tipo === "acceso-frc") {
        otorgarAccesoFrc();
      } else if (resultado.tipo === "niveles-frc") {
        otorgarTodosLosNivelesFrc();
        await cargarNivelesFrc();
        desbloquearNivelesFrcHasta(obtenerNivelesFrc().length);
        refrescarMapaNivelesFrc();
      }

      actualizarEstadoBotonFrc();
      mensaje.textContent = resultado.texto;
      mensaje.className = "ajustes-mensaje exito";
    } else if (resultado?.tipo === "invalido") {
      mensaje.textContent = resultado.texto;
      mensaje.className = "ajustes-mensaje error";
    } else {
      mensaje.textContent = "Código no válido.";
      mensaje.className = "ajustes-mensaje error";
    }
  }

  document.getElementById("ajustes-aplicar-codigo").addEventListener("click", aplicarCodigo);
  input.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") aplicarCodigo();
  });
}