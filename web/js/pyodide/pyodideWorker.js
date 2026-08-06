importScripts(`simuladorFrcWorker.js?v=${Date.now()}`);

let pyodide = null;
let listo = false;

function enviarSalida(flujo, texto) {
  self.postMessage({ tipo: "salida", flujo, texto });
}

function enviarComandoTortuga(comandoJson) {
  self.postMessage({ tipo: "tortuga", comando: comandoJson });
}

function postEstadoLed(id) {
  const clave = String(id);
  const c = registroComponentes[clave];
  if (!c) return;
  self.postMessage({ tipo: "frc_led", id: clave, encendido: c.encendido, color: c.color });
}

async function iniciar() {
  self.postMessage({ tipo: "estado", mensaje: "cargando" });

  importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.0/full/pyodide.js");
  pyodide = await loadPyodide();

  pyodide.globals.set("_enviar_salida", enviarSalida);
  pyodide.globals.set("_tortuga_dibujar_js", enviarComandoTortuga);
  pyodide.globals.set("_xop_establecer_potencia_js", (id, p) => {
    establecerPotenciaFrc(id, p);
    notificarMotoresRelacionados(String(id));
  });
  pyodide.globals.set("_xop_obtener_velocidad_js", (id) => obtenerVelocidadFrc(id));
  pyodide.globals.set("_xop_obtener_angulo_js", (id) => obtenerAnguloFrc(id));
  pyodide.globals.set("_xop_obtener_posicion_js", (id) => obtenerPosicionFrc(id));
  pyodide.globals.set("_xop_encender_led_js", (id) => { encenderLedFrc(id); postEstadoLed(id); });
  pyodide.globals.set("_xop_apagar_led_js", (id) => { apagarLedFrc(id); postEstadoLed(id); });
  pyodide.globals.set("_xop_color_led_js", (id, r, g, b) => { establecerColorLedFrc(id, r, g, b); postEstadoLed(id); });
  pyodide.globals.set("_xop_registrar_componente_js", (id, tipo) => registrarComponenteFrc(id, tipo));

  await pyodide.runPythonAsync(`
import sys

class _EscritorSalida:
    def __init__(self, flujo):
        self.flujo = flujo
    def write(self, texto):
        if texto:
            _enviar_salida(self.flujo, texto)
    def flush(self):
        pass

class _EscritorErrores:
    def __init__(self):
        self.buffer = []
    def write(self, texto):
        if texto:
            self.buffer.append(texto)
    def flush(self):
        pass
    def obtener_y_limpiar(self):
        texto = "".join(self.buffer)
        self.buffer = []
        return texto

sys.stdout = _EscritorSalida("stdout")
_escritor_errores = _EscritorErrores()
sys.stderr = _escritor_errores
  `);

  const codigoTurtle = await (await fetch(`./turtleShim.py?v=${Date.now()}`, { cache: "no-store" })).text();
  pyodide.globals.set("_codigo_fuente_turtle", codigoTurtle);
  await pyodide.runPythonAsync(`
import sys, types
_modulo_turtle = types.ModuleType("turtle")
_modulo_turtle.__dict__["_tortuga_dibujar"] = _tortuga_dibujar_js
exec(_codigo_fuente_turtle, _modulo_turtle.__dict__)
sys.modules["turtle"] = _modulo_turtle
del _codigo_fuente_turtle
  `);

  const codigoXop = await (await fetch(`./xopCommandsShim.py?v=${Date.now()}`, { cache: "no-store" })).text();
  pyodide.globals.set("_codigo_fuente_xop", codigoXop);
  await pyodide.runPythonAsync(`
import sys, types
_modulo_xop = types.ModuleType("XOPcommands")
_modulo_xop.__dict__["_xop_establecer_potencia_js"] = _xop_establecer_potencia_js
_modulo_xop.__dict__["_xop_obtener_velocidad_js"] = _xop_obtener_velocidad_js
_modulo_xop.__dict__["_xop_obtener_angulo_js"] = _xop_obtener_angulo_js
_modulo_xop.__dict__["_xop_obtener_posicion_js"] = _xop_obtener_posicion_js
_modulo_xop.__dict__["_xop_encender_led_js"] = _xop_encender_led_js
_modulo_xop.__dict__["_xop_apagar_led_js"] = _xop_apagar_led_js
_modulo_xop.__dict__["_xop_color_led_js"] = _xop_color_led_js
_modulo_xop.__dict__["_xop_registrar_componente_js"] = _xop_registrar_componente_js
exec(_codigo_fuente_xop, _modulo_xop.__dict__)
sys.modules["XOPcommands"] = _modulo_xop
del _codigo_fuente_xop
  `);

  listo = true;
  self.postMessage({ tipo: "estado", mensaje: "listo" });
}

async function ejecutar(codigo) {
  if (!listo) {
    self.postMessage({ tipo: "error", texto: "Python todavía no está listo, espera un momento." });
    self.postMessage({ tipo: "fin", huboError: true });
    return;
  }

  try {
    await pyodide.runPythonAsync(`
import sys, os
if "turtle" in sys.modules:
    sys.modules["turtle"]._reiniciar_tortuga()

if os.path.isdir("/sandbox"):
    os.chdir("/sandbox")
    if "/sandbox" not in sys.path:
        sys.path.insert(0, "/sandbox")
    for _nombre_modulo in list(sys.modules):
        _modulo = sys.modules[_nombre_modulo]
        _archivo = getattr(_modulo, "__file__", "") or ""
        if _archivo.startswith("/sandbox"):
            del sys.modules[_nombre_modulo]
    `);

    reiniciarFisicaFrc();
    iniciarRelojFisicaFrc(); // sigue corriendo aunque el script ya termine (como un robot real)

    await pyodide.runPythonAsync(codigo);
    self.postMessage({ tipo: "fin", huboError: false, ledActivo: hayLedEncendidoFrc(), motorActivo: hayMotorActivoFrc() });
  } catch (error) {
    let textoError = String(error?.message || error || "Ocurrió un error desconocido.");
    try {
      const bufferPython = await pyodide.runPythonAsync(`_escritor_errores.obtener_y_limpiar()`);
      if (bufferPython && bufferPython.trim()) textoError = bufferPython;
    } catch (_e) { /* nos quedamos con textoError de arriba */ }

    self.postMessage({ tipo: "error", texto: textoError });
    self.postMessage({ tipo: "fin", huboError: true });
  }
}

async function validar(especificacionJson) {
  try {
    const specs = JSON.parse(especificacionJson);
    const lista = Array.isArray(specs) ? specs : [specs];

    const specsFrc = lista.filter((s) => s.tipo.startsWith("frc_"));
    const specsPython = lista.filter((s) => !s.tipo.startsWith("frc_"));

    // Corto-circuito: si algún check de FRC ya falló, ni siquiera corremos Python.
    let todosOk = specsFrc.every((spec) => validarSpecFrc(spec));

    if (todosOk && specsPython.length > 0) {
      pyodide.globals.set("_spec_validacion_json", JSON.stringify(specsPython));
      const resultado = await pyodide.runPythonAsync(`
import json
_specs = json.loads(_spec_validacion_json)

_todos_ok = True
for _spec in _specs:
    _tipo = _spec["tipo"]
    _ok = False

    if _tipo == "variable":
        _nombre = _spec["nombre"]
        _esperado = _spec["valor"]
        if _nombre in globals():
            _ok = globals()[_nombre] == _esperado
    elif _tipo == "funcion":
        _nombre = _spec["nombre"]
        _args = _spec.get("argumentos", [])
        _esperado = _spec["retorno"]
        if _nombre in globals() and callable(globals()[_nombre]):
            try:
                _ok = globals()[_nombre](*_args) == _esperado
            except Exception:
                _ok = False
    elif _tipo == "tortuga_posicion":
        import sys as _sys2
        _t = _sys2.modules.get("turtle")
        if _t is not None:
            _tol = _spec.get("tolerancia", 5)
            _dist_min = _spec.get("distancia_minima", 10)
            _dx = abs(_t._estado.x - _spec["x"])
            _dy = abs(_t._estado.y - _spec["y"])
            _se_movio = _t._estado.distancia_total >= _dist_min
            _ok = _dx <= _tol and _dy <= _tol and _se_movio

    if not _ok:
        _todos_ok = False
        break

_todos_ok
      `);
      todosOk = Boolean(resultado);
    }

    self.postMessage({ tipo: "resultado_validacion", ok: todosOk });
  } catch (error) {
    self.postMessage({ tipo: "resultado_validacion", ok: false });
  }
}

const RAIZ_SANDBOX = "/sandbox";

function sincronizarArchivos(archivos) {
  try { pyodide.FS.mkdirTree(RAIZ_SANDBOX); } catch (_e) { /* ya existe */ }
  archivos.forEach(({ ruta, contenido }) => {
    const rutaCompleta = `${RAIZ_SANDBOX}/${ruta}`;
    const partes = rutaCompleta.split("/");
    if (partes.length > 2) {
      const carpeta = partes.slice(0, -1).join("/");
      try { pyodide.FS.mkdirTree(carpeta); } catch (_e) { /* ya existe */ }
    }
    pyodide.FS.writeFile(rutaCompleta, contenido);
  });
}

self.onmessage = (evento) => {
  if (evento.data.tipo === "ejecutar") ejecutar(evento.data.codigo);
  if (evento.data.tipo === "validar") validar(JSON.stringify(evento.data.especificacion));
  if (evento.data.tipo === "sincronizar_archivos") sincronizarArchivos(evento.data.archivos);
  if (evento.data.tipo === "sincronizar_frc") sincronizarComponentesArenaFrc(evento.data.componentes);
};

iniciar();