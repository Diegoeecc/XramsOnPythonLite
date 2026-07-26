import { inicializarDecoraciones } from "./decoraciones.js";
import { reproducirIntro } from "./intro/intro.js";
import { mostrarPantalla, inicializarBotonesVolver } from "./pantallas.js";
import { inicializarMenu } from "./menu/menu.js";
import { iniciarPyodide } from "./pyodide/pyodideBridge.js";
import { inicializarMapaNiveles, establecerAlComenzarNivel } from "./niveles/mapaNiveles.js";
import { inicializarPantallaNivel, iniciarNivel } from "./niveles/jugarNivel.js";
import { inicializarSandbox } from "./sandbox/sandbox.js";
import { inicializarAjustes } from "./ajustes.js";

document.addEventListener("DOMContentLoaded", async () => {
  inicializarDecoraciones();
  inicializarMenu();
  inicializarBotonesVolver();

  await inicializarMapaNiveles();
  await inicializarPantallaNivel();
  establecerAlComenzarNivel(iniciarNivel);
  inicializarSandbox();
  inicializarAjustes();

  mostrarPantalla("intro");

  reproducirIntro({
    onTerminar: () => {
      console.log("Intro terminada, mostrando menú");
    }
  });

  iniciarPyodide();
});