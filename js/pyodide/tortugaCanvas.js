let contexto = null;
let canvasElemento = null;
let capaPermanente = null;
let contextoPermanente = null;

let cola = [];
let procesando = false;
let generacion = 0;

let anguloActual = 0;
let posActualCanvas = { x: 0, y: 0 };

const COLOR_TORTUGA = "#2e7d32";
const COLOR_CAPARAZON = "#1b5e20";

export function inicializarLienzoTortuga(elementoCanvas) {
  canvasElemento = elementoCanvas;
  contexto = elementoCanvas.getContext("2d");

  capaPermanente = document.createElement("canvas");
  capaPermanente.width = elementoCanvas.width;
  capaPermanente.height = elementoCanvas.height;
  contextoPermanente = capaPermanente.getContext("2d");

  reiniciarVisual();
}

function centro() {
  return { cx: canvasElemento.width / 2, cy: canvasElemento.height / 2 };
}

function aCanvas(x, y) {
  const { cx, cy } = centro();
  return { x: cx + x, y: cy - y };
}

function reiniciarVisual() {
  const { cx, cy } = centro();
  contextoPermanente.clearRect(0, 0, capaPermanente.width, capaPermanente.height);
  anguloActual = 0;
  posActualCanvas = { x: cx, y: cy };
  redibujar();
}

function redibujar() {
  contexto.clearRect(0, 0, canvasElemento.width, canvasElemento.height);
  contexto.drawImage(capaPermanente, 0, 0);
  dibujarFormaTortuga(contexto, posActualCanvas.x, posActualCanvas.y, anguloActual);
}

function dibujarFormaTortuga(ctx, x, y, rumboGrados) {
  const rumboRad = (rumboGrados * Math.PI) / 180;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-rumboRad);
  ctx.fillStyle = COLOR_TORTUGA;

  const patas = [{ dx: 6, dy: 8 }, { dx: 6, dy: -8 }, { dx: -7, dy: 8 }, { dx: -7, dy: -8 }];
  patas.forEach(({ dx, dy }) => {
    ctx.beginPath();
    ctx.ellipse(dx, dy, 3.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  

  ctx.beginPath();
  ctx.ellipse(13, 0, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = COLOR_CAPARAZON;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 4.8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(0, 8);
  ctx.moveTo(-8, 0); ctx.lineTo(11, 0);
  ctx.stroke();

  ctx.restore();
}

function calcularDuracionLinea(distancia, velocidad) {
  if (!velocidad || velocidad <= 0) return 0;
  const pixelesPorMs = velocidad * 0.15;
  return Math.min(Math.max(distancia / pixelesPorMs, 16), 1500);
}

function calcularDuracionRotacion(diferenciaGrados, velocidad) {
  if (!velocidad || velocidad <= 0) return 0;
  const gradosPorMs = velocidad * 0.3;
  return Math.min(Math.max(diferenciaGrados / gradosPorMs, 16), 600);
}

function animar(duracionMs, alPaso) {
  return new Promise((resolve) => {
    if (duracionMs <= 0) { alPaso(1); resolve(); return; }
    const inicio = performance.now();
    const miGeneracion = generacion;
    function cuadro(ahora) {
      if (miGeneracion !== generacion) { resolve(); return; }
      const t = Math.min((ahora - inicio) / duracionMs, 1);
      alPaso(t);
      if (t < 1) requestAnimationFrame(cuadro);
      else resolve();
    }
    requestAnimationFrame(cuadro);
  });
}

async function procesarComando(comando) {
  const miGeneracion = generacion;

  switch (comando.tipo) {
    case "limpiar":
      generacion++;
      reiniciarVisual();
      break;

    case "fondo":
      contextoPermanente.fillStyle = comando.color;
      contextoPermanente.fillRect(0, 0, capaPermanente.width, capaPermanente.height);
      redibujar();
      break;

    case "mover": {
      const p1 = aCanvas(comando.x1, comando.y1);
      const p2 = aCanvas(comando.x2, comando.y2);
      const distancia = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const duracion = calcularDuracionLinea(distancia, comando.velocidad);

      await animar(duracion, (t) => {
        if (miGeneracion !== generacion) return;
        const actual = { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
        posActualCanvas = actual;
        contexto.clearRect(0, 0, canvasElemento.width, canvasElemento.height);
        contexto.drawImage(capaPermanente, 0, 0);
        if (comando.dibujar) {
          contexto.strokeStyle = comando.color;
          contexto.lineWidth = comando.grosor;
          contexto.lineCap = "round";
          contexto.beginPath();
          contexto.moveTo(p1.x, p1.y);
          contexto.lineTo(actual.x, actual.y);
          contexto.stroke();
        }
        dibujarFormaTortuga(contexto, actual.x, actual.y, anguloActual);
      });

      if (miGeneracion === generacion) {
        if (comando.dibujar) {
          contextoPermanente.strokeStyle = comando.color;
          contextoPermanente.lineWidth = comando.grosor;
          contextoPermanente.lineCap = "round";
          contextoPermanente.beginPath();
          contextoPermanente.moveTo(p1.x, p1.y);
          contextoPermanente.lineTo(p2.x, p2.y);
          contextoPermanente.stroke();
        }
        posActualCanvas = p2;
        redibujar();
      }
      break;
    }

    case "rotar": {
      const delta = ((comando.rumbo - anguloActual + 540) % 360) - 180;
      const duracion = calcularDuracionRotacion(Math.abs(delta), comando.velocidad);
      const desde = anguloActual;

      await animar(duracion, (t) => {
        if (miGeneracion !== generacion) return;
        anguloActual = desde + delta * t;
        redibujar();
      });

      if (miGeneracion === generacion) {
        anguloActual = comando.rumbo;
        redibujar();
      }
      break;
    }

    case "relleno":
      contextoPermanente.fillStyle = comando.color;
      contextoPermanente.beginPath();
      comando.puntos.forEach(([x, y], indice) => {
        const p = aCanvas(x, y);
        indice === 0 ? contextoPermanente.moveTo(p.x, p.y) : contextoPermanente.lineTo(p.x, p.y);
      });
      contextoPermanente.closePath();
      contextoPermanente.fill();
      redibujar();
      break;

    case "texto": {
      const p = aCanvas(comando.x, comando.y);
      contextoPermanente.fillStyle = comando.color;
      contextoPermanente.font = "14px 'IBM Plex Sans', sans-serif";
      contextoPermanente.textAlign = comando.alineacion === "center" ? "center" : "left";
      contextoPermanente.fillText(comando.texto, p.x, p.y);
      redibujar();
      break;
    }
  }
}

async function procesarCola() {
  if (procesando) return;
  procesando = true;
  while (cola.length > 0) {
    await procesarComando(cola.shift());
  }
  procesando = false;
}

export function procesarComandoTortuga(comandoJson) {
  cola.push(JSON.parse(comandoJson));
  procesarCola();
}