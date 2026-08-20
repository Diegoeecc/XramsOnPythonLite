// Barra superior estilo "auto-hide": aparece si el mouse se acerca a los primeros
// píxeles de la pantalla, y se oculta si el mouse se aleja y no está sobre ella.

export function inicializarBarraTitulo() {
  const barra = document.getElementById("barra-titulo-personalizada");
  const ZONA_ACTIVACION = 10; // píxeles desde arriba de la pantalla

  document.addEventListener("mousemove", (evento) => {
    if (evento.clientY <= ZONA_ACTIVACION) {
      barra.classList.add("visible");
    } else if (evento.clientY > barra.offsetHeight && !barra.matches(":hover")) {
      barra.classList.remove("visible");
    }
  });

  const ventana = window.__TAURI__?.window?.getCurrentWindow?.();

  document.getElementById("barra-titulo-minimizar").addEventListener("click", () => {
    ventana?.minimize();
  });

  document.getElementById("barra-titulo-cerrar").addEventListener("click", () => {
    ventana?.close();
  });
}