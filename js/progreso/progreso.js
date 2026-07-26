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
  const progreso = obtenerProgreso();
  for (let id = 1; id < totalNiveles; id++) {
    if (!progreso[id]?.completado) {
      progreso[id] = { completado: true, puntaje: 100, fecha: new Date().toISOString() };
    }
  }
  guardarProgreso(progreso);
}