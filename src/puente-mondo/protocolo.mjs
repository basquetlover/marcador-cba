
/* ============================================
   MARCADOR CBA — DECODIFICADOR MONDO

   Trama: 02 DIRECCION DATO 03

   Reloj:   A3, A2, A1, A0
   Periodo: AA

   No abre COM4, no depende de React
   ni transmite directamente por WebSocket.
   ============================================ */

const STX = 0x02;
const ETX = 0x03;
const DATO_VACIO = 0x5f;
const DIRECCION_PERIODO = 0xaa;

// Mantener independientes los dos juegos de
// direcciones hasta verificar el segundo.
const POSICIONES_RELOJ = new Map([
    [0xa3, { grupo: "A", indice: 0 }],
    [0xa2, { grupo: "A", indice: 1 }],
    [0xa1, { grupo: "A", indice: 2 }],
    [0xa0, { grupo: "A", indice: 3 }],

    [0x74, { grupo: "B", indice: 0 }],
    [0x73, { grupo: "B", indice: 1 }],
    [0x72, { grupo: "B", indice: 2 }],
    [0x71, { grupo: "B", indice: 3 }],
]);

function hexadecimal(byte) {
    return byte.toString(16).toUpperCase().padStart(2, "0");
}

function convertirDigito(dato) {
    return dato >= 0x50 && dato <= 0x59
        ? dato - 0x50
        : null;
}

function dosDigitos(numero) {
    return String(numero).padStart(2, "0");
}

/**
 * Decodifica exclusivamente el dato de la dirección AA.
 * Nunca construye texto de presentación ("2Q", "OT", "E"...).
 *
 * @returns {{ raw: number, type: string, number: number|null } | null}
 */
export function decodificarPeriodo(dato) {
    if (!Number.isInteger(dato)) return null;

    if (dato >= 0x51 && dato <= 0x59) {
        return {
            raw: dato,
            type: "quarter",
            number: dato - 0x50,
        };
    }

    if (dato === 0x50) {
        return {
            raw: dato,
            type: "overtime",
            number: null,
        };
    }

    if (dato === DATO_VACIO) {
        return {
            raw: dato,
            type: "empty",
            number: null,
        };
    }

    return null;
}

export class DecodificadorMondo {
    constructor({
        alTiempo,
        alPeriodo,
        alEstado,
        alTrama,
        alTiempoEspecial,
    } = {}) {
        this.alTiempo = alTiempo;
        this.alPeriodo = alPeriodo;
        this.alEstado = alEstado;
        this.alTrama = alTrama;
        this.alTiempoEspecial = alTiempoEspecial;

        this.reiniciar();
    }

    reiniciar() {
        this.trama = [];

        this.grupo = null;
        this.digitos = [null, null, null, null];
        this.ultimoMinuto = false;
        this.ultimoTexto = null;
        this.ultimoEspecial = null;

        this.clock = {
            value: null,
            lastMinute: false,
            finished: false,
            source: "mondo",
            format: null,
            minutes: null,
            seconds: null,
            tenths: null,
            group: null,
            receivedAt: null,
        };

        // No asumir que el período inicial sea 1.
        this.period = null;
    }

    obtenerEstado() {
        // Copias nuevas: los consumidores no pueden
        // alterar el estado interno por referencia.
        return {
            clock: { ...this.clock },
            period: this.period ? { ...this.period } : null,
        };
    }

    publicarEstado() {
        this.alEstado?.(this.obtenerEstado());
    }

