import { obtenerNiveles } from "./niveles/datosNiveles.js";
import { desbloquearTodosLosNiveles, desbloquearNivelesHasta } from "./progreso/progreso.js";
import { refrescarMapaNiveles } from "./niveles/mapaNiveles.js";

// Desbloquea los niveles del curso "Básico".
const CODIGOS_DESBLOQUEO_BASICO = [
  "xramsdecadencia",
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

      // Patrón especial: U_OB()-N → desbloquea del nivel 1 al N del curso Básico.
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
      }

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