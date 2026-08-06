let niveles = [];

export async function cargarNivelesFrc() {
  if (niveles.length > 0) return niveles;
  const respuesta = await fetch(`js/niveles/niveles-frc.json?v=${Date.now()}`);
  niveles = await respuesta.json();
  return niveles;
}

export function obtenerNivelesFrc() {
  return niveles;
}

export function obtenerNivelFrcPorIdExacto(id) {
  return niveles.find((n) => n.id === id);
}