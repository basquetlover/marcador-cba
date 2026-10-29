
/* ============================================
   MARCADOR CBA - DECODIFICADOR MONDO
   Independiente de React y Web Serial.

   Tramas: 02 DIRECCION DATO 03
   Reloj: A3-A0 (mapa alternativo 74-71)
   Periodo: AA
   ============================================ */

const STX = 0x02;
const ETX = 0x03;
const VACIO = 0x5f;
const PERIODO = 0xaa;

type GrupoReloj = "A" | "B";
type IndiceReloj = 0 | 1 | 2 | 3;

const POSICIONES = new Map<
    number,
    { grupo: GrupoReloj; indice: IndiceReloj }
>([
    [0xa3, { grupo: "A", indice: 0 }],
    [0xa2, { grupo: "A", indice: 1 }],
    [0xa1, { grupo: "A", indice: 2 }],
    [0xa0, { grupo: "A", indice: 3 }],

    // Mapa alternativo conservado por compatibilidad.
    // Su función exacta sigue pendiente de verificar.
    [0x74, { grupo: "B", indice: 0 }],
    [0x73, { grupo: "B", indice: 1 }],
    [0x72, { grupo: "B", indice: 2 }],
    [0x71, { grupo: "B", indice: 3 }],
]);

export type TipoPeriodoMondo =
    | "quarter"
    | "overtime"
    | "empty";

export interface PeriodoMondo {
    raw: number;
    type: TipoPeriodoMondo;
    number: number | null;
    source: "mondo";
    recibidoEn: number;
}

export interface RelojMondo {
    value: string;
    lastMinute: boolean;
    finished: boolean;
    source: "mondo";
    format: "MM:SS" | "SS.d";
    minutes: number;
    seconds: number;
    tenths: number | null;
    group: GrupoReloj;
    recibidoEn: number;
}

export interface EstadoMondoInterpretado {
    clock: RelojMondo | null;
    period: PeriodoMondo | null;
}

export interface LecturaTiempoMondo {
    texto: string;
    formato: "MM:SS" | "SS.d";
    ultimoMinuto: boolean;
    terminado: boolean;
    minutos: number;
    segundos: number;
    decimas: number | null;
    grupo: GrupoReloj;
    recibidoEn: number;
}

export interface TramaMondo {
    direccion: number;
    dato: number;
    hexadecimal: string;
}

export interface TiempoEspecialMondo {
    grupo: GrupoReloj;
    direccion: number;
    dato: number;
    motivo: "5F-en-otra-posicion";
    recibidoEn: number;
}

interface OpcionesDecodificadorMondo {
    alTiempo?: (lectura: LecturaTiempoMondo) => void;
    alPeriodo?: (periodo: PeriodoMondo) => void;
    alEstado?: (estado: EstadoMondoInterpretado) => void;
    alTrama?: (trama: TramaMondo) => void;
    alTiempoEspecial?: (
        lectura: TiempoEspecialMondo
    ) => void;
}

interface RelojInterno {
    digitos: Array<number | null>;
    ultimoMinuto: boolean;
    ultimoTexto: string | null;
    ultimoEspecial: string | null;
}

function crearRelojInterno(): RelojInterno {
    return {
        digitos: [null, null, null, null],
        ultimoMinuto: false,
        ultimoTexto: null,
        ultimoEspecial: null,
    };
}

function hexadecimal(valor: number): string {
    return valor
        .toString(16)
        .toUpperCase()
        .padStart(2, "0");
}

/* ============================================
   DECODIFICAR PERIODO - DIRECCION AA
   ============================================ */

export function decodificarPeriodoMondo(
    dato: number,
): Pick<
    PeriodoMondo,
    "raw" | "type" | "number"
> | null {
    if (!Number.isInteger(dato)) return null;

    // AA 51 ... AA 59 => periodos 1 a 9
    if (dato >= 0x51 && dato <= 0x59) {
        return {
            raw: dato,
            type: "quarter",
            number: dato - 0x50,
        };
    }

    // AA 50 => tiempo extra, no periodo 0
    if (dato === 0x50) {
        return {
            raw: dato,
            type: "overtime",
            number: null,
        };
    }

    // AA 5F => periodo en blanco
    if (dato === VACIO) {
        return {
            raw: dato,
            type: "empty",
            number: null,
        };
    }

    // Datos no reconocidos: no sobrescribir estado.
    return null;
}

/* ============================================
   DECODIFICADOR PRINCIPAL
   ============================================ */

export class DecodificadorMondo {
    private trama: number[] = [];

    private relojes: Record<
        GrupoReloj,
        RelojInterno
    > = {
        A: crearRelojInterno(),
        B: crearRelojInterno(),
    };

    private reloj: RelojMondo | null = null;
    private periodo: PeriodoMondo | null = null;

    private readonly opciones:
        OpcionesDecodificadorMondo;

    constructor(
        opciones: OpcionesDecodificadorMondo = {},
    ) {
        this.opciones = opciones;
    }

    reiniciar(): void {
        this.trama = [];

        this.relojes = {
            A: crearRelojInterno(),
            B: crearRelojInterno(),
        };

        this.reloj = null;
        this.periodo = null;
    }

    obtenerEstado(): EstadoMondoInterpretado {
        return {
            clock: this.reloj
                ? { ...this.reloj }
                : null,

            period: this.periodo
                ? { ...this.periodo }
                : null,
        };
    }

    /* ========================================
       RECIBIR BYTES DESDE WEB SERIAL
       ======================================== */

    recibir(bytes: Uint8Array): void {
        for (const byte of bytes) {
            // Inicio de nueva trama
            if (byte === STX) {
                this.trama = [STX];
                continue;
            }

            if (this.trama.length === 0) continue;

            this.trama.push(byte);

            // Acumular entre llamadas a recibir()
            if (this.trama.length < 4) continue;

            const [
                inicio,
                direccion,
                dato,
                fin,
            ] = this.trama;

            this.trama = [];

            if (inicio !== STX || fin !== ETX) {
                continue;
            }

            this.opciones.alTrama?.({
                direccion,
                dato,

                hexadecimal: [
                    inicio,
                    direccion,
                    dato,
                    fin,
                ]
                    .map(hexadecimal)
                    .join(" "),
            });

            // El periodo NO depende del reloj.
            if (direccion === PERIODO) {
                this.procesarPeriodo(dato);
            } else {
                this.procesarReloj(direccion, dato);
            }
        }
    }

    /* ========================================
       ACTUALIZAR PERIODO
       ======================================== */

    private procesarPeriodo(
        dato: number,
    ): void {
        const interpretado =
            decodificarPeriodoMondo(dato);

        if (!interpretado) return;

        // Evitar eventos duplicados sin cambios.
        if (this.periodo?.raw === interpretado.raw) {
            return;
        }

        this.periodo = {
            ...interpretado,
            source: "mondo",
            recibidoEn: Date.now(),
        };

        this.opciones.alPeriodo?.({
            ...this.periodo,
        });

        this.publicarEstado();
    }

    /* ========================================
       ACTUALIZAR RELOJ
       ======================================== */

    private procesarReloj(
        direccion: number,
        dato: number,
    ): void {
        const posicion =
            POSICIONES.get(direccion);

        if (!posicion) return;

        const { grupo, indice } = posicion;

        // Los mapas A y B mantienen sus
        // dígitos independientemente.
        const estado = this.relojes[grupo];

        if (dato === VACIO) {
            estado.digitos[indice] = null;

            if (indice === 3) {
                // A0 5F => último minuto.
                estado.ultimoMinuto = true;
                this.publicarTiempo(grupo);
            } else {
                const firma =
                    `${grupo}:${indice}:5F`;

                if (
                    estado.ultimoEspecial !== firma
                ) {
                    estado.ultimoEspecial = firma;

                    this.opciones.alTiempoEspecial?.({
                        grupo,
                        direccion,
                        dato,
                        motivo:
                            "5F-en-otra-posicion",
                        recibidoEn: Date.now(),
                    });
                }
            }

            return;
        }

        if (
            dato < 0x50 ||
            dato > 0x59
        ) {
            return;
        }

        estado.digitos[indice] =
            dato - 0x50;

        if (indice === 3) {
            estado.ultimoMinuto = false;
        }

        estado.ultimoEspecial = null;

        this.publicarTiempo(grupo);
    }

    /* ========================================
       RECONSTRUIR TIEMPO
       ======================================== */

    private publicarTiempo(
        grupo: GrupoReloj,
    ): void {
        const estado = this.relojes[grupo];

        const { digitos, ultimoMinuto } =
            estado;

        const necesarios = ultimoMinuto
            ? [0, 1, 2]
            : [0, 1, 2, 3];

        if (
            necesarios.some(
                (indice) =>
                    digitos[indice] === null,
            )
        ) {
            return;
        }

        const [
            a3,
            a2,
            a1,
            a0,
        ] = digitos as number[];

        const minutos = ultimoMinuto
            ? 0
            : a3 * 10 + a2;

        const segundos = ultimoMinuto
            ? a3 * 10 + a2
            : a1 * 10 + a0;

        const decimas = ultimoMinuto
            ? a1
            : null;

        if (segundos > 59) return;

        const texto = ultimoMinuto
            ? `${String(segundos).padStart(2, "0")}.${decimas}`
            : `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;

        if (estado.ultimoTexto === texto) {
            return;
        }

        estado.ultimoTexto = texto;

        const formato = ultimoMinuto
            ? "SS.d"
            : "MM:SS";

        const terminado =
            minutos === 0 &&
            segundos === 0 &&
            (decimas === null || decimas === 0);

        const recibidoEn = Date.now();

        this.reloj = {
            value: texto,
            lastMinute: ultimoMinuto,
            finished: terminado,
            source: "mondo",
            format: formato,
            minutes: minutos,
            seconds: segundos,
            tenths: decimas,
            group: grupo,
            recibidoEn,
        };

        this.opciones.alTiempo?.({
            texto,
            formato,
            ultimoMinuto,
            terminado,
            minutos,
            segundos,
            decimas,
            grupo,
            recibidoEn,
        });

        this.publicarEstado();
    }

    private publicarEstado(): void {
        this.opciones.alEstado?.(
            this.obtenerEstado(),
        );
    }
}
