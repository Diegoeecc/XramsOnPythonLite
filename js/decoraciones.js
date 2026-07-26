const NS = "http://www.w3.org/2000/svg";

// Crea un arco de puntos INCOMPLETO (deja un tramo sin puntos) — el efecto puntillismo que pediste
function crearArcoDePuntos({ cx, cy, radio, numPuntos, anguloInicio, anguloFin, tamano, opacidad }) {
  const grupo = document.createElementNS(NS, "g");
  grupo.classList.add("grupo-decoracion");
  grupo.style.opacity = opacidad ?? 0.3;

  const rango = anguloFin - anguloInicio;
  for (let i = 0; i < numPuntos; i++) {
    const angulo = anguloInicio + (rango * i) / Math.max(numPuntos - 1, 1);
    const rad = (angulo * Math.PI) / 180;
    const x = cx + radio * Math.cos(rad);
    const y = cy + radio * Math.sin(rad);

    const punto = document.createElementNS(NS, "circle");
    punto.setAttribute("cx", x.toFixed(2));
    punto.setAttribute("cy", y.toFixed(2));
    punto.setAttribute("r", tamano ?? 2);
    grupo.appendChild(punto);
  }
  return grupo;
}

export function inicializarDecoraciones() {
  const lienzo = document.getElementById("lienzo-decoraciones");

  function dibujar() {
    lienzo.innerHTML = "";
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    lienzo.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);

    lienzo.appendChild(crearArcoDePuntos({
      cx: ancho * 0.88, cy: alto * 0.15, radio: 150,
      numPuntos: 26, anguloInicio: 20, anguloFin: 300, tamano: 3.2, opacidad: 0.55
    }));

    lienzo.appendChild(crearArcoDePuntos({
      cx: ancho * 0.1, cy: alto * 0.85, radio: 110,
      numPuntos: 20, anguloInicio: 200, anguloFin: 430, tamano: 2.8, opacidad: 0.45
    }));

    lienzo.appendChild(crearArcoDePuntos({
      cx: ancho * 0.5, cy: alto * 0.5, radio: Math.min(ancho, alto) * 0.42,
      numPuntos: 34, anguloInicio: 0, anguloFin: 250, tamano: 2.2, opacidad: 0.2
    }));
  }

  dibujar();
  window.addEventListener("resize", dibujar);
}