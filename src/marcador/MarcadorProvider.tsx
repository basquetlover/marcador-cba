
import {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import type {
    Dispatch,
    ReactNode,
    SetStateAction,
} from "react";

import type {
    DatosMarcador,
    EquipoMarcador,
    FuenteTiempo,
    LadoEquipo,
} from "./tipos";

import {
    DATOS_INICIALES,
    ID_RELOJ_PRINCIPAL,
} from "./datosIniciales";

/* ============================================
   MARCADOR CBA - WEB SERIAL
   Lectura directa de MONDO desde Chrome/Edge
   Sin Node.js, servidor local ni WebSocket
   ============================================ */

export type ModoReloj =
    | "manual"
    | "mondo"
    | "simulacion";

export type EstadoWebSocket =
    | "inactivo"
    | "conectando"
    | "conectado"
    | "desconectado"
    | "error";

export type EstadoPuertoMondo =
    | "desconocido"
    | "conectando"
    | "conectado"
    | "desconectado";

export interface EstadoConexionMondo {
    // Se conserva este nombre para que el panel
    // Control.tsx actual siga siendo compatible.
    // Ya NO se utiliza ningún WebSocket.
    websocket: EstadoWebSocket;
    puerto: EstadoPuertoMondo;
    detalle: string;
    ultimaLecturaEn: number | null;
}

interface ContextoMarcador {
    datos: DatosMarcador;

    establecerDatos:
        Dispatch<SetStateAction<DatosMarcador>>;

    actualizarEquipo: (
        lado: LadoEquipo,
        cambios: Partial<EquipoMarcador>,
        partidoId?: string,
    ) => void;

    actualizarPeriodo: (
        periodo: number,
        partidoId?: string,
    ) => void;

    actualizarCategoria: (
        categoriaId: string | null,
        partidoId?: string,
    ) => void;

    actualizarReloj: (
        texto: string,
        relojId?: string,
        fuente?: FuenteTiempo,
    ) => void;

    modoReloj: ModoReloj;
    cambiarModoReloj: (modo: ModoReloj) => void;
    reiniciarSimulacion: () => void;

    estadoMondo: EstadoConexionMondo;
    reconectarMondo: () => void;
    activarRelojMondo: (relojId?: string) => void;
}

export const MarcadorContext =
    createContext<ContextoMarcador | null>(null);

interface MarcadorProviderProps {
    children: ReactNode;
}

// TIPOS WEB SERIAL

interface PuertoSerieWeb {
    readonly readable: ReadableStream<Uint8Array> | null;

    open(options: {
        baudRate: number;
        dataBits: number;
        stopBits: number;
        parity: "none";
        flowControl: "none";
    }): Promise<void>;

    close(): Promise<void>;
}

interface NavegadorSerial {
    requestPort(): Promise<PuertoSerieWeb>;
    getPorts(): Promise<PuertoSerieWeb[]>;
}

function obtenerSerial(): NavegadorSerial | null {
    return (
        navigator as Navigator & {
            serial?: NavegadorSerial;
        }
    ).serial ?? null;
}

const CLAVE_MODO = "cba.marcador.modo-reloj.v1";
const INICIO_SIMULACION = 8 * 60_000 + 34_000;

// MODO GUARDADO

function leerModoGuardado(): ModoReloj {
    try {
        const valor = localStorage.getItem(CLAVE_MODO);

        if (
            valor === "manual" ||
            valor === "mondo" ||
            valor === "simulacion"
        ) {
            return valor;
        }
    } catch {
        // Funciona también sin almacenamiento.
    }

    return "manual";
}

// RELOJ SIMULADO

function tiempoSimulado(ms: number): string {
    const restante = Math.max(0, ms);

    if (restante >= 60_000) {
        const total = Math.ceil(restante / 1000);

        return (
            String(Math.floor(total / 60)).padStart(2, "0") +
            ":" +
            String(total % 60).padStart(2, "0")
        );
    }

    const decimas = Math.ceil(restante / 100);

    return (
        String(Math.floor(decimas / 10)).padStart(2, "0") +
        "." +
        String(decimas % 10)
    );
}

// ============================================
// TRADUCTOR DEL RELOJ MONDO
//
// Normal:        A3 A2 : A1 A0
// Último minuto: A3 A2 . A1
//
// A0 = 5F activa último minuto.
// ============================================

class DecodificadorTiempoMondo {
    private trama: number[] = [];

    private digitos: Array<number | null> = [
        null, null, null, null,
    ];

    private ultimoMinuto = false;
    private ultimoTexto = "";

    recibir(
        bytes: Uint8Array,
        emitir: (texto: string) => void,
    ) {
        for (const byte of bytes) {
            if (byte === 0x02) {
                this.trama = [byte];
                continue;
            }

            if (!this.trama.length) continue;

            this.trama.push(byte);

            if (this.trama.length < 4) continue;

            const [inicio, direccion, dato, fin] =
                this.trama;

            this.trama = [];

            if (inicio !== 0x02 || fin !== 0x03) {
                continue;
            }

            if (direccion < 0xa0 || direccion > 0xa3) {
                continue;
            }

            const indice = 0xa3 - direccion;

            if (direccion === 0xa0 && dato === 0x5f) {
                this.digitos[3] = null;
                this.ultimoMinuto = true;
            } else if (dato >= 0x50 && dato <= 0x59) {
                this.digitos[indice] = dato - 0x50;

                if (direccion === 0xa0) {
                    this.ultimoMinuto = false;
                }
            } else {
                this.digitos[indice] = null;
                continue;
            }

            const necesarios =
                this.ultimoMinuto ? 3 : 4;

            if (
                this.digitos
                    .slice(0, necesarios)
                    .some((digito) => digito === null)
            ) {
                continue;
            }

            const [a3, a2, a1, a0] =
                this.digitos as number[];

            const texto = this.ultimoMinuto
                ? `${a3}${a2}.${a1}`
                : `${a3}${a2}:${a1}${a0}`;

            const segundos = this.ultimoMinuto
                ? a3 * 10 + a2
                : a1 * 10 + a0;

            if (segundos > 59) continue;
            if (texto === this.ultimoTexto) continue;

            this.ultimoTexto = texto;
            emitir(texto);
        }
    }
}

function mensajeError(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "Error desconocido del puerto serie";
}

// ============================================
// PROVIDER
// ============================================

export default function MarcadorProvider({
    children,
}: MarcadorProviderProps) {
    const [modoReloj, setModoReloj] =
        useState<ModoReloj>(leerModoGuardado);

    const modoRef = useRef(modoReloj);

    const [datos, establecerDatos] = useState<DatosMarcador>(
        () => ({
            ...DATOS_INICIALES,

            relojes: {
                ...DATOS_INICIALES.relojes,

                [ID_RELOJ_PRINCIPAL]: {
                    ...DATOS_INICIALES.relojes[
                        ID_RELOJ_PRINCIPAL
                    ],

                    fuente:
                        modoReloj === "mondo"
                            ? "mondo"
                            : "manual",

                    texto:
                        modoReloj === "mondo"
                            ? "--:--"
                            : modoReloj === "simulacion"
                                ? "08:34"
                                : "10:00",
                },
            },
        }),
    );

    const [estadoMondo, setEstadoMondo] =
        useState<EstadoConexionMondo>({
            websocket: "inactivo",
            puerto: "desconocido",
            detalle: "Web Serial desactivado.",
            ultimaLecturaEn: null,
        });

    const [reinicioSimulacion, setReinicioSimulacion] =
        useState(0);

    // REFERENCIAS DEL PUERTO

    const puertoRef = useRef<PuertoSerieWeb | null>(null);

    const lectorRef = useRef<
        ReadableStreamDefaultReader<Uint8Array> | null
    >(null);

    const tareaLecturaRef = useRef<Promise<void> | null>(
        null,
    );

    const sesionRef = useRef(0);
    const conectandoRef = useRef(false);
    const solicitandoRef = useRef(false);

    // GUARDAR MODO LOCALMENTE

    useEffect(() => {
        try {
            localStorage.setItem(CLAVE_MODO, modoReloj);
        } catch {
            // No impedir su funcionamiento.
        }
    }, [modoReloj]);

    // EQUIPOS

    const actualizarEquipo = useCallback((
        lado: LadoEquipo,
        cambios: Partial<EquipoMarcador>,
        partidoId?: string,
    ) => {
        establecerDatos((actual) => {
            const id =
                partidoId ?? actual.partidoPrincipalId;

            const partido = actual.partidos[id];

            if (!partido) return actual;

            return {
                ...actual,

                partidos: {
                    ...actual.partidos,

                    [id]: {
                        ...partido,

                        [lado]: {
                            ...partido[lado],
                            ...cambios,
                        },
                    },
                },
            };
        });
    }, []);

    // PERIODO

    const actualizarPeriodo = useCallback((
        periodo: number,
        partidoId?: string,
    ) => {
        if (!Number.isFinite(periodo)) return;

        const periodoNuevo = Math.max(
            1,
            Math.trunc(periodo),
        );

        establecerDatos((actual) => {
            const id =
                partidoId ?? actual.partidoPrincipalId;

            const partido = actual.partidos[id];

            if (
                !partido ||
                partido.periodo === periodoNuevo
            ) {
                return actual;
            }

            return {
                ...actual,

                partidos: {
                    ...actual.partidos,

                    [id]: {
                        ...partido,
                        periodo: periodoNuevo,
                    },
                },
            };
        });
    }, []);

    // CATEGORÍA

    const actualizarCategoria = useCallback((
        categoriaId: string | null,
        partidoId?: string,
    ) => {
        establecerDatos((actual) => {
            const id =
                partidoId ?? actual.partidoPrincipalId;

            const partido = actual.partidos[id];

            if (
                !partido ||
                partido.categoriaId === categoriaId
            ) {
                return actual;
            }

            return {
                ...actual,

                partidos: {
                    ...actual.partidos,

                    [id]: {
                        ...partido,
                        categoriaId,
                    },
                },
            };
        });
    }, []);

    // ACTUALIZAR RELOJ MANUAL

    const actualizarReloj = useCallback((
        texto: string,
        relojId: string = ID_RELOJ_PRINCIPAL,
        fuente?: FuenteTiempo,
    ) => {
        if (fuente === "manual") {
            modoRef.current = "manual";
            setModoReloj("manual");
        }

        establecerDatos((actual) => {
            const reloj = actual.relojes[relojId];

            if (!reloj) return actual;

            const fuenteNueva = fuente ?? reloj.fuente;

            if (
                reloj.texto === texto &&
                reloj.fuente === fuenteNueva
            ) {
                return actual;
            }

            return {
                ...actual,

                relojes: {
                    ...actual.relojes,

                    [relojId]: {
                        ...reloj,
                        texto,
                        fuente: fuenteNueva,
                        actualizadoEn: Date.now(),
                    },
                },
            };
        });
    }, []);

    // ========================================
    // LIBERAR EL PUERTO SERIE
    // ========================================

    const detenerPuerto = useCallback(async () => {
        const sesion = ++sesionRef.current;

        const lector = lectorRef.current;

        if (lector) {
            try {
                await lector.cancel();
            } catch {
                // Puerto desconectado.
            }
        }

        const tarea = tareaLecturaRef.current;

        if (tarea) {
            try {
                await tarea;
            } catch {
                // Error gestionado.
            }
        }

        const puerto = puertoRef.current;

        if (puerto) {
            try {
                await puerto.close();
            } catch {
                // Ya cerrado o abriéndose.
            }

            if (puertoRef.current === puerto) {
                puertoRef.current = null;
            }
        }

        if (sesion === sesionRef.current) {
            conectandoRef.current = false;
        }
    }, []);

    // ========================================
    // ABRIR Y LEER COM
    // ========================================

    const abrirPuerto = useCallback(async (
        puerto: PuertoSerieWeb,
    ) => {
        if (
            modoRef.current !== "mondo" ||
            conectandoRef.current
        ) {
            return;
        }

        const sesion = ++sesionRef.current;

        conectandoRef.current = true;
        puertoRef.current = puerto;

        setEstadoMondo((anterior) => ({
            ...anterior,
            websocket: "conectando",
            puerto: "conectando",
            detalle: "Abriendo puerto serie a 19200 baudios...",
        }));

        try {
            await puerto.open({
                baudRate: 19200,
                dataBits: 8,
                stopBits: 1,
                parity: "none",
                flowControl: "none",
            });

            if (
                sesion !== sesionRef.current ||
                modoRef.current !== "mondo"
            ) {
                try {
                    await puerto.close();
                } catch {
                    // Ignorar cierre duplicado.
                }

                return;
            }

            setEstadoMondo((anterior) => ({
                ...anterior,
                websocket: "conectado",
                puerto: "conectado",
                detalle:
                    "Puerto abierto. Esperando datos de MONDO...",
            }));

            const decodificador =
                new DecodificadorTiempoMondo();

            // LECTURA CONTINUA

            const tarea = async () => {
                try {
                    while (
                        puerto.readable &&
                        sesion === sesionRef.current
                    ) {
                        const lector =
                            puerto.readable.getReader();

                        lectorRef.current = lector;

                        try {
                            while (
                                sesion === sesionRef.current
                            ) {
                                const { value, done } =
                                    await lector.read();

                                if (done) break;

                                if (
                                    !value ||
                                    sesion !== sesionRef.current
                                ) {
                                    continue;
                                }

                                // INTERPRETAR BYTES MONDO

                                decodificador.recibir(
                                    value,
                                    (texto) => {
                                        if (
                                            sesion !==
                                                sesionRef.current ||
                                            modoRef.current !== "mondo"
                                        ) {
                                            return;
                                        }

                                        setEstadoMondo((anterior) => ({
                                            ...anterior,
                                            ultimaLecturaEn: Date.now(),
                                            detalle:
                                                "Recibiendo tiempo de MONDO.",
                                        }));

                                        establecerDatos((actual) => {
                                            const reloj =
                                                actual.relojes[
                                                    ID_RELOJ_PRINCIPAL
                                                ];

                                            if (
                                                !reloj ||
                                                reloj.fuente !== "mondo" ||
                                                reloj.texto === texto
                                            ) {
                                                return actual;
                                            }

                                            return {
                                                ...actual,

                                                relojes: {
                                                    ...actual.relojes,

                                                    [ID_RELOJ_PRINCIPAL]: {
                                                        ...reloj,
                                                        texto,
                                                        actualizadoEn:
                                                            Date.now(),
                                                    },
                                                },
                                            };
                                        });
                                    },
                                );
                            }
                        } finally {
                            if (
                                lectorRef.current === lector
                            ) {
                                lectorRef.current = null;
                            }

                            lector.releaseLock();
                        }
                    }
                } catch (error) {
                    if (sesion === sesionRef.current) {
                        setEstadoMondo((anterior) => ({
                            ...anterior,
                            websocket: "error",
                            puerto: "desconectado",
                            detalle:
                                "Error de lectura: " +
                                mensajeError(error),
                        }));
                    }
                } finally {
                    try {
                        await puerto.close();
                    } catch {
                        // Puerto ya cerrado.
                    }

                    if (puertoRef.current === puerto) {
                        puertoRef.current = null;
                    }

                    if (sesion === sesionRef.current) {
                        conectandoRef.current = false;

                        setEstadoMondo((anterior) => ({
                            ...anterior,
                            websocket: "desconectado",
                            puerto: "desconectado",
                            detalle:
                                "Puerto desconectado. Pulsa MONDO para reconectar.",
                        }));
                    }
                }
            };

            tareaLecturaRef.current = tarea();
        } catch (error) {
            if (sesion === sesionRef.current) {
                conectandoRef.current = false;
                puertoRef.current = null;

                setEstadoMondo((anterior) => ({
                    ...anterior,
                    websocket: "error",
                    puerto: "desconectado",
                    detalle:
                        "No se puede abrir el puerto: " +
                        mensajeError(error) +
                        ". Comprueba que MondoVideo esté cerrado.",
                }));
            }
        }
    }, []);

    // ========================================
    // SELECTOR NATIVO DEL NAVEGADOR
    // ========================================

    const seleccionarPuerto = useCallback(() => {
        const serial = obtenerSerial();

        modoRef.current = "mondo";
        setModoReloj("mondo");

        if (!serial) {
            setEstadoMondo((anterior) => ({
                ...anterior,
                websocket: "error",
                puerto: "desconocido",
                detalle:
                    "Web Serial no disponible. Utiliza Chrome " +
                    "o Edge de escritorio con HTTPS.",
            }));

            return;
        }

        if (solicitandoRef.current) return;

        solicitandoRef.current = true;

        // requestPort se ejecuta directamente
        // desde el clic del usuario.

        let promesaPuerto: Promise<PuertoSerieWeb>;

        try {
            promesaPuerto = serial.requestPort();
        } catch (error) {
            solicitandoRef.current = false;

            setEstadoMondo((anterior) => ({
                ...anterior,
                websocket: "error",
                puerto: "desconectado",
                detalle:
                    "No se pudo abrir el selector: " +
                    mensajeError(error),
            }));

            return;
        }

        void promesaPuerto.then(async (puerto) => {
            solicitandoRef.current = false;

            if (modoRef.current !== "mondo") return;

            await detenerPuerto();

            if (modoRef.current === "mondo") {
                await abrirPuerto(puerto);
            }
        }).catch((error: unknown) => {
            solicitandoRef.current = false;

            if (modoRef.current !== "mondo") return;

            setEstadoMondo((anterior) => ({
                ...anterior,
                websocket: "error",
                puerto: "desconectado",

                detalle:
                    error instanceof DOMException &&
                    error.name === "NotFoundError"
                        ? "Selección cancelada. Pulsa MONDO para elegir COM4."
                        : "No se pudo seleccionar el puerto: " +
                            mensajeError(error),
            }));
        });
    }, [abrirPuerto, detenerPuerto]);

    // ========================================
    // CAMBIAR MODO
    // ========================================

    const cambiarModoReloj = useCallback((
        modo: ModoReloj,
    ) => {
        modoRef.current = modo;
        setModoReloj(modo);

        if (modo !== "mondo") {
            void detenerPuerto();
        }

        establecerDatos((actual) => {
            const reloj =
                actual.relojes[ID_RELOJ_PRINCIPAL];

            if (!reloj) return actual;

            const fuente: FuenteTiempo =
                modo === "mondo" ? "mondo" : "manual";

            const texto =
                modo === "mondo"
                    ? "--:--"
                    : modo === "simulacion"
                        ? "08:34"
                        : reloj.texto === "--:--"
                            ? "10:00"
                            : reloj.texto;

            return {
                ...actual,

                relojes: {
                    ...actual.relojes,

                    [ID_RELOJ_PRINCIPAL]: {
                        ...reloj,
                        fuente,
                        texto,
                        actualizadoEn:
                            modo === "mondo"
                                ? null
                                : Date.now(),
                    },
                },
            };
        });
    }, [detenerPuerto]);

    // ACTIVAR MONDO DESDE EL BOTÓN EXISTENTE

    const activarRelojMondo = useCallback((
        _relojId: string = ID_RELOJ_PRINCIPAL,
    ) => {
        cambiarModoReloj("mondo");
        seleccionarPuerto();
    }, [cambiarModoReloj, seleccionarPuerto]);

    const reconectarMondo = useCallback(() => {
        seleccionarPuerto();
    }, [seleccionarPuerto]);

    // SIMULACIÓN

    const reiniciarSimulacion = useCallback(() => {
        cambiarModoReloj("simulacion");

        setReinicioSimulacion(
            (valor) => valor + 1,
        );
    }, [cambiarModoReloj]);

    useEffect(() => {
        if (modoReloj !== "simulacion") return;

        const inicio = Date.now();

        const actualizar = () => {
            const restante = Math.max(
                0,
                INICIO_SIMULACION -
                    (Date.now() - inicio),
            );

            const texto = tiempoSimulado(restante);

            establecerDatos((actual) => {
                const reloj =
                    actual.relojes[ID_RELOJ_PRINCIPAL];

                if (
                    !reloj ||
                    (
                        reloj.texto === texto &&
                        reloj.fuente === "manual"
                    )
                ) {
                    return actual;
                }

                return {
                    ...actual,

                    relojes: {
                        ...actual.relojes,

                        [ID_RELOJ_PRINCIPAL]: {
                            ...reloj,
                            texto,
                            fuente: "manual",
                            actualizadoEn: Date.now(),
                        },
                    },
                };
            });

            return restante;
        };

        actualizar();

        const intervalo = window.setInterval(() => {
            if (actualizar() === 0) {
                window.clearInterval(intervalo);
            }
        }, 100);

        return () => window.clearInterval(intervalo);
    }, [modoReloj, reinicioSimulacion]);

    // ========================================
    // CONEXIÓN AUTOMÁTICA CON PERMISO PREVIO
    // ========================================

    useEffect(() => {
        if (modoReloj !== "mondo") {
            void detenerPuerto();

            setEstadoMondo((anterior) => ({
                ...anterior,
                websocket: "inactivo",
                puerto: "desconocido",
                detalle: "Web Serial desactivado.",
            }));

            return;
        }

        const serial = obtenerSerial();

        if (!serial) {
            setEstadoMondo((anterior) => ({
                ...anterior,
                websocket: "error",
                puerto: "desconocido",
                detalle:
                    "Este navegador no dispone de Web Serial.",
            }));

            return;
        }

        let activo = true;

        const recuperarPuerto = async () => {
            if (
                !activo ||
                modoRef.current !== "mondo" ||
                conectandoRef.current ||
                puertoRef.current ||
                solicitandoRef.current
            ) {
                return;
            }

            try {
                const autorizados =
                    await serial.getPorts();

                if (
                    !activo ||
                    modoRef.current !== "mondo" ||
                    conectandoRef.current ||
                    puertoRef.current ||
                    solicitandoRef.current
                ) {
                    return;
                }

                if (autorizados.length === 1) {
                    await abrirPuerto(autorizados[0]);
                } else {
                    setEstadoMondo((anterior) => ({
                        ...anterior,
                        websocket: "desconectado",
                        puerto: "desconectado",

                        detalle:
                            autorizados.length > 1
                                ? "Hay varios puertos autorizados. Pulsa MONDO y elige COM4."
                                : "Pulsa MONDO para autorizar y seleccionar COM4.",
                    }));
                }
            } catch (error) {
                if (activo) {
                    setEstadoMondo((anterior) => ({
                        ...anterior,
                        websocket: "error",
                        puerto: "desconectado",
                        detalle:
                            "No se pudieron consultar los puertos: " +
                            mensajeError(error),
                    }));
                }
            }
        };

        void recuperarPuerto();

        const intervalo = window.setInterval(() => {
            void recuperarPuerto();
        }, 5000);

        return () => {
            activo = false;
            window.clearInterval(intervalo);
        };
    }, [modoReloj, abrirPuerto, detenerPuerto]);

    // LIMPIEZA AL CERRAR LA PÁGINA

    useEffect(() => {
        return () => {
            void detenerPuerto();
        };
    }, [detenerPuerto]);

    // CONTEXTO

    const contexto = useMemo<ContextoMarcador>(
        () => ({
            datos,
            establecerDatos,

            actualizarEquipo,
            actualizarPeriodo,
            actualizarCategoria,
            actualizarReloj,

            modoReloj,
            cambiarModoReloj,
            reiniciarSimulacion,

            estadoMondo,
            reconectarMondo,
            activarRelojMondo,
        }),
        [
            datos,
            actualizarEquipo,
            actualizarPeriodo,
            actualizarCategoria,
            actualizarReloj,

            modoReloj,
            cambiarModoReloj,
            reiniciarSimulacion,

            estadoMondo,
            reconectarMondo,
            activarRelojMondo,
        ],
    );

    return (
        <MarcadorContext.Provider value={contexto}>
            {children}
        </MarcadorContext.Provider>
    );
}
