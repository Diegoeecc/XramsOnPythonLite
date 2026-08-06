const CLAVE_ALMACENAMIENTO = "pythonis_progreso";
const CLAVE_ACCESO_FRC = "pythonis_acceso_frc";
const CLAVE_FRC_TODO_DESBLOQUEADO = "pythonis_frc_todo_desbloqueado";

export function obtenerProgreso() {
  try {
    const datos = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    return datos ? JSON.parse(datos) : {};
  } catch (error) {
    console.error("No se pudo leer el progreso guardado:", error);
    return {};
  }
}

function guardarProgreso(progreso) {
  localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(progreso));
}

export function estaCompletado(nivelId) {
  const progreso = obtenerProgreso();
  return Boolean(progreso[nivelId]?.completado);
}

export function marcarNivelCompletado(nivelId, puntaje = 100) {
  const progreso = obtenerProgreso();
  progreso[nivelId] = {
    completado: true,
    puntaje,
    fecha: new Date().toISOString(),
  };
  guardarProgreso(progreso);
}

export function resetearProgreso() {
  localStorage.removeItem(CLAVE_ALMACENAMIENTO);
}

export function desbloquearTodosLosNiveles(totalNiveles) {
  desbloquearNivelesHasta(totalNiveles);
}

// Desbloquea (marca como completados) los niveles del 1 hasta "hastaId" incluido, sin tocar los demás.
export function desbloquearNivelesHasta(hastaId) {
  const progreso = obtenerProgreso();
  for (let id = 1; id <= hastaId; id++) {
    if (!progreso[id]?.completado) {
      progreso[id] = { completado: true, puntaje: 100, fecha: new Date().toISOString() };
    }
  }
  guardarProgreso(progreso);
}

// Revisa si TODOS los niveles del curso básico (1 al total) ya están completados.
export function estanTodosCompletados(totalNiveles) {
  if (totalNiveles === 0) return false;
  const progreso = obtenerProgreso();
  for (let id = 1; id <= totalNiveles; id++) {
    if (!progreso[id]?.completado) return false;
  }
  return true;
}

// --- "On FRC": acceso al botón, y desbloqueo de sus niveles avanzados ---

export function otorgarAccesoFrc() {
  localStorage.setItem(CLAVE_ACCESO_FRC, "true");
}

// El botón se desbloquea si terminaste el básico completo, O si tienes acceso otorgado por código.
export function tieneAccesoFrc(totalNivelesBasico) {
  if (localStorage.getItem(CLAVE_ACCESO_FRC) === "true") return true;
  return estanTodosCompletados(totalNivelesBasico);
}

export function otorgarTodosLosNivelesFrc() {
  localStorage.setItem(CLAVE_FRC_TODO_DESBLOQUEADO, "true");
}

export function tieneTodosLosNivelesFrc() {
  return localStorage.getItem(CLAVE_FRC_TODO_DESBLOQUEADO) === "true";
}

const CLAVE_PROGRESO_FRC = "pythonis_progreso_frc";

export function obtenerProgresoFrc() {
  try {
    const datos = localStorage.getItem(CLAVE_PROGRESO_FRC);
    return datos ? JSON.parse(datos) : {};
  } catch (error) {
    console.error("No se pudo leer el progreso de FRC guardado:", error);
    return {};
  }
}

function guardarProgresoFrc(progreso) {
  localStorage.setItem(CLAVE_PROGRESO_FRC, JSON.stringify(progreso));
}

export function estaCompletadoFrc(nivelId) {
  const progreso = obtenerProgresoFrc();
  return Boolean(progreso[nivelId]?.completado);
}

export function marcarNivelFrcCompletado(nivelId, puntaje = 100) {
  const progreso = obtenerProgresoFrc();
  progreso[nivelId] = { completado: true, puntaje, fecha: new Date().toISOString() };
  guardarProgresoFrc(progreso);
}

export function desbloquearNivelesFrcHasta(hastaId) {
  const progreso = obtenerProgresoFrc();
  for (let id = 1; id <= hastaId; id++) {
    if (!progreso[id]?.completado) {
      progreso[id] = { completado: true, puntaje: 100, fecha: new Date().toISOString() };
    }
  }
  guardarProgresoFrc(progreso);
}