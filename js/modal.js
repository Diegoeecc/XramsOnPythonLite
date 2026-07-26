export function pedirConfirmacion({ mensaje, onConfirmar }) {
  const modal = document.getElementById("modal-confirmacion");
  const texto = document.getElementById("modal-mensaje");
  const btnConfirmar = document.getElementById("modal-confirmar");
  const btnCancelar = document.getElementById("modal-cancelar");

  texto.textContent = mensaje;
  modal.classList.remove("oculto");

  function limpiar() {
    modal.classList.add("oculto");
    btnConfirmar.removeEventListener("click", confirmar);
    btnCancelar.removeEventListener("click", cancelar);
  }
  function confirmar() {
    limpiar();
    onConfirmar?.();
  }
  function cancelar() {
    limpiar();
  }

  btnConfirmar.addEventListener("click", confirmar);
  btnCancelar.addEventListener("click", cancelar);
}