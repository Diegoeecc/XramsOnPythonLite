"""
Módulo de reemplazo para "XOPcommands": los componentes de FRC del simulador.
No existe una clase MotorEMC aquí a propósito: no tiene id, así que no se puede
controlar directo desde código — solo a través del MotorController al que se enlace.
"""

def _sin_bridge(*_args, **_kwargs):
    return None

_establecer_potencia = globals().get("_xop_establecer_potencia_js", _sin_bridge)
_obtener_velocidad = globals().get("_xop_obtener_velocidad_js", _sin_bridge)
_obtener_angulo = globals().get("_xop_obtener_angulo_js", _sin_bridge)
_obtener_posicion = globals().get("_xop_obtener_posicion_js", _sin_bridge)
_encender_led = globals().get("_xop_encender_led_js", _sin_bridge)
_apagar_led = globals().get("_xop_apagar_led_js", _sin_bridge)
_color_led = globals().get("_xop_color_led_js", _sin_bridge)
_registrar_componente = globals().get("_xop_registrar_componente_js", _sin_bridge)


def _validar_potencia(valor):
    if not isinstance(valor, (int, float)) or isinstance(valor, bool):
        raise ValueError("La potencia debe ser un número.")
    if valor < -1 or valor > 1:
        raise ValueError("La potencia debe estar entre -1 y 1.")


def _validar_color(valor, nombre):
    if not isinstance(valor, int) or isinstance(valor, bool) or valor < 0 or valor > 255:
        raise ValueError(f"El valor de {nombre} debe ser un entero entre 0 y 255.")


class MotorMCI:
    def __init__(self, id):
        self.id = id
        _registrar_componente(id, "MotorMCI")

    def set(self, potencia):
        _validar_potencia(potencia)
        _establecer_potencia(self.id, float(potencia))


class MotorController:
    def __init__(self, id):
        self.id = id
        _registrar_componente(id, "MotorController")

    def set(self, potencia):
        _validar_potencia(potencia)
        _establecer_potencia(self.id, float(potencia))


class Encoder:
    def __init__(self, id):
        self.id = id
        _registrar_componente(id, "Encoder")

    def getPosition(self):
        return _obtener_posicion(self.id)

    def getAngle(self):
        return _obtener_angulo(self.id)

    def getVelocity(self):
        return _obtener_velocidad(self.id)


class LED:
    def __init__(self, id):
        self.id = id
        _registrar_componente(id, "LED")

    def setOn(self):
        _encender_led(self.id)

    def setOff(self):
        _apagar_led(self.id)

    def setColor(self, r, g, b):
        _validar_color(r, "r")
        _validar_color(g, "g")
        _validar_color(b, "b")
        _color_led(self.id, r, g, b)