    recibir(bytes) {
        // Funciona con Buffer, Uint8Array y Arrays.
        // Una llamada puede contener media trama,
        // varias tramas, o tramas y ruido mezclados.
        for (const byte of bytes) {
            if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
                continue;
            }

            if (byte === STX) {
                this.trama = [STX];
                continue;
            }

            if (this.trama.length === 0) continue;

            this.trama.push(byte);

            if (this.trama.length < 4) continue;

            const [inicio, direccion, dato, fin] = this.trama;
            this.trama = [];

            if (inicio !== STX || fin !== ETX) continue;

            this.alTrama?.({
                direccion,
                dato,
                hexadecimal: [inicio, direccion, dato, fin]
                    .map(hexadecimal)
                    .join(" "),
            });

            this.procesarDato(direccion, dato);
        }
    }

    procesarDato(direccion, dato) {
        // El período es independiente de cualquier
        // cambio de modo o grupo del reloj.
        if (direccion === DIRECCION_PERIODO) {
            this.procesarPeriodo(dato);
            return;
        }

        const posicion = POSICIONES_RELOJ.get(direccion);
        if (!posicion) return;

        if (this.grupo !== posicion.grupo) {
            this.grupo = posicion.grupo;
            this.digitos = [null, null, null, null];
            this.ultimoMinuto = false;
            this.ultimoTexto = null;
            this.ultimoEspecial = null;
        }

        if (dato === DATO_VACIO) {
            this.digitos[posicion.indice] = null;

            if (posicion.indice === 3) {
                // A0=5F activa SS.d.
                this.ultimoMinuto = true;
                this.publicarTiempo();
                return;
            }

            const firma = `${this.grupo}:${posicion.indice}:5F`;
            if (this.ultimoEspecial !== firma) {
                this.ultimoEspecial = firma;
                this.alTiempoEspecial?.({
                    grupo: this.grupo,
                    direccion,
                    dato,
                    motivo: "5F-en-otra-posicion",
                    recibidoEn: Date.now(),
                });
            }
            return;
        }

        const digito = convertirDigito(dato);
        if (digito === null) return;

        this.digitos[posicion.indice] = digito;

        if (posicion.indice === 3) {
            // A0 vuelve a tener un dígito: MM:SS.
            this.ultimoMinuto = false;
        }

        this.ultimoEspecial = null;
        this.publicarTiempo();
    }

    procesarPeriodo(dato) {
        const periodo = decodificarPeriodo(dato);
        if (periodo === null) return;

        // Un AA repetido no necesita emitir un cambio.
        if (this.period?.raw === periodo.raw) return;

        this.period = {
            ...periodo,
            source: "mondo",
            receivedAt: Date.now(),
        };

        this.alPeriodo?.({ ...this.period });
        this.publicarEstado();
    }

    publicarTiempo() {
        const necesarios = this.ultimoMinuto
            ? [0, 1, 2]
            : [0, 1, 2, 3];

        if (necesarios.some((indice) => this.digitos[indice] === null)) {
            return;
        }

        const [d0, d1, d2, d3] = this.digitos;

        let texto;
        let formato;
        let minutos;
        let segundos;
        let decimas;

        if (this.ultimoMinuto) {
            minutos = 0;
            segundos = d0 * 10 + d1;
            decimas = d2;
            formato = "SS.d";

            if (segundos > 59) return;

            texto = `${dosDigitos(segundos)}.${decimas}`;
        } else {
            minutos = d0 * 10 + d1;
            segundos = d2 * 10 + d3;
            decimas = null;
            formato = "MM:SS";

            if (segundos > 59) return;

            texto = `${dosDigitos(minutos)}:${dosDigitos(segundos)}`;
        }

        if (texto === this.ultimoTexto) return;
        this.ultimoTexto = texto;

        const recibidoEn = Date.now();

        const terminado = this.ultimoMinuto
            ? segundos === 0 && decimas === 0
            : minutos === 0 && segundos === 0;

        this.clock = {
            value: texto,
            lastMinute: this.ultimoMinuto,
            finished: terminado,
            source: "mondo",
            format: formato,
            minutes: minutos,
            seconds: segundos,
            tenths: decimas,
            group: this.grupo,
            receivedAt: recibidoEn,
        };

        // Compatible con servidor.mjs actual:
        // sus consumidores esperan texto/formato/ultimoMinuto.
        this.alTiempo?.({
            texto,
            formato,
            ultimoMinuto: this.ultimoMinuto,
            minutos,
            segundos,
            decimas,
            grupo: this.grupo,
            terminado,
            recibidoEn,
        });

        this.publicarEstado();
    }
}
