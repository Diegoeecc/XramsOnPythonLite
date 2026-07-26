let niveles = [];

export async function cargarNiveles() {
  if (niveles.length > 0) return niveles;
  const respuesta = await fetch(`js/niveles/niveles.json?v=${Date.now()}`);
  niveles = await respuesta.json();
  return niveles;
}

export function obtenerNiveles() {
  return niveles;
}

export function obtenerNivelPorIdExacto(id) {
  return niveles.find((n) => n.id === id);
}