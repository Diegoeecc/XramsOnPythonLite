export function mostrarPantalla(nombre) {
  document.querySelectorAll(".pantalla").forEach((el) => {
    const activa = el.dataset.pantalla === nombre;
    el.dataset.activa = activa ? "true" : "false";
    if (activa) revelarContenido(el);
  });
}

function revelarContenido(pantalla) {
  const elementos = pantalla.querySelectorAll("[data-orden]");
  elementos.forEach((el) => {
    el.classList.remove("revelar-elemento");
    void el.offsetWidth;
    el.style.setProperty("--orden", el.dataset.orden);
    el.classList.add("revelar-elemento");
  });
}

// Cualquier botón con data-volver="nombre-pantalla" regresa a esa pantalla solo.
export function inicializarBotonesVolver() {
  document.querySelectorAll("[data-volver]").forEach((boton) => {
    boton.addEventListener("click", () => mostrarPantalla(boton.dataset.volver));
  });
}