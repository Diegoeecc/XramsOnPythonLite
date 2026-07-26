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
  revisarActualizaciones();
});

async function revisarActualizaciones() {
  if (!window.__TAURI__?.updater) {
    console.log("Updater no disponible (normal si no estás dentro de la app empaquetada de Tauri).");
    return;
  }
  try {
    const { check } = window.__TAURI__.updater;
    const { relaunch } = window.__TAURI__.process;
    const actualizacion = await check();
    if (actualizacion) {
      const confirmar = confirm(`Hay una nueva versión (${actualizacion.version}) disponible. ¿Instalarla ahora?`);
      if (confirmar) {
        await actualizacion.downloadAndInstall();
        await relaunch();
      }
    }
  } catch (error) {
    console.log("No se pudo revisar actualizaciones (normal si no estás dentro de la app empaquetada):", error);
  }
}