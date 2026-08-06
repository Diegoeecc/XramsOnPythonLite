// Vive dentro del Web Worker de Pyodide. Mantiene el estado numérico de los
// componentes FRC (potencia, revoluciones, enlaces) y el reloj de física en tiempo real.
// No tiene acceso al DOM — la parte visual (arena) se construye en una fase aparte.

let registroComponentes = {};
let intervaloFisica = null;
let ultimoTickFisica = null;

const RPM_MAXIMO = 6000;

function puedenEnlazarseFrc(tipoA, tipoB) {
  if (tipoA === "LED" || tipoB === "LED") return false;
  if (tipoA === "Encoder" && tipoB === "Encoder") return false;
  if ((tipoA === "MotorMCI" && tipoB === "MotorController") || (tipoB === "MotorMCI" && tipoA === "MotorController")) return false;
  return true;
}

function sincronizarComponentesArenaFrc(lista) {
  const nuevoRegistro = {};
  (lista || []).forEach(({ id, tipo, enlazadoCon }) => {
    nuevoRegistro[String(id)] = {
      tipo, potencia: 0, revoluciones: 0,
      enlazadoCon: enlazadoCon != null ? String(enlazadoCon) : null,
      color: [255, 255, 255], encendido: false,
    };
  });
  registroComponentes = nuevoRegistro;
}

function registrarComponenteFrc(id, tipo) {
  const clave = String(id);
  if (!registroComponentes[clave]) {
    registroComponentes[clave] = { tipo, potencia: 0, revoluciones: 0, enlazadoCon: null, color: [255, 255, 255], encendido: false };
  }
  return registroComponentes[clave];
}

function reiniciarFisicaFrc() {
  Object.values(registroComponentes).forEach((c) => {
    c.potencia = 0;
    c.revoluciones = 0;
  });
  ultimoTickFisica = Date.now();
}

function iniciarRelojFisicaFrc() {
  detenerRelojFisicaFrc();
  ultimoTickFisica = Date.now();
  intervaloFisica = setInterval(tickFisicaFrc, 50);
}

function detenerRelojFisicaFrc() {
  if (intervaloFisica) clearInterval(intervaloFisica);
  intervaloFisica = null;
}

function tickFisicaFrc() {
  const ahora = Date.now();
  const deltaSegundos = (ahora - ultimoTickFisica) / 1000;
  ultimoTickFisica = ahora;

  Object.keys(registroComponentes).forEach((id) => {
    const c = registroComponentes[id];
    if (c.tipo === "MotorMCI" || c.tipo === "MotorController" || c.tipo === "MotorEMC") {
      const potencia = potenciaEfectivaFrc(id);
      const rpm = potencia * RPM_MAXIMO;
      c.revoluciones += (rpm / 60) * deltaSegundos;
    }
  });
}

function potenciaEfectivaFrc(id, visitados = new Set()) {
  if (visitados.has(id)) return 0;
  visitados.add(id);
  const c = registroComponentes[id];
  if (!c) return 0;

  if (c.tipo === "MotorMCI" || c.tipo === "MotorController") return c.potencia || 0;
  if (c.tipo === "MotorEMC") {
    if (!c.enlazadoCon) return 0;
    const objetivo = registroComponentes[c.enlazadoCon];
    if (!objetivo || objetivo.tipo !== "MotorController") return 0;
    return potenciaEfectivaFrc(c.enlazadoCon, visitados);
  }
  return 0;
}

function establecerPotenciaFrc(id, potencia) {
  const c = registrarComponenteFrc(id, registroComponentes[String(id)]?.tipo || "MotorMCI");
  c.potencia = potencia;
}

function idMotorEnlazadoAEncoderFrc(idEncoder) {
  const c = registroComponentes[String(idEncoder)];
  if (!c || c.tipo !== "Encoder" || !c.enlazadoCon) return null;
  return registroComponentes[c.enlazadoCon] ? c.enlazadoCon : null;
}

function obtenerVelocidadFrc(idEncoder) {
  const idMotor = idMotorEnlazadoAEncoderFrc(idEncoder);
  if (!idMotor) return 0;
  return potenciaEfectivaFrc(idMotor) * RPM_MAXIMO;
}

