
import {
    createContext,
    useCallback,
    useEffect,
    useMemo,
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
   MARCADOR CBA
   Estado central y conexión MONDO
   ============================================ */

export type ModoReloj = "manual" | "mondo" | "simulacion";

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

interface ContextoMarcador {
    datos: DatosMarcador;
    establecerDatos: Dispatch<SetStateAction<DatosMarcador>>;

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

const CLAVE_MODO = "cba.marcador.modo-reloj.v1";

// El servidor solo se utiliza en el equipo que active MONDO.
const URL_MONDO =
    import.meta.env.VITE_MONDO_WS_URL?.trim() ||
    "ws://127.0.0.1:8765/mondo";

const SIMULACION_INICIAL_MS = 8 * 60_000 + 34_000;
const SIMULACION_INTERVALO_MS = 100;

function leerModoGuardado(): ModoReloj {
    try {
        const guardado = window.localStorage.getItem(CLAVE_MODO);

        if (
            guardado === "manual" ||
            guardado === "mondo" ||
            guardado === "simulacion"
        ) {
            return guardado;
        }
    } catch {
        // Navegadores sin almacenamiento disponible.
    }

    // En PC de desarrollo nunca intentar COM4 por defecto.
    return "manual";
}

function formatearSimulacion(milisegundos: number): string {
    const restante = Math.max(0, milisegundos);

    if (restante >= 60_000) {
        const totalSegundos = Math.ceil(restante / 1000);
        const minutos = Math.floor(totalSegundos / 60);
        const segundos = totalSegundos % 60;

        return `${String(minutos).padStart(2, "0")}:` +
            `${String(segundos).padStart(2, "0")}`;
    }

    const totalDecimas = Math.ceil(restante / 100);
    const segundos = Math.floor(totalDecimas / 10);
    const decimas = totalDecimas % 10;

    return `${String(segundos).padStart(2, "0")}.${decimas}`;
}

function esTiempoMondoValido(texto: unknown): texto is string {
    return typeof texto === "string" && (
        /^\d{2}:[0-5]\d$/.test(texto) ||
        /^[0-5]\d\.\d$/.test(texto)
    );
}

export default function MarcadorProvider({
    children,
}: MarcadorProviderProps) {
    // La selección se guarda en este navegador, no en la nube.
    const [modoReloj, setModoReloj] =
        useState<ModoReloj>(leerModoGuardado);

    const [datos, establecerDatos] = useState<DatosMarcador>(() => {
        const reloj = DATOS_INICIALES.relojes[ID_RELOJ_PRINCIPAL];

        return {
            ...DATOS_INICIALES,
            relojes: {
                ...DATOS_INICIALES.relojes,
                [ID_RELOJ_PRINCIPAL]: {
                    ...reloj,
                    fuente: modoReloj === "mondo" ? "mondo" : "manual",
                    texto:
                        modoReloj === "mondo"
                            ? "--:--"
                            : modoReloj === "simulacion"
                                ? "08:34"
                                : "10:00",
                },
            },
        };
    });

    const [estadoMondo, setEstadoMondo] =
        useState<EstadoConexionMondo>({
            websocket: "inactivo",
            puerto: "desconocido",
            detalle: "Modo manual. Conexión MONDO desactivada.",
            ultimaLecturaEn: null,
        });

    const [solicitudReconexion, setSolicitudReconexion] = useState(0);
    const [solicitudSimulacion, setSolicitudSimulacion] = useState(0);

    useEffect(() => {
        try {
            window.localStorage.setItem(CLAVE_MODO, modoReloj);
        } catch {
            // La ausencia de almacenamiento no impide utilizar el marcador.
        }
    }, [modoReloj]);

    // EQUIPOS
    const actualizarEquipo = useCallback((
        lado: LadoEquipo,
        cambios: Partial<EquipoMarcador>,
        partidoId?: string,
    ) => {
        establecerDatos((actual) => {
            const id = partidoId ?? actual.partidoPrincipalId;
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
        const periodoNuevo = Math.max(1, Math.trunc(periodo));

        establecerDatos((actual) => {
            const id = partidoId ?? actual.partidoPrincipalId;
            const partido = actual.partidos[id];
            if (!partido || partido.periodo === periodoNuevo) return actual;

            return {
                ...actual,
                partidos: {
                    ...actual.partidos,
                    [id]: { ...partido, periodo: periodoNuevo },
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
            const id = partidoId ?? actual.partidoPrincipalId;
            const partido = actual.partidos[id];
            if (!partido || partido.categoriaId === categoriaId) return actual;

            return {
                ...actual,
                partidos: {
                    ...actual.partidos,
                    [id]: { ...partido, categoriaId },
                },
            };
        });
    }, []);

    // CAMBIAR FUENTE DEL RELOJ
    const cambiarModoReloj = useCallback((modo: ModoReloj) => {
        setModoReloj(modo);

        establecerDatos((actual) => {
            const reloj = actual.relojes[ID_RELOJ_PRINCIPAL];
            if (!reloj) return actual;

            const fuente: FuenteTiempo =
                modo === "mondo" ? "mondo" : "manual";

            const texto =
                modo === "mondo"
                    ? "--:--"
                    : modo === "simulacion"
                        ? formatearSimulacion(SIMULACION_INICIAL_MS)
                        : reloj.texto === "--:--"
                            ? "10:00"
                            : reloj.texto;

            if (reloj.fuente === fuente && reloj.texto === texto) {
                return actual;
            }

            return {
                ...actual,
                relojes: {
                    ...actual.relojes,
                    [ID_RELOJ_PRINCIPAL]: {
                        ...reloj,
                        texto,
                        fuente,
                        actualizadoEn: modo === "mondo" ? null : Date.now(),
                    },
                },
            };
        });
    }, []);

    // ACTUALIZACIÓN MANUAL, COMPATIBLE CON CONTROL.TSX
    const actualizarReloj = useCallback((
        texto: string,
        relojId: string = ID_RELOJ_PRINCIPAL,
        fuente?: FuenteTiempo,
    ) => {
        if (fuente === "manual") {
            setModoReloj("manual");
        } else if (fuente === "mondo") {
            setModoReloj("mondo");
        }

        establecerDatos((actual) => {
            const reloj = actual.relojes[relojId];
            if (!reloj) return actual;

            const fuenteNueva = fuente ?? reloj.fuente;

            if (reloj.texto === texto && reloj.fuente === fuenteNueva) {
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

    // RECONEXIÓN MANUAL A MONDO
    const reconectarMondo = useCallback(() => {
        cambiarModoReloj("mondo");
        setSolicitudReconexion((anterior) => anterior + 1);
    }, [cambiarModoReloj]);

    const activarRelojMondo = useCallback((
        relojId: string = ID_RELOJ_PRINCIPAL,
    ) => {
        cambiarModoReloj("mondo");

        if (relojId !== ID_RELOJ_PRINCIPAL) {
            establecerDatos((actual) => {
                const reloj = actual.relojes[relojId];
                if (!reloj) return actual;

                return {
                    ...actual,
                    relojes: {
                        ...actual.relojes,
                        [relojId]: {
                            ...reloj,
                            texto: "--:--",
                            fuente: "mondo",
                            actualizadoEn: null,
                        },
                    },
                };
            });
        }

        setSolicitudReconexion((anterior) => anterior + 1);
    }, [cambiarModoReloj]);

    const reiniciarSimulacion = useCallback(() => {
        cambiarModoReloj("simulacion");
        setSolicitudSimulacion((anterior) => anterior + 1);
    }, [cambiarModoReloj]);

    // SIMULADOR LOCAL: 08:34 -> 01:00 -> 59.9 -> 00.0
    useEffect(() => {
        if (modoReloj !== "simulacion") return;

        const inicio = Date.now();

        const actualizar = () => {
            const transcurrido = Date.now() - inicio;
            const restante = Math.max(
                0,
                SIMULACION_INICIAL_MS - transcurrido,
            );
            const texto = formatearSimulacion(restante);

            establecerDatos((actual) => {
                const reloj = actual.relojes[ID_RELOJ_PRINCIPAL];
                if (!reloj || (reloj.texto === texto && reloj.fuente === "manual")) {
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
        }, SIMULACION_INTERVALO_MS);

        return () => window.clearInterval(intervalo);
    }, [modoReloj, solicitudSimulacion]);

    // MONDO: NO CONECTAR EN MODO MANUAL NI SIMULACIÓN
    useEffect(() => {
        if (modoReloj !== "mondo") {
            setEstadoMondo((anterior) => ({
                ...anterior,
                websocket: "inactivo",
                puerto: "desconocido",
                detalle: modoReloj === "simulacion"
                    ? "Simulación local; MONDO desactivado."
                    : "Modo manual; MONDO desactivado.",
            }));
            return;
        }

        let cancelado = false;
        let socketActual: WebSocket | null = null;
        let temporizadorInicio: ReturnType<typeof setTimeout> | null = null;
        let temporizadorReconexion: ReturnType<typeof setTimeout> | null = null;
        let fallos = 0;

        const programarReconexion = () => {
            if (cancelado) return;

            fallos += 1;
            const espera = Math.min(30_000, 3000 * 2 ** Math.min(fallos - 1, 4));
            temporizadorReconexion = setTimeout(conectar, espera);
        };

        const conectar = () => {
            if (cancelado) return;

            setEstadoMondo((anterior) => ({
                ...anterior,
                websocket: "conectando",
                puerto: "desconocido",
                detalle: "Conectando con el puente MONDO...",
            }));

            let socket: WebSocket;

            try {
                socket = new WebSocket(URL_MONDO);
            } catch {
                setEstadoMondo((anterior) => ({
                    ...anterior,
                    websocket: "error",
                    detalle: "La dirección WebSocket MONDO no es válida.",
                }));
                programarReconexion();
                return;
            }

            socketActual = socket;

            socket.onopen = () => {
                if (cancelado || socketActual !== socket) return;

                fallos = 0;
                setEstadoMondo((anterior) => ({
                    ...anterior,
                    websocket: "conectado",
                    detalle: "Puente MONDO conectado; comprobando COM4.",
                }));
            };

            socket.onmessage = (evento: MessageEvent) => {
                if (cancelado || socketActual !== socket) return;
                if (typeof evento.data !== "string") return;

                let mensaje: Record<string, unknown>;
                try {
                    const datos: unknown = JSON.parse(evento.data);
                    if (!datos || typeof datos !== "object" || Array.isArray(datos)) return;
                    mensaje = datos as Record<string, unknown>;
                } catch {
                    return;
                }

                if (mensaje.tipo === "estado") {
                    const estado = mensaje.estado;
                    const puerto: EstadoPuertoMondo =
                        estado === "conectado" ||
                        estado === "conectando" ||
                        estado === "desconectado"
                            ? estado
                            : "desconocido";

                    setEstadoMondo((anterior) => ({
                        ...anterior,
                        websocket: "conectado",
                        puerto,
                        detalle: typeof mensaje.detalle === "string" && mensaje.detalle
                            ? mensaje.detalle
                            : puerto === "conectado"
                                ? "COM4 conectado."
                                : puerto === "conectando"
                                    ? "Abriendo COM4..."
                                    : "COM4 desconectado.",
                    }));
                    return;
                }

                // Ignorar tramas desconocidas o de diagnóstico.
                if (mensaje.tipo !== "tiempo" || !esTiempoMondoValido(mensaje.texto)) {
                    return;
                }

                const relojId = typeof mensaje.relojId === "string"
                    ? mensaje.relojId
                    : ID_RELOJ_PRINCIPAL;
                const texto = mensaje.texto;

                setEstadoMondo((anterior) => ({
                    ...anterior,
                    ultimaLecturaEn: Date.now(),
                }));

                establecerDatos((actual) => {
                    const reloj = actual.relojes[relojId];
                    if (!reloj || reloj.fuente !== "mondo" || reloj.texto === texto) {
                        return actual;
                    }

                    return {
                        ...actual,
                        relojes: {
                            ...actual.relojes,
                            [relojId]: {
                                ...reloj,
                                texto,
                                fuente: "mondo",
                                actualizadoEn: Date.now(),
                            },
                        },
                    };
                });
            };

            socket.onerror = () => {
                if (cancelado || socketActual !== socket) return;

                setEstadoMondo((anterior) => ({
                    ...anterior,
                    websocket: "error",
                    puerto: "desconocido",
                    detalle: "No responde el puente local MONDO.",
                }));
            };

            socket.onclose = () => {
                if (cancelado || socketActual !== socket) return;
                socketActual = null;

                setEstadoMondo((anterior) => ({
                    ...anterior,
                    websocket: "desconectado",
                    puerto: "desconocido",
                    detalle: "Sin conexión con el puente MONDO. Reintentando...",
                }));

                programarReconexion();
            };
        };

        // Retraso pequeño: evita conectar durante el montaje de prueba
        // y desmontaje inmediato de React.StrictMode en desarrollo.
        temporizadorInicio = setTimeout(conectar, 150);

        return () => {
            cancelado = true;
            if (temporizadorInicio) clearTimeout(temporizadorInicio);
            if (temporizadorReconexion) clearTimeout(temporizadorReconexion);

            if (socketActual) {
                const socket = socketActual;
                socketActual = null;
                socket.onmessage = null;
                socket.onerror = null;
                socket.onclose = null;

                if (socket.readyState === WebSocket.CONNECTING) {
                    // No cerrar prematuramente: esperar a que termine
                    // el establecimiento de la conexión.
                    socket.onopen = () => socket.close(1000, "Modo cambiado");
                    socket.onerror = () => {};
                    socket.onclose = () => {};
                } else if (socket.readyState === WebSocket.OPEN) {
                    socket.onopen = null;
                    socket.close(1000, "Modo cambiado");
                }
            }
        };
    }, [modoReloj, solicitudReconexion]);

    const contexto = useMemo<ContextoMarcador>(() => ({
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
    }), [
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
    ]);

    return (
        <MarcadorContext.Provider value={contexto}>
            {children}
        </MarcadorContext.Provider>
    );
}
