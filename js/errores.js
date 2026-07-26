// Traduce tracebacks de Python (crípticos) a mensajes simples en español.

const PATRONES_ERROR = [
  {
    tipo: "NameError",
    regex: /name '(.+?)' is not defined/,
    mensaje: (m, linea) =>
      `Error en la línea ${linea}: "${m[1]}" no está definido. ¿Escribiste bien el nombre? ¿Ya creaste esa variable o función antes de usarla?`,
  },
  {
    tipo: "ZeroDivisionError",
    regex: /division by zero/,
    mensaje: (_m, linea) => `Error en la línea ${linea}: estás dividiendo entre cero, y eso no es posible.`,
  },
  {
    tipo: "IndexError",
    regex: /.*/,
    mensaje: (_m, linea) => `Error en la línea ${linea}: intentaste acceder a una posición de una lista que no existe (revisa el número entre corchetes).`,
  },
  {
    tipo: "KeyError",
    regex: /'(.+?)'/,
    mensaje: (m, linea) => `Error en la línea ${linea}: la clave "${m[1]}" no existe en ese diccionario.`,
  },
  {
    tipo: "TypeError",
    regex: /(.+)/,
    mensaje: (m, linea) => `Error en la línea ${linea}: estás combinando tipos de datos que no son compatibles (por ejemplo, texto con número). Detalle: ${m[1]}`,
  },
  {
    tipo: "AttributeError",
    regex: /(.+)/,
    mensaje: (m, linea) => `Error en la línea ${linea}: usaste un método que no existe para ese tipo de dato. Detalle: ${m[1]}`,
  },
  {
    tipo: "ValueError",
    regex: /(.+)/,
    mensaje: (m, linea) => `Error en la línea ${linea}: le diste un valor no válido a una función. Detalle: ${m[1]}`,
  },
  {
    tipo: "IndentationError",
    regex: /(.+)/,
    mensaje: (_m, linea) => `Error en la línea ${linea}: hay un problema con la indentación (los espacios al inicio de la línea).`,
  },
  {
    tipo: "SyntaxError",
    regex: /(.+)/,
    mensaje: (_m, linea) => `Error en la línea ${linea}: hay un error de escritura en el código, revisa que no falte algún ":", "(", ")" o comilla.`,
  },
];

export function traducirError(textoError) {
  const lineas = textoError.trim().split("\n");
  const ultimaLinea = lineas[lineas.length - 1];

  let numeroLinea = "?";
  const coincidenciasLinea = [...textoError.matchAll(/line (\d+)/g)];
  if (coincidenciasLinea.length > 0) {
    numeroLinea = coincidenciasLinea[coincidenciasLinea.length - 1][1];
  }

  for (const patron of PATRONES_ERROR) {
    if (ultimaLinea.startsWith(patron.tipo)) {
      const coincidencia = ultimaLinea.match(patron.regex);
      if (coincidencia) return patron.mensaje(coincidencia, numeroLinea);
    }
  }

  return `Error en la línea ${numeroLinea}: ${ultimaLinea}`;
}