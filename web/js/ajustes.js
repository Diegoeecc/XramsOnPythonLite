import { obtenerNiveles } from "./niveles/datosNiveles.js";
import { desbloquearTodosLosNiveles } from "./progreso/progreso.js";
import { refrescarMapaNiveles } from "./niveles/mapaNiveles.js";

// Lista expandible: agrega aquí cualquier código nuevo que también desbloquee todos los niveles.
// Se compara sin importar mayúsculas/minúsculas.
const CODIGOS_DESBLOQUEO = [
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

  function aplicarCodigo() {
    const valor = input.value.trim();
    if (!valor) return;

    function sacaDeDondeEsElCodigo(){
      if (CODIGOS_DESBLOQUEO.some((codigo) => codigo.toLowerCase() === valor.toLowerCase()) == true){
        return "Niveles 'Basico' desbloqueados: 38"
      }

      return "Error"
    }

    let textoRespuesta = sacaDeDondeEsElCodigo()

    if (textoRespuesta != "Error") {
      desbloquearTodosLosNiveles(obtenerNiveles().length);
      refrescarMapaNiveles();
      mensaje.textContent = textoRespuesta;
      mensaje.className = "ajustes-mensaje exito";
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