function obtenerPosicionFrc(idEncoder) {
  const idMotor = idMotorEnlazadoAEncoderFrc(idEncoder);
  if (!idMotor) return 0;
  return registroComponentes[idMotor]?.revoluciones || 0;
}

function obtenerAnguloFrc(idEncoder) {
  const posicion = obtenerPosicionFrc(idEncoder);
  const angulo = (posicion * 360) % 360;
  return angulo < 0 ? angulo + 360 : angulo;
}

function encenderLedFrc(id) {
  registrarComponenteFrc(id, "LED").encendido = true;
}

function apagarLedFrc(id) {
  registrarComponenteFrc(id, "LED").encendido = false;
}

function establecerColorLedFrc(id, r, g, b) {
  registrarComponenteFrc(id, "LED").color = [r, g, b];
}

function notificarEstadoMotor(clave) {
  const c = registroComponentes[clave];
  if (!c) return;
  if (c.tipo !== "MotorMCI" && c.tipo !== "MotorController" && c.tipo !== "MotorEMC") return;
  const potencia = potenciaEfectivaFrc(clave);
  self.postMessage({ tipo: "frc_motor", id: clave, potencia });
}

function notificarMotoresRelacionados(claveControlador) {
  notificarEstadoMotor(claveControlador);
  Object.keys(registroComponentes).forEach((clave) => {
    const c = registroComponentes[clave];
    if (c.tipo === "MotorEMC" && c.enlazadoCon === claveControlador) {
      notificarEstadoMotor(clave);
    }
  });
}

function hayLedEncendidoFrc() {
  return Object.values(registroComponentes).some((c) => c.tipo === "LED" && c.encendido);
}

function hayMotorActivoFrc() {
  return Object.keys(registroComponentes).some((clave) => {
    const c = registroComponentes[clave];
    if (c.tipo !== "MotorMCI" && c.tipo !== "MotorController") return false;
    return potenciaEfectivaFrc(clave) !== 0;
  });
  // Nota: MotorEMC no se revisa aparte a propósito — su potencia siempre depende
  // de un MotorController, así que si ese Controller está activo, ya lo cubre este chequeo.
}

function obtenerComponentePorId(id) {
  return registroComponentes[String(id)];
}

function validarSpecFrc(spec) {
  const tipo = spec.tipo;

  if (tipo === "frc_motor_potencia") {
    const c = obtenerComponentePorId(spec.id);
    if (!c) return false;
    const potenciaReal = potenciaEfectivaFrc(String(spec.id));
    const tolerancia = spec.tolerancia ?? 0.05;
    return Math.abs(potenciaReal - spec.valor) <= tolerancia;
  }

  if (tipo === "frc_led_estado") {
    const c = obtenerComponentePorId(spec.id);
    if (!c || c.tipo !== "LED") return false;
    if (typeof spec.encendido === "boolean" && c.encendido !== spec.encendido) return false;
    if (spec.color) {
      const [r, g, b] = spec.color;
      const [cr, cg, cb] = c.color;
      const tol = spec.tolerancia_color ?? 0;
      if (Math.abs(cr - r) > tol || Math.abs(cg - g) > tol || Math.abs(cb - b) > tol) return false;
    }
    return true;
  }

  if (tipo === "frc_encoder") {
    const c = obtenerComponentePorId(spec.id);
    if (!c || c.tipo !== "Encoder") return false;
    let valorReal;
    if (spec.medida === "posicion") valorReal = obtenerPosicionFrc(String(spec.id));
    else if (spec.medida === "angulo") valorReal = obtenerAnguloFrc(String(spec.id));
    else if (spec.medida === "velocidad") valorReal = obtenerVelocidadFrc(String(spec.id));
    else return false;
    const tolerancia = spec.tolerancia ?? 5;
    return Math.abs(valorReal - spec.valor) <= tolerancia;
  }

  if (tipo === "frc_enlace") {
    const a = obtenerComponentePorId(spec.idA);
    if (!a) return false;
    return a.enlazadoCon === String(spec.idB);
  }

  if (tipo === "frc_componente_existe") {
    const c = obtenerComponentePorId(spec.id);
    if (!c) return false;
    if (spec.componenteTipo && c.tipo !== spec.componenteTipo) return false;
    return true;
  }

  return false;
}