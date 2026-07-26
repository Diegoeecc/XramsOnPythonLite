import { mostrarPantalla } from "../pantallas.js";

export function reproducirIntro({ onTerminar } = {}) {
  const logo = document.getElementById("logo-intro");
  const alt = document.getElementById("logo-intro-alt");

  logo.addEventListener("error", () => {
    logo.style.display = "none";
    animarLogo(alt);
  }, { once: true });

  if (logo.complete && logo.naturalWidth > 0) {
    animarLogo(logo);
  } else if (!logo.getAttribute("src")) {
    animarLogo(alt);
  } else {
    logo.addEventListener("load", () => animarLogo(logo), { once: true });
  }

  function animarLogo(elemento) {
    elemento.classList.add("aparece");
    elemento.addEventListener("animationend", function esperar() {
      elemento.removeEventListener("animationend", esperar);
      setTimeout(() => {
        elemento.classList.remove("aparece");
        elemento.classList.add("desaparece");
        elemento.addEventListener("animationend", function terminar() {
          elemento.removeEventListener("animationend", terminar);
          mostrarPantalla("menu");
          onTerminar?.();
        }, { once: true });
      }, 1800); // segundos que el logo se queda visible
    }, { once: true });
  }
}