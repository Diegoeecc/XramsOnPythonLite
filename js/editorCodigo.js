// Editor de código con resaltado de sintaxis, autocompletado de pares,
// auto-indentación después de ":" y autocorrección de true/false -> True/False

const PALABRAS_CLAVE = new Set([
  "if", "elif", "else", "def", "while", "for", "and", "or", "not", "in", "is",
  "return", "class", "import", "from", "as", "try", "except", "finally",
  "with", "lambda", "pass", "break", "continue", "global", "nonlocal",
  "yield", "raise", "del", "assert", "async", "await", "None",
]);
const BOOLEANOS = new Set(["True", "False"]);

// Grupos: 1) comentario  2) f-string  3) cadena normal  4) número  5) palabra  6) símbolo
const PATRON_TOKENS = /(#.*)|([fF](?:"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?))|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(\b\d+\.?\d*\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)|([()\[\]{}+\-*/%=<>!&|^~:,.])/g;

const PARES = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
const CERRADORES = new Set(Object.values(PARES));
const TECLAS_LIMITE_PALABRA = new Set([" ", ":", ",", ")", "]", "}", "\n", "\t"]);

function escaparHtml(texto) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function siguienteCaracterNoEspacio(codigo, desde) {
  let i = desde;
  while (i < codigo.length && /\s/.test(codigo[i])) i++;
  return codigo[i];
}

// La "f" se pinta aparte (azul). Dentro del texto, lo que está entre { } se deja
// en el color normal (blanco) — es una variable, no texto literal — y el resto
// del contenido se pinta como cadena normal (verde).
function resaltarFString(textoCompleto) {
  const prefijo = textoCompleto[0];
  const resto = textoCompleto.slice(1);
  let html = `<span class="tok-fstring">${prefijo}</span>`;

  let ultimo = 0;
  const patronLlaves = /\{[^{}]*\}/g;
  let coincidencia;
  while ((coincidencia = patronLlaves.exec(resto)) !== null) {
    html += `<span class="tok-cadena">${escaparHtml(resto.slice(ultimo, coincidencia.index))}</span>`;
    html += escaparHtml(coincidencia[0]); // sin span de color -> queda en blanco (color normal)
    ultimo = coincidencia.index + coincidencia[0].length;
  }
  html += `<span class="tok-cadena">${escaparHtml(resto.slice(ultimo))}</span>`;
  return html;
}

function resaltarCodigoPython(codigo) {
  let resultado = "";
  let ultimoIndice = 0;

  for (const coincidencia of codigo.matchAll(PATRON_TOKENS)) {
    const [textoCompleto, comentario, fcadena, cadena, numero, palabra, simbolo] = coincidencia;
    resultado += escaparHtml(codigo.slice(ultimoIndice, coincidencia.index));

    if (comentario !== undefined) {
      resultado += `<span class="tok-comentario">${escaparHtml(comentario)}</span>`;
    } else if (fcadena !== undefined) {
      resultado += resaltarFString(fcadena);
    } else if (cadena !== undefined) {
      resultado += `<span class="tok-cadena">${escaparHtml(cadena)}</span>`;
    } else if (numero !== undefined) {
      resultado += `<span class="tok-numero">${escaparHtml(numero)}</span>`;
    } else if (palabra !== undefined) {
      if (BOOLEANOS.has(palabra)) {
        resultado += `<span class="tok-booleano">${palabra}</span>`;
      } else if (PALABRAS_CLAVE.has(palabra)) {
        resultado += `<span class="tok-clave">${palabra}</span>`;
      } else if (siguienteCaracterNoEspacio(codigo, coincidencia.index + palabra.length) === "(") {
        resultado += `<span class="tok-funcion">${palabra}</span>`;
      } else {
        resultado += palabra;
      }
    } else if (simbolo !== undefined) {
      resultado += `<span class="tok-simbolo">${escaparHtml(simbolo)}</span>`;
    }
    ultimoIndice = coincidencia.index + textoCompleto.length;
  }
  resultado += escaparHtml(codigo.slice(ultimoIndice));
  return resultado + "\n";
}

function manejarTeclaEditor(evento, textarea, alCambiar) {
  const tecla = evento.key;
  let { selectionStart: inicio, selectionEnd: fin, value } = textarea;

  if (TECLAS_LIMITE_PALABRA.has(tecla) && inicio === fin) {
    const antes = value.slice(0, inicio);
    const coincidencia = antes.match(/\b(true|false)$/);
    if (coincidencia) {
      const palabra = coincidencia[0];
      const capitalizada = palabra[0].toUpperCase() + palabra.slice(1);
      const inicioPalabra = inicio - palabra.length;
      value = value.slice(0, inicioPalabra) + capitalizada + value.slice(inicio);
      textarea.value = value;
      inicio = fin = inicioPalabra + capitalizada.length;
      textarea.selectionStart = textarea.selectionEnd = inicio;
    }
  }

  if (tecla === "Enter") {
    evento.preventDefault();
    const inicioLinea = value.lastIndexOf("\n", inicio - 1) + 1;
    const lineaActual = value.slice(inicioLinea, inicio);
    const indentacionActual = (lineaActual.match(/^[ \t]*/) || [""])[0];
    const lineaSinComentario = lineaActual.split("#")[0].trimEnd();
    const terminaEnDosPuntos = lineaSinComentario.endsWith(":");
    const nuevaIndentacion = indentacionActual + (terminaEnDosPuntos ? "    " : "");
    const inserto = "\n" + nuevaIndentacion;
    textarea.value = value.slice(0, inicio) + inserto + value.slice(fin);
    textarea.selectionStart = textarea.selectionEnd = inicio + inserto.length;
    alCambiar();
    return;
  }

  if (inicio !== fin && PARES[tecla] !== undefined) {
    evento.preventDefault();
    const seleccionado = value.slice(inicio, fin);
    textarea.value = value.slice(0, inicio) + tecla + seleccionado + PARES[tecla] + value.slice(fin);
    textarea.selectionStart = inicio + 1;
    textarea.selectionEnd = fin + 1;
    alCambiar();
    return;
  }

  if (inicio === fin && CERRADORES.has(tecla) && value[inicio] === tecla) {
    evento.preventDefault();
    textarea.selectionStart = textarea.selectionEnd = inicio + 1;
    alCambiar();
    return;
  }

  if (inicio === fin && PARES[tecla] !== undefined) {
    evento.preventDefault();
    textarea.value = value.slice(0, inicio) + tecla + PARES[tecla] + value.slice(inicio);
    textarea.selectionStart = textarea.selectionEnd = inicio + 1;
    alCambiar();
    return;
  }

  if (tecla === "Backspace" && inicio === fin && inicio > 0) {
    const anterior = value[inicio - 1];
    const siguiente = value[inicio];
    if (PARES[anterior] === siguiente) {
      evento.preventDefault();
      textarea.value = value.slice(0, inicio - 1) + value.slice(inicio + 1);
      textarea.selectionStart = textarea.selectionEnd = inicio - 1;
      alCambiar();
      return;
    }
  }

  if (inicio !== textarea.selectionStart) alCambiar();
}

export function crearEditorCodigo(idTextarea) {
  const textarea = document.getElementById(idTextarea);
  const codigo = document.getElementById(idTextarea + "-resaltado");

  function refrescar() {
    codigo.innerHTML = resaltarCodigoPython(textarea.value);
  }

  textarea.addEventListener("input", refrescar);
  textarea.addEventListener("keydown", (evento) => manejarTeclaEditor(evento, textarea, refrescar));
  textarea.addEventListener("scroll", () => {
    codigo.parentElement.scrollTop = textarea.scrollTop;
    codigo.parentElement.scrollLeft = textarea.scrollLeft;
  });

  refrescar();

  return {
    obtenerCodigo: () => textarea.value,
    establecerCodigo: (nuevoCodigo) => { textarea.value = nuevoCodigo; refrescar(); },
    textarea,
  };
}