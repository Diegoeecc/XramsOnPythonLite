const CLAVE_ALMACENAMIENTO = "pythonis_progreso";

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