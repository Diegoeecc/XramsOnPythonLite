"""
Módulo de reemplazo para "turtle" dentro de Pyodide.
Dibuja en un <canvas> del navegador en vez de una ventana de escritorio,
porque Pyodide no incluye tkinter (no hay pantalla de escritorio en el navegador).
"""
import math
import json

if "_tortuga_dibujar" not in globals():
    def _tortuga_dibujar(_comando_json):
        pass


class _EstadoTortuga:
    def __init__(self):
        self.x = 0.0
        self.y = 0.0
        self.rumbo = 0.0
        self.lapiz_abajo = True
        self.color_lapiz = "black"
        self.color_relleno = "black"
        self.grosor = 1
        self.rellenando = False
        self.puntos_relleno = []
        self.visible = True
        self.velocidad = 4
        self.distancia_total = 0.0


_estado = _EstadoTortuga()


def _enviar(comando):
    _tortuga_dibujar(json.dumps(comando))


def _reiniciar_tortuga():
    global _estado
    _estado = _EstadoTortuga()
    _enviar({"tipo": "limpiar"})


def _mover_a(nuevo_x, nuevo_y, WasMoveTo):
    if WasMoveTo == False:
        _estado.distancia_total += math.hypot(nuevo_x - _estado.x, nuevo_y - _estado.y)
    _enviar({
        "tipo": "mover",
        "x1": _estado.x, "y1": _estado.y,
        "x2": nuevo_x, "y2": nuevo_y,
        "dibujar": _estado.lapiz_abajo,
        "color": _estado.color_lapiz,
        "grosor": _estado.grosor,
        "velocidad": _estado.velocidad,
    })
    if _estado.rellenando:
        _estado.puntos_relleno.append((nuevo_x, nuevo_y))
    _estado.x = nuevo_x
    _estado.y = nuevo_y


def forward(distancia):
    rad = math.radians(_estado.rumbo)
    _mover_a(_estado.x + distancia * math.cos(rad), _estado.y + distancia * math.sin(rad), False)

fd = forward


def backward(distancia):
    forward(-distancia)

bk = backward
back = backward


def right(grados):
    _estado.rumbo = (_estado.rumbo - grados) % 360
    _enviar({"tipo": "rotar", "rumbo": _estado.rumbo, "velocidad": _estado.velocidad})

rt = right


def left(grados):
    _estado.rumbo = (_estado.rumbo + grados) % 360
    _enviar({"tipo": "rotar", "rumbo": _estado.rumbo, "velocidad": _estado.velocidad})

lt = left


def penup():
    _estado.lapiz_abajo = False

pu = penup
up = penup


def pendown():
    _estado.lapiz_abajo = True

pd = pendown
down = pendown


def pencolor(color=None):
    if color is None:
        return _estado.color_lapiz
    _estado.color_lapiz = color


def fillcolor(color=None):
    if color is None:
        return _estado.color_relleno
    _estado.color_relleno = color


def color(c1=None, c2=None):
    if c1 is None:
        return _estado.color_lapiz, _estado.color_relleno
    _estado.color_lapiz = c1
    _estado.color_relleno = c2 if c2 is not None else c1


def pensize(grosor=None):
    if grosor is None:
        return _estado.grosor
    _estado.grosor = grosor

width = pensize


def begin_fill():
    _estado.rellenando = True
    _estado.puntos_relleno = [(_estado.x, _estado.y)]


def end_fill():
    if _estado.rellenando and len(_estado.puntos_relleno) > 2:
        _enviar({"tipo": "relleno", "puntos": _estado.puntos_relleno, "color": _estado.color_relleno})
    _estado.rellenando = False
    _estado.puntos_relleno = []


def circle(radio, extent=360, pasos=None):
    if pasos is None:
        pasos = max(int(abs(extent) / 10), 8)
    paso_angulo = extent / pasos
    longitud_cuerda = 2 * radio * math.sin(math.radians(paso_angulo) / 2)
    for _ in range(pasos):
        forward(longitud_cuerda)
        right(paso_angulo) if radio < 0 else left(paso_angulo)


def goto(x, y=None):
    if y is None:
        x, y = x
    _mover_a(x, y, True)

setpos = goto
setposition = goto


def setx(x):
    _mover_a(x, _estado.y, True)


def sety(y):
    _mover_a(_estado.x, y, True)


def setheading(grados):
    _estado.rumbo = grados % 360
    _enviar({"tipo": "rotar", "rumbo": _estado.rumbo, "velocidad": _estado.velocidad})

seth = setheading


def home():
    goto(0, 0)
    setheading(0)


def position():
    return (_estado.x, _estado.y)

pos = position


def heading():
    return _estado.rumbo


def hideturtle():
    _estado.visible = False

ht = hideturtle


def showturtle():
    _estado.visible = True

st = showturtle


def speed(velocidad=None):
    if velocidad is None:
        return _estado.velocidad
    _estado.velocidad = velocidad


def write(texto, move=False, align="left", font=("Arial", 12, "normal")):
    _enviar({"tipo": "texto", "x": _estado.x, "y": _estado.y, "texto": str(texto),
             "color": _estado.color_lapiz, "alineacion": align})


def clear():
    _enviar({"tipo": "limpiar"})


def reset():
    _reiniciar_tortuga()


def bgcolor(color):
    _enviar({"tipo": "fondo", "color": color})


def done():
    pass


class Screen:
    def bgcolor(self, color): bgcolor(color)
    def clear(self): clear()
    def title(self, _texto): pass
    def mainloop(self): pass


class Turtle:
    forward = staticmethod(forward)
    fd = staticmethod(forward)
    backward = staticmethod(backward)
    right = staticmethod(right)
    left = staticmethod(left)
    penup = staticmethod(penup)
    pendown = staticmethod(pendown)
    pencolor = staticmethod(pencolor)
    fillcolor = staticmethod(fillcolor)
    color = staticmethod(color)
    pensize = staticmethod(pensize)
    begin_fill = staticmethod(begin_fill)
    end_fill = staticmethod(end_fill)
    circle = staticmethod(circle)
    goto = staticmethod(goto)
    setpos = staticmethod(goto)
    setx = staticmethod(setx)
    sety = staticmethod(sety)
    setheading = staticmethod(setheading)
    home = staticmethod(home)
    position = staticmethod(position)
    heading = staticmethod(heading)
    hideturtle = staticmethod(hideturtle)
    showturtle = staticmethod(showturtle)
    speed = staticmethod(speed)
    write = staticmethod(write)