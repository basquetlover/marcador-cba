
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
    PartidoMarcador,
} from "./tipos";

import { DecodificadorMondo } from "./DecodificadorMondo";
import type { PeriodoMondo } from "./DecodificadorMondo";

import {
    DATOS_INICIALES,
    ID_RELOJ_PRINCIPAL,
} from "./datosIniciales";

/* ============================================
   MARCADOR CBA - WEB SERIAL
   Conexión directa con MONDO mediante COM4.

   El decodificador es independiente de React.
   No se utiliza servidor ni WebSocket.
   ============================================ */

export type ModoReloj =
    | "manual"
    | "mondo"
    | "simulacion";

// Se conserva el nombre por compatibilidad
// con el panel Control.tsx existente.
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
    websocket: EstadoWebSocket;
    puerto: EstadoPuertoMondo;
    detalle: string;
    ultimaLecturaEn: number | null;
}

// Extensión provisional compatible con los
// tipos actuales del partido. Se incorporará
// a tipos.ts cuando actualicemos ese archivo.
type PartidoConPeriodoMondo = PartidoMarcador & {
    periodoMondo?: PeriodoMondo | null;
};

interface ContextoMarcador {
    datos: DatosMarcador;

    periodoMondo: PeriodoMondo | null;

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

/* ============================================
   WEB SERIAL
   ============================================ */

interface PuertoSerieWeb {
    readonly readable:
        ReadableStream<Uint8Array> | null;

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

const CLAVE_MODO =
    "cba.marcador.modo-reloj.v1";

const INICIO_SIMULACION =
    8 * 60_000 + 34_000;

function leerModoGuardado(): ModoReloj {
    try {
        const valor =
            localStorage.getItem(CLAVE_MODO);

        if (
            valor === "manual" ||
            valor === "mondo" ||
            valor === "simulacion"
        ) {
            return valor;
        }
    } catch {
        // Funciona sin almacenamiento.
    }

    return "manual";
}

function tiempoSimulado(ms: number): string {
    const restante = Math.max(0, ms);

    if (restante >= 60_000) {
        const total =
            Math.ceil(restante / 1000);

        return (
            String(Math.floor(total / 60))
                .padStart(2, "0") +
            ":" +
            String(total % 60)
                .padStart(2, "0")
        );
    }

    const decimas =
        Math.ceil(restante / 100);

    return (
        String(Math.floor(decimas / 10))
            .padStart(2, "0") +
        "." +
        String(decimas % 10)
    );
}

function mensajeError(
    error: unknown,
): string {
    return error instanceof Error
        ? error.message
        : "Error desconocido del puerto serie";
}

/* ============================================
   PROVIDER
   ============================================ */

export default function MarcadorProvider({
    children,
}: MarcadorProviderProps) {

    const [modoReloj, setModoReloj] =
        useState<ModoReloj>(leerModoGuardado);

    const modoRef = useRef(modoReloj);

    const [datos, establecerDatos] =
        useState<DatosMarcador>(() => ({
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
        }));

    // Estado completo del período recibido.
    // Separado de partido.periodo (numérico).

    const periodoMondo = (
        datos.partidos[
            datos.partidoPrincipalId
        ] as PartidoConPeriodoMondo | undefined
    )?.periodoMondo ?? null;

    const [estadoMondo, setEstadoMondo] =
        useState<EstadoConexionMondo>({
            websocket: "inactivo",
            puerto: "desconocido",
            detalle: "Web Serial desactivado.",
            ultimaLecturaEn: null,
        });

    const [
        reinicioSimulacion,
        setReinicioSimulacion,
    ] = useState(0);

    /* ========================================
       REFERENCIAS DEL PUERTO
       ======================================== */

    const puertoRef =
        useRef<PuertoSerieWeb | null>(null);

    const lectorRef = useRef<
        ReadableStreamDefaultReader<
            Uint8Array
        > | null
    >(null);

    const tareaLecturaRef =
        useRef<Promise<void> | null>(null);

    const sesionRef = useRef(0);

    const conectandoRef = useRef(false);

    const solicitandoRef = useRef(false);

    /* ========================================
       GUARDAR MODO
       ======================================== */

    useEffect(() => {
        try {
            localStorage.setItem(
                CLAVE_MODO,
                modoReloj,
            );
        } catch {
            // No impedir funcionamiento.
        }
    }, [modoReloj]);

    /* ========================================
       EQUIPOS
       ======================================== */

    const actualizarEquipo = useCallback((
        lado: LadoEquipo,
        cambios: Partial<EquipoMarcador>,
        partidoId?: string,
    ) => {
        establecerDatos((actual) => {
            const id =
                partidoId ??
                actual.partidoPrincipalId;

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

    /* ========================================
       PERÍODO MANUAL
       ======================================== */

    const actualizarPeriodo = useCallback((
        periodo: number,
        partidoId?: string,
    ) => {
        // Mientras MONDO esté activo, COM4
        // tiene prioridad sobre el control manual.
        if (modoRef.current === "mondo") {
            return;
        }

        if (!Number.isFinite(periodo)) {
            return;
        }

        const periodoNuevo = Math.max(
            1,
            Math.trunc(periodo),
        );

        establecerDatos((actual) => {
            const id =
                partidoId ??
                actual.partidoPrincipalId;

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
                        periodoMondo: null,
                    },
                },
            };
        });
    }, []);

    /* ========================================
       CATEGORÍA
       ======================================== */

    const actualizarCategoria = useCallback((
        categoriaId: string | null,
        partidoId?: string,
    ) => {
        establecerDatos((actual) => {
            const id =
                partidoId ??
                actual.partidoPrincipalId;

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

    /* ========================================
       RELOJ MANUAL
       ======================================== */

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
            const reloj =
                actual.relojes[relojId];

            if (!reloj) return actual;

            const fuenteNueva =
                fuente ?? reloj.fuente;

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

    /* ========================================
       CERRAR PUERTO SERIE
       ======================================== */

    const detenerPuerto =
        useCallback(async () => {

        const sesion = ++sesionRef.current;

        const lector = lectorRef.current;

        if (lector) {
            try {
                await lector.cancel();
            } catch {
                // Puerto desconectado.
            }
        }

        const tarea =
            tareaLecturaRef.current;

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
                // Ya cerrado.
            }

            if (puertoRef.current === puerto) {
                puertoRef.current = null;
            }
        }

        if (sesion === sesionRef.current) {
            conectandoRef.current = false;
        }
    }, []);

    /* ========================================
       ABRIR COM4 Y LEER TRAMAS
       ======================================== */

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
            detalle:
                "Abriendo puerto serie a 19200 baudios...",
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

            /* ================================
               DECODIFICADOR INDEPENDIENTE
               ================================ */

            const decodificador =
                new DecodificadorMondo({

                /* ============================
                   RELOJ
                   ============================ */

                alTiempo: (lectura) => {
                    if (
                        sesion !== sesionRef.current ||
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
                            reloj.texto === lectura.texto
                        ) {
                            return actual;
                        }

                        return {
                            ...actual,

                            relojes: {
                                ...actual.relojes,

                                [ID_RELOJ_PRINCIPAL]: {
                                    ...reloj,
                                    texto: lectura.texto,
                                    actualizadoEn:
                                        lectura.recibidoEn,
                                },
                            },
                        };
                    });
                },

                /* ============================
                   PERÍODO
                   ============================ */

                alPeriodo: (lectura) => {
                    if (
                        sesion !== sesionRef.current ||
                        modoRef.current !== "mondo"
                    ) {
                        return;
                    }

                    setEstadoMondo((anterior) => ({
                        ...anterior,
                        ultimaLecturaEn: Date.now(),
                        detalle:
                            "Recibiendo periodo de MONDO.",
                    }));

                    establecerDatos((actual) => {
                        const id =
                            actual.partidoPrincipalId;

                        const partido =
                            actual.partidos[id] as
                                PartidoConPeriodoMondo |
                                undefined;

                        if (!partido) {
                            return actual;
                        }

                        // Solo un período normal
                        // modifica el número.
                        //
                        // En overtime y empty
                        // conservamos el último
                        // número conocido.

                        const numero =
                            lectura.type === "quarter" &&
                            lectura.number !== null
                                ? lectura.number
                                : partido.periodo;

                        if (
                            partido.periodoMondo?.raw ===
                                lectura.raw &&
                            partido.periodo === numero
                        ) {
                            return actual;
                        }

                        return {
                            ...actual,

                            partidos: {
                                ...actual.partidos,

                                [id]: {
                                    ...partido,

                                    periodo: numero,

                                    periodoMondo: {
                                        ...lectura,
                                    },
                                },
                            },
                        };
                    });
                },
            });

            /* ================================
               LECTURA CONTINUA DE WEB SERIAL
               ================================ */

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
                                const {
                                    value,
                                    done,
                                } = await lector.read();

                                if (done) break;

                                if (
                                    !value ||
                                    sesion !== sesionRef.current
                                ) {
                                    continue;
                                }

                                // Web Serial proporciona
                                // bytes originales de COM4.
                                // El decoder mantiene
                                // su propio buffer.

                                decodificador.recibir(value);
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
                    if (
                        sesion === sesionRef.current
                    ) {
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

    /* ========================================
       SELECCIONAR PUERTO DEL NAVEGADOR
       ======================================== */

    const seleccionarPuerto =
        useCallback(() => {

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

        let promesaPuerto:
            Promise<PuertoSerieWeb>;

        try {
            // Se ejecuta desde el clic
            // para conservar la activación
            // de usuario requerida por Chrome.
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

        void promesaPuerto
            .then(async (puerto) => {
                solicitandoRef.current = false;

                if (
                    modoRef.current !== "mondo"
                ) {
                    return;
                }

                await detenerPuerto();

                if (
                    modoRef.current === "mondo"
                ) {
                    await abrirPuerto(puerto);
                }
            })
            .catch((error: unknown) => {
                solicitandoRef.current = false;

                if (
                    modoRef.current !== "mondo"
                ) {
                    return;
                }

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

    /* ========================================
       CAMBIAR MODO DEL RELOJ
       ======================================== */

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
                actual.relojes[
                    ID_RELOJ_PRINCIPAL
                ];

            if (!reloj) return actual;

            const fuente: FuenteTiempo =
                modo === "mondo"
                    ? "mondo"
                    : "manual";

            const texto =
                modo === "mondo"
                    ? "--:--"
                    : modo === "simulacion"
                        ? "08:34"
                        : reloj.texto === "--:--"
                            ? "10:00"
                            : reloj.texto;

            const id =
                actual.partidoPrincipalId;

            const partido =
                actual.partidos[id];

            return {
                ...actual,

                // Al cambiar de modo, se limpia
                // la lectura anterior de MONDO.
                // El decoder recibirá de nuevo AA.

                partidos: partido
                    ? {
                        ...actual.partidos,

                        [id]: {
                            ...partido,
                            periodoMondo: null,
                        },
                    }
                    : actual.partidos,

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

    /* ========================================
       ACTIVAR MONDO
       ======================================== */

    const activarRelojMondo = useCallback((
        _relojId: string = ID_RELOJ_PRINCIPAL,
    ) => {
        cambiarModoReloj("mondo");
        seleccionarPuerto();
    }, [cambiarModoReloj, seleccionarPuerto]);

    const reconectarMondo = useCallback(() => {
        seleccionarPuerto();
    }, [seleccionarPuerto]);

    /* ========================================
       SIMULACIÓN
       ======================================== */

    const reiniciarSimulacion = useCallback(() => {
        cambiarModoReloj("simulacion");

        setReinicioSimulacion(
            (valor) => valor + 1,
        );
    }, [cambiarModoReloj]);

    useEffect(() => {
        if (
            modoReloj !== "simulacion"
        ) {
            return;
        }

        const inicio = Date.now();

        const actualizar = () => {
            const restante = Math.max(
                0,
                INICIO_SIMULACION -
                    (Date.now() - inicio),
            );

            const texto =
                tiempoSimulado(restante);

            establecerDatos((actual) => {
                const reloj =
                    actual.relojes[
                        ID_RELOJ_PRINCIPAL
                    ];

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

        const intervalo =
            window.setInterval(() => {
                if (actualizar() === 0) {
                    window.clearInterval(
                        intervalo,
                    );
                }
            }, 100);

        return () =>
            window.clearInterval(intervalo);

    }, [modoReloj, reinicioSimulacion]);

    /* ========================================
       RECONEXIÓN CON PERMISO PREVIO
       ======================================== */

    useEffect(() => {
        if (modoReloj !== "mondo") {
            void detenerPuerto();

            setEstadoMondo((anterior) => ({
                ...anterior,
                websocket: "inactivo",
                puerto: "desconocido",
                detalle:
                    "Web Serial desactivado.",
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
                    await abrirPuerto(
                        autorizados[0],
                    );
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

        const intervalo =
            window.setInterval(() => {
                void recuperarPuerto();
            }, 5000);

        return () => {
            activo = false;

            window.clearInterval(
                intervalo,
            );
        };

    }, [modoReloj, abrirPuerto, detenerPuerto]);

    /* ========================================
       LIMPIEZA AL CERRAR PÁGINA
       ======================================== */

    useEffect(() => {
        return () => {
            void detenerPuerto();
        };
    }, [detenerPuerto]);

    /* ========================================
       CONTEXTO
       ======================================== */

    const contexto = useMemo<ContextoMarcador>(
        () => ({
            datos,
            periodoMondo,
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
            periodoMondo,
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
