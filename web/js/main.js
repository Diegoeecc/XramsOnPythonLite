import { inicializarDecoraciones } from "./decoraciones.js";
import { reproducirIntro } from "./intro/intro.js";
import { mostrarPantalla, inicializarBotonesVolver } from "./pantallas.js";
import { inicializarMenu } from "./menu/menu.js";
import { iniciarPyodide, sincronizarComponentesFrc } from "./pyodide/pyodideBridge.js";
import { inicializarMapaNiveles, establecerAlComenzarNivel } from "./niveles/mapaNiveles.js";
import { inicializarPantallaNivel, iniciarNivel } from "./niveles/jugarNivel.js";
import { inicializarSandbox } from "./sandbox/sandbox.js";
import { inicializarPantallaNivelFrc, iniciarNivelFrc } from "./niveles/jugarNivelFrc.js";
import { inicializarSistemaArenaFrc } from "./frc/arena.js";
import { inicializarMapaNivelesFrc, establecerAlComenzarNivelFrc } from "./niveles/mapaNivelesFrc.js";
import { inicializarAjustes } from "./ajustes.js";
import { inicializarBarraTitulo } from "./barraTitulo.js";

document.addEventListener("DOMContentLoaded", async () => {
  inicializarDecoraciones();
  inicializarMenu();
  inicializarBotonesVolver();

  await inicializarMapaNiveles();
  await inicializarPantallaNivel();
  establecerAlComenzarNivel(iniciarNivel);
  inicializarSandbox();
  inicializarAjustes();
  inicializarPantallaNivelFrc();
  inicializarSistemaArenaFrc();
  await inicializarMapaNivelesFrc();
  establecerAlComenzarNivelFrc(iniciarNivelFrc);
  inicializarBarraTitulo();

  mostrarPantalla("intro");

  reproducirIntro();

  iniciarPyodide();
  revisarActualizaciones();
});

async function revisarActualizaciones() {
  if (!window.__TAURI__?.updater) {
    console.log("Updater no disponible.");
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
    console.log("No se pudo revisar actualizaciones:", error);
  }
}