
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { Link } from "react-router";

import {
    DecodificadorMondo,
} from "../marcador/DecodificadorMondo";

import type {
    LecturaTiempoMondo,
    PeriodoMondo,
    TramaMondo,
    TiempoEspecialMondo,
} from "../marcador/DecodificadorMondo";

import usePageTitle from "../lib/usePageTitle";

/* ============================================
   MONDO / DIAGNÓSTICO WEB SERIAL
   Ruta: /diagnostico

   Independiente de MarcadorProvider.
   Lectura directa de COM4.
   Mismo decoder que usa el marcador.
   ============================================ */

const BAUD_RATE = 19200;

const MAX_TRAMAS = 25000;
const MAX_BLOQUES = 8000;

const TRAMAS_VISIBLES = 45;
const BLOQUES_VISIBLES = 35;

type Conexion =
    | "desconectado"
    | "seleccionando"
    | "abriendo"
    | "conectado"
    | "error";

type TipoSalida =
    | "tiempo"
    | "periodo"
    | "especial"
    | "sin-salida";

/* ============================================
   TIPOS WEB SERIAL
   ============================================ */

interface InformacionPuerto {
    usbVendorId?: number;
    usbProductId?: number;
    bluetoothServiceClassId?: string;
}

interface PuertoWebSerial {
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

    getInfo?(): InformacionPuerto;
}

interface APIWebSerial {
    requestPort(): Promise<PuertoWebSerial>;
}

/* ============================================
   REGISTROS DEL DIAGNÓSTICO
   ============================================ */

interface BloqueBruto {
    id: number;
    recibidoEn: string;

    bytes: number;
    hexadecimal: string;

    esperaLecturaMs: number;
    procesamientoMs: number;

    tramasDetectadas: number;
}

interface TramaRegistro {
    id: number;

    recibidaEn: string;
    reconocidaEn: string;

    hexadecimal: string;
    direccion: string;
    dato: string;

    registro: string;
    significado: string;

    salidaTipo: TipoSalida;
    salida: string;

    resultadoEn: string | null;

    desdeLecturaMs: number | null;
    desdeTramaMs: number | null;
}

interface TramaInterna extends TramaRegistro {
    _reconocidaMs: number;
}

interface Metricas {
    bytes: number;
    bloques: number;
    tramas: number;

    relojes: number;
    periodos: number;
    especiales: number;
    otrasDirecciones: number;

    recibidaPrimera: string | null;
    recibidaUltima: string | null;
    resultadoUltimo: string | null;

    esperaUltimaMs: number | null;
    procesoUltimoMs: number | null;
    procesoMaxMs: number;

    latenciaUltimaMs: number | null;
    maxLatenciaMs: number;

    bloquesDescartados: number;
    tramasDescartadas: number;
}

interface Almacen {
    metricas: Metricas;

    bloques: BloqueBruto[];
    tramas: TramaRegistro[];

    reloj: LecturaTiempoMondo | null;
    periodo: PeriodoMondo | null;

    ultimoError: string | null;
}

interface Vista {
    metricas: Metricas;

    bloques: BloqueBruto[];
    tramas: TramaRegistro[];

    reloj: LecturaTiempoMondo | null;
    periodo: PeriodoMondo | null;

    ultimoError: string | null;
}

/* ============================================
   ESTADO INICIAL
   ============================================ */

function metricasVacias(): Metricas {
    return {
        bytes: 0,
        bloques: 0,
        tramas: 0,

        relojes: 0,
        periodos: 0,
        especiales: 0,
        otrasDirecciones: 0,

        recibidaPrimera: null,
        recibidaUltima: null,
        resultadoUltimo: null,

        esperaUltimaMs: null,
        procesoUltimoMs: null,
        procesoMaxMs: 0,

        latenciaUltimaMs: null,
        maxLatenciaMs: 0,

        bloquesDescartados: 0,
        tramasDescartadas: 0,
    };
}

function nuevoAlmacen(): Almacen {
    return {
        metricas: metricasVacias(),

        bloques: [],
        tramas: [],

        reloj: null,
        periodo: null,

        ultimoError: null,
    };
}

function generarVista(
    almacen: Almacen,
): Vista {
    return {
        metricas: {
            ...almacen.metricas,
        },

        bloques: almacen.bloques
            .slice(-BLOQUES_VISIBLES)
            .reverse(),

        tramas: almacen.tramas
            .slice(-TRAMAS_VISIBLES)
            .reverse()
            .map((trama) => ({ ...trama })),

        reloj: almacen.reloj
            ? { ...almacen.reloj }
            : null,

        periodo: almacen.periodo
            ? { ...almacen.periodo }
            : null,

        ultimoError: almacen.ultimoError,
    };
}

/* ============================================
   UTILIDADES
   ============================================ */

function hex(
    byte: number,
): string {
    return byte
        .toString(16)
        .toUpperCase()
        .padStart(2, "0");
}

function milisegundos(
    valor: number | null,
): string {
    return valor === null
        ? "—"
        : `${valor.toFixed(3)} ms`;
}

function hora(
    iso: string | null,
): string {
    if (!iso) return "—";

    return new Date(iso).toLocaleTimeString(
        "es-ES",
        {
            hour12: false,

            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",

            fractionalSecondDigits: 3,
        },
    );
}

/* ============================================
   IDENTIFICACIÓN DE DIRECCIONES

   Esta función solo añade etiquetas
   al diagnóstico. La interpretación
   efectiva la hace DecodificadorMondo.
   ============================================ */

function identificarRegistro(
    direccion: number,
    dato: number,
): {
    nombre: string;
    significado: string;
    conocido: boolean;
} {
    const reloj = new Map([
        [0xa3, "A3"],
        [0xa2, "A2"],
        [0xa1, "A1"],
        [0xa0, "A0"],

        [0x74, "74"],
        [0x73, "73"],
        [0x72, "72"],
        [0x71, "71"],
    ]);

    if (direccion === 0xaa) {
        const texto =
            dato === 0x50
                ? "Prórroga (dato 50)"
                : dato === 0x5f
                    ? "Período vacío (dato 5F)"
                    : dato >= 0x51 &&
                        dato <= 0x59
                        ? `Período ${dato - 0x50}`
                        : "Dato de período no reconocido";

        return {
            nombre: "AA · Período",
            significado: texto,
            conocido: true,
        };
    }

    if (reloj.has(direccion)) {
        const valor =
            dato === 0x5f
                ? "Valor especial 5F"
                : dato >= 0x50 &&
                    dato <= 0x59
                    ? `Dígito ${dato - 0x50}`
                    : "Dato no reconocido";

        return {
            nombre:
                `${reloj.get(direccion)} · Reloj`,

            significado: valor,
            conocido: true,
        };
    }

    return {
        nombre: `${hex(direccion)} · Otra`,

        significado:
            `Dirección ${hex(direccion)}, ` +
            `dato ${hex(dato)} sin interpretación`,

        conocido: false,
    };
}

/* ============================================
   ESTILOS
   ============================================ */

const PANEL =
    "rounded-2xl border border-sky-300/10 " +
    "bg-[#0d2137] p-4 shadow-lg " +
    "shadow-black/10 sm:p-5";

const ETIQUETA =
    "text-[11px] font-semibold uppercase " +
    "tracking-[0.14em] text-sky-200/55";

const BOTON =
    "rounded-xl px-4 py-2.5 text-sm " +
    "font-semibold transition-colors " +
    "disabled:cursor-not-allowed " +
    "disabled:opacity-40";

/* ============================================
   PÁGINA PRINCIPAL
   ============================================ */

export default function Diagnostico() {
    usePageTitle("Diagnóstico MONDO · COM4");

    const [
        conexion,
        setConexion,
    ] = useState<Conexion>("desconectado");

    const [
        detalle,
        setDetalle,
    ] = useState(
        "Sin conexión con la consola.",
    );

    const [
        infoPuerto,
        setInfoPuerto,
    ] = useState<InformacionPuerto | null>(
        null,
    );

    const [
        iniciadoEn,
        setIniciadoEn,
    ] = useState<string | null>(null);

    const almacenRef = useRef<Almacen>(
        nuevoAlmacen(),
    );

    const [
        vista,
        setVista,
    ] = useState<Vista>(() =>
        generarVista(almacenRef.current),
    );

    const puertoRef = useRef<
        PuertoWebSerial | null
    >(null);

    const lectorRef = useRef<
        ReadableStreamDefaultReader<
            Uint8Array
        > | null
    >(null);

    const lecturaRef = useRef<
        Promise<void> | null
    >(null);

    const decodificadorRef = useRef<
        DecodificadorMondo | null
    >(null);

    const sesionRef = useRef(0);

    const refrescoRef = useRef<
        number | null
    >(null);

    /* ========================================
       ACTUALIZAR INTERFAZ

       La captura guarda todos los registros
       retenidos, pero la vista se refresca
       como máximo aproximadamente cada 120 ms.
       ======================================== */

    const refrescar = useCallback(() => {
        if (refrescoRef.current !== null) {
            return;
        }

        refrescoRef.current = window.setTimeout(
            () => {
                refrescoRef.current = null;

                setVista(
                    generarVista(
                        almacenRef.current,
                    ),
                );
            },
            120,
        );
    }, []);

    const anotarError = useCallback((
        mensaje: string,
    ) => {
        almacenRef.current.ultimoError =
            mensaje;

        refrescar();
    }, [refrescar]);

    /* ========================================
       DESCONECTAR
       ======================================== */

    const cerrarPuerto = useCallback(async () => {
        ++sesionRef.current;

        const lector = lectorRef.current;

        if (lector) {
            try {
                await lector.cancel();
            } catch {
                // Ya se desconectó.
            }
        }

        if (lecturaRef.current) {
            try {
                await lecturaRef.current;
            } catch {
                // Error registrado.
            }
        }

        const puerto = puertoRef.current;

        if (puerto) {
            try {
                await puerto.close();
            } catch {
                // Ya cerrado.
            }
        }

        puertoRef.current = null;
        lectorRef.current = null;
        lecturaRef.current = null;
        decodificadorRef.current = null;

        setConexion("desconectado");

        setDetalle(
            "Puerto serie cerrado. " +
            "El registro permanece disponible " +
            "para descargar.",
        );
    }, []);

    /* ========================================
       LIMPIEZA AL SALIR DE /diagnostico
       ======================================== */

    useEffect(() => {
        return () => {
            ++sesionRef.current;

            if (refrescoRef.current !== null) {
                clearTimeout(refrescoRef.current);
            }

            const lector =
                lectorRef.current;

            if (lector) {
                void lector.cancel().catch(
                    () => undefined,
                );
            } else {
                const puerto =
                    puertoRef.current;

                if (puerto) {
                    void puerto.close().catch(
                        () => undefined,
                    );
                }
            }
        };
    }, []);

    /* ========================================
       CONECTAR WEB SERIAL
       ======================================== */

    const conectar = useCallback(async () => {
        if (
            conexion === "seleccionando" ||
            conexion === "abriendo" ||
            puertoRef.current
        ) {
            return;
        }

        const serial = (
            navigator as Navigator & {
                serial?: APIWebSerial;
            }
        ).serial;

        if (
            !window.isSecureContext ||
            !serial
        ) {
            const mensaje =
                "Web Serial requiere Chrome o Edge " +
                "de escritorio en HTTPS o localhost.";

            setConexion("error");
            setDetalle(mensaje);

            anotarError(mensaje);
            return;
        }

        const sesion =
            ++sesionRef.current;

        setConexion("seleccionando");

        setDetalle(
            "Selecciona COM4 en el diálogo del navegador.",
        );

        let puerto: PuertoWebSerial;

        try {
            // Debe ejecutarse directamente
            // desde la interacción del usuario.

            puerto =
                await serial.requestPort();

        } catch (error) {
            const mensaje =
                error instanceof Error
                    ? error.message
                    : "Selección de puerto cancelada";

            if (
                sesion !== sesionRef.current
            ) {
                return;
            }

            setConexion("desconectado");
            setDetalle(mensaje);

            return;
        }

        if (
            sesion !== sesionRef.current
        ) {
            return;
        }

        setConexion("abriendo");

        setDetalle(
            "Abriendo puerto a 19200 baudios, 8N1...",
        );

        puertoRef.current = puerto;

        try {
            await puerto.open({
                baudRate: BAUD_RATE,
                dataBits: 8,
                stopBits: 1,
                parity: "none",
                flowControl: "none",
            });

            if (
                sesion !== sesionRef.current
            ) {
                try {
                    await puerto.close();
                } catch {
                    // Cerrado.
                }

                return;
            }

        } catch (error) {
            if (
                sesion !== sesionRef.current
            ) {
                return;
            }

            const mensaje =
                error instanceof Error
                    ? error.message
                    : "No se pudo abrir el puerto";

            puertoRef.current = null;

            setConexion("error");

            setDetalle(
                `Error al abrir el puerto: ${mensaje}. ` +
                "Cierra el marcador u otro programa " +
                "que use COM4.",
            );

            anotarError(mensaje);
            return;
        }

        setInfoPuerto(
            puerto.getInfo?.() ?? null,
        );

        setIniciadoEn(
            new Date().toISOString(),
        );

        setConexion("conectado");

        setDetalle(
            "Puerto abierto. Capturando bytes " +
            "y ejecutando el decoder MONDO...",
        );

        /* ====================================
           CONTEXTO DE CADA LECTURA

           Los callbacks del decoder son
           síncronos. Asociamos la trama
           y la salida con el bloque leído.
           ==================================== */

        let contexto: {
            recibidoEn: string;
            inicioMs: number;
            bloque: BloqueBruto;

            tramaActual:
                TramaInterna | null;
        } | null = null;

        /* ====================================
           REGISTRAR UNA SALIDA
           ==================================== */

        function registrarResultado(
            tipo: TipoSalida,
            texto: string,
        ) {
            if (
                !contexto ||
                !contexto.tramaActual
            ) {
                return;
            }

            const marca =
                performance.now();

            const trama =
                contexto.tramaActual;

            trama.salidaTipo = tipo;
            trama.salida = texto;

            trama.resultadoEn =
                new Date().toISOString();

            trama.desdeLecturaMs =
                marca - contexto.inicioMs;

            trama.desdeTramaMs =
                marca - trama._reconocidaMs;

            const m =
                almacenRef.current.metricas;

            m.resultadoUltimo =
                trama.resultadoEn;

            m.latenciaUltimaMs =
                trama.desdeLecturaMs;

            m.maxLatenciaMs = Math.max(
                m.maxLatenciaMs,
                trama.desdeLecturaMs,
            );
        }

        /* ====================================
           DECODIFICADOR REAL
           ==================================== */

        const decodificador =
            new DecodificadorMondo({

            // TRAMA COMPLETA: 02 XX XX 03

            alTrama: (trama: TramaMondo) => {
                if (!contexto) return;

                const marca =
                    performance.now();

                const fecha =
                    new Date().toISOString();

                const tipo =
                    identificarRegistro(
                        trama.direccion,
                        trama.dato,
                    );

                const m =
                    almacenRef.current.metricas;

                m.tramas += 1;

                if (!tipo.conocido) {
                    m.otrasDirecciones += 1;
                }

                const entrada: TramaInterna = {
                    id: m.tramas,

                    recibidaEn:
                        contexto.recibidoEn,

                    reconocidaEn: fecha,

                    hexadecimal:
                        trama.hexadecimal,

                    direccion:
                        hex(trama.direccion),

                    dato:
                        hex(trama.dato),

                    registro:
                        tipo.nombre,

                    significado:
                        tipo.significado,

                    salidaTipo:
                        "sin-salida",

                    salida:
                        "Sin actualización emitida " +
                        "(sin cambio, incompleto " +
                        "o no reconocido)",

                    resultadoEn: null,

                    desdeLecturaMs:
                        marca - contexto.inicioMs,

                    desdeTramaMs: null,

                    _reconocidaMs: marca,
                };

                contexto.tramaActual =
                    entrada;

                contexto.bloque.tramasDetectadas +=
                    1;

                almacenRef.current.tramas.push(
                    entrada,
                );

                if (
                    almacenRef.current.tramas.length >
                    MAX_TRAMAS
                ) {
                    almacenRef.current.tramas.shift();

                    m.tramasDescartadas += 1;
                }
            },

            // RELOJ INTERPRETADO

            alTiempo: (
                lectura: LecturaTiempoMondo,
            ) => {
                almacenRef.current.reloj = {
                    ...lectura,
                };

                almacenRef.current.metricas.relojes +=
                    1;

                registrarResultado(
                    "tiempo",

                    `${lectura.texto} · ` +
                    `${lectura.formato} · ` +
                    `${lectura.grupo}`,
                );
            },

            // PERÍODO INTERPRETADO

            alPeriodo: (
                lectura: PeriodoMondo,
            ) => {
                almacenRef.current.periodo = {
                    ...lectura,
                };

                almacenRef.current.metricas.periodos +=
                    1;

                registrarResultado(
                    "periodo",

                    `${lectura.type} · ` +
                    `${lectura.number ?? "null"} · ` +
                    `raw ${hex(lectura.raw)}`,
                );
            },

            // DATOS ESPECIALES

            alTiempoEspecial: (
                lectura: TiempoEspecialMondo,
            ) => {
                almacenRef.current.metricas.especiales +=
                    1;

                registrarResultado(
                    "especial",
                    lectura.motivo,
                );
            },
        });

        decodificadorRef.current =
            decodificador;

        /* ====================================
           BUCLE DE LECTURA
           ==================================== */

        const tarea = async () => {
            try {
                const flujo =
                    puerto.readable;

                if (!flujo) {
                    throw new Error(
                        "Puerto abierto sin flujo " +
                        "de lectura (readable=null).",
                    );
                }

                const lector =
                    flujo.getReader();

                lectorRef.current = lector;

                try {
                    while (
                        sesion === sesionRef.current
                    ) {
                        // Medimos cuánto tarda
                        // la espera de read().

                        const esperaInicio =
                            performance.now();

                        const {
                            value,
                            done,
                        } = await lector.read();

                        const llegadaMs =
                            performance.now();

                        if (
                            done ||
                            sesion !== sesionRef.current
                        ) {
                            break;
                        }

                        if (!value?.length) {
                            continue;
                        }

                        const recibidoEn =
                            new Date().toISOString();

                        const almacen =
                            almacenRef.current;

                        const m =
                            almacen.metricas;

                        m.bloques += 1;
                        m.bytes += value.length;

                        m.recibidaPrimera ??=
                            recibidoEn;

                        m.recibidaUltima =
                            recibidoEn;

                        m.esperaUltimaMs =
                            llegadaMs - esperaInicio;

                        // Guardar bytes SIN alterar.

                        const bloque: BloqueBruto = {
                            id: m.bloques,

                            recibidoEn,

                            bytes: value.length,

                            hexadecimal:
                                Array.from(
                                    value,
                                    hex,
                                ).join(" "),

                            esperaLecturaMs:
                                llegadaMs - esperaInicio,

                            procesamientoMs: 0,

                            tramasDetectadas: 0,
                        };

                        almacen.bloques.push(
                            bloque,
                        );

                        if (
                            almacen.bloques.length >
                            MAX_BLOQUES
                        ) {
                            almacen.bloques.shift();

                            m.bloquesDescartados +=
                                1;
                        }

                        contexto = {
                            recibidoEn,

                            inicioMs: llegadaMs,

                            bloque,

                            tramaActual: null,
                        };

                        // Ejecutar el mismo decoder
                        // utilizado por el marcador.

                        const procesoInicio =
                            performance.now();

                        decodificador.recibir(value);

                        const duracion =
                            performance.now() -
                            procesoInicio;

                        bloque.procesamientoMs =
                            duracion;

                        m.procesoUltimoMs =
                            duracion;

                        m.procesoMaxMs = Math.max(
                            m.procesoMaxMs,
                            duracion,
                        );

                        contexto = null;

                        refrescar();
                    }

                } finally {
                    lectorRef.current = null;

                    lector.releaseLock();
                }

            } catch (error) {
                if (
                    sesion === sesionRef.current
                ) {
                    const mensaje =
                        error instanceof Error
                            ? error.message
                            : String(error);

                    anotarError(
                        `Lectura Web Serial: ${mensaje}`,
                    );

                    setDetalle(
                        `Error de lectura: ${mensaje}`,
                    );

                    setConexion("error");
                }

            } finally {
                try {
                    await puerto.close();
                } catch {
                    // Ya cerrado.
                }

                if (
                    puertoRef.current === puerto
                ) {
                    puertoRef.current = null;
                }

                if (
                    sesion === sesionRef.current
                ) {
                    setConexion((estado) =>
                        estado === "error"
                            ? estado
                            : "desconectado",
                    );

                    setDetalle((mensaje) =>
                        mensaje.startsWith("Error")
                            ? mensaje
                            : "Captura terminada. " +
                              "Puedes descargar el registro.",
                    );
                }
            }
        };

        lecturaRef.current = tarea();

    }, [
        conexion,
        anotarError,
        refrescar,
    ]);

    /* ========================================
       LIMPIAR CAPTURA
       ======================================== */

    const limpiar = () => {
        almacenRef.current =
            nuevoAlmacen();

        decodificadorRef.current?.reiniciar();

        if (
            refrescoRef.current !== null
        ) {
            clearTimeout(
                refrescoRef.current,
            );

            refrescoRef.current = null;
        }

        setVista(
            generarVista(
                almacenRef.current,
            ),
        );

        setIniciadoEn(
            conexion === "conectado"
                ? new Date().toISOString()
                : null,
        );
    };

    /* ========================================
       DESCARGAR INFORME
       ======================================== */

    const descargar = (
        tipo: "json" | "csv",
    ) => {
        const almacen =
            almacenRef.current;

        const fecha =
            new Date().toISOString();

        const limpio = (
            fila: TramaRegistro,
        ) => {
            const {
                _reconocidaMs: _omitida,
                ...resto
            } = fila as TramaRegistro & {
                _reconocidaMs?: number;
            };

            void _omitida;

            return resto;
        };

        let contenido: string;
        let mime: string;

        if (tipo === "json") {
            contenido = JSON.stringify(
                {
                    formato:
                        "CBA-MONDO-DIAGNOSTICO-v1",

                    generadoEn: fecha,

                    inicio: iniciadoEn,

                    metodo: "Web Serial API",

                    puerto:
                        "Seleccionado por el usuario; " +
                        "la API no revela el nombre " +
                        "COM de Windows",

                    parametrosSerie: {
                        baudRate: BAUD_RATE,
                        dataBits: 8,
                        stopBits: 1,
                        parity: "none",
                        flowControl: "none",
                    },

                    dispositivo: infoPuerto,

                    origen:
                        window.location.origin,

                    navegador:
                        navigator.userAgent,

                    conexion,
                    detalle,

                    notaTiempos:
                        "Desde la resolución de " +
                        "reader.read() hasta callback " +
                        "del decoder. No mide " +
                        "latencia eléctrica ni " +
                        "renderizado React.",

                    limites: {
                        maxTramas: MAX_TRAMAS,
                        maxBloques: MAX_BLOQUES,

                        descartes: {
                            tramas:
                                almacen.metricas
                                    .tramasDescartadas,

                            bloques:
                                almacen.metricas
                                    .bloquesDescartados,
                        },
                    },

                    metricas:
                        almacen.metricas,

                    decodificado: {
                        reloj: almacen.reloj,
                        periodo: almacen.periodo,
                    },

                    lecturasCrudas:
                        almacen.bloques,

                    tramas:
                        almacen.tramas.map(
                            limpio,
                        ),
                },
                null,
                2,
            );

            mime =
                "application/json;charset=utf-8";

        } else {
            const cabecera = [
                "n",
                "recibido_en",
                "trama_detectada_en",
                "resultado_en",
                "hexadecimal",
                "direccion",
                "dato",
                "registro",
                "significado",
                "tipo_salida",
                "salida_decoder",
                "desde_lectura_ms",
                "desde_trama_ms",
            ];

            const filas = almacen.tramas.map(
                (r) => [
                    r.id,
                    r.recibidaEn,
                    r.reconocidaEn,
                    r.resultadoEn ?? "",
                    r.hexadecimal,
                    r.direccion,
                    r.dato,
                    r.registro,
                    r.significado,
                    r.salidaTipo,
                    r.salida,
                    r.desdeLecturaMs ?? "",
                    r.desdeTramaMs ?? "",
                ],
            );

            const campo = (v: unknown) =>
                `"${String(v).replaceAll(
                    '"',
                    '""',
                )}"`;

            contenido = [
                cabecera,
                ...filas,
            ]
                .map((fila) =>
                    fila.map(campo).join(","),
                )
                .join("\r\n");

            mime =
                "text/csv;charset=utf-8";
        }

        const archivo = new Blob(
            [contenido],
            { type: mime },
        );

        const url =
            URL.createObjectURL(archivo);

        const enlace =
            document.createElement("a");

        enlace.href = url;

        enlace.download =
            "cba-mondo-diagnostico-" +
            fecha
                .replaceAll(":", "-")
                .replaceAll(".", "-") +
            `.${tipo}`;

        document.body.appendChild(
            enlace,
        );

        enlace.click();
        enlace.remove();

        window.setTimeout(
            () => URL.revokeObjectURL(url),
            1000,
        );
    };

    /* ========================================
       DATOS DE REPRESENTACIÓN
       ======================================== */

    const m = vista.metricas;

    const estadoColor =
        conexion === "conectado"
            ? "text-emerald-300"
            : conexion === "error"
                ? "text-rose-300"
                : "text-amber-200";

    const llavePuerto =
        infoPuerto?.usbVendorId !== undefined
            ? `VID 0x${hex(
                infoPuerto.usbVendorId,
            )} · PID ${
                infoPuerto.usbProductId !== undefined
                    ? `0x${hex(
                        infoPuerto.usbProductId,
                    )}`
                    : "no disponible"
            }`
            : infoPuerto?.bluetoothServiceClassId
                ? `Bluetooth: ${
                    infoPuerto.bluetoothServiceClassId
                }`
                : "Identificador no disponible";

    /* ========================================
       INTERFAZ
       ======================================== */

    return (
        <main className="min-h-dvh bg-[#061525] px-4 py-6 text-[#e8f5ff] sm:px-7 lg:px-10">
            <div className="mx-auto max-w-[1700px] space-y-5">

                {/* CABECERA */}

                <header className="flex flex-wrap items-start justify-between gap-4 border-b border-sky-200/10 pb-5">
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <span className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-mono text-xs font-semibold tracking-widest text-cyan-300">
                                CBA / TOOLS
                            </span>

                            <span className="font-mono text-xs text-sky-100/40">
                                SERIAL INSPECTOR v1.0
                            </span>
                        </div>

                        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                            Diagnóstico MONDO{" "}
                            <span className="font-mono font-light text-cyan-300">
                                / COM4
                            </span>
                        </h1>

                        <p className="mt-1 text-sm text-sky-100/55">
                            Monitor bruto y decodificado ·
                            recepción en tiempo real ·
                            mediciones · exportación
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            to="/control"
                            className={`${BOTON} border border-white/15 bg-white/5 text-white hover:bg-white/10`}
                        >
                            Volver al control
                        </Link>

                        <button
                            type="button"
                            onClick={() => descargar("csv")}
                            className={`${BOTON} border border-sky-300/20 bg-sky-300/10 text-sky-100 hover:bg-sky-300/20`}
                        >
                            Exportar CSV
                        </button>

                        <button
                            type="button"
                            onClick={() => descargar("json")}
                            className={`${BOTON} bg-cyan-300 text-[#062137] hover:bg-cyan-200`}
                        >
                            Descargar diagnóstico JSON
                        </button>
                    </div>
                </header>

                {/* =================================
                    FILA 1: CONEXIÓN Y TELEMETRÍA
                    ================================= */}

                <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">

                    {/* PUERTO */}

                    <div className={`${PANEL} xl:col-span-4`}>
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <h2 className="text-base font-bold">
                                01 · Puerto y conexión
                            </h2>

                            <span className={`font-mono text-xs font-bold ${estadoColor}`}>
                                ● {conexion.toUpperCase()}
                            </span>
                        </div>

                        <dl className="grid grid-cols-[minmax(110px,1fr)_1.2fr] gap-x-3 gap-y-2 text-sm">
                            <dt className="text-sky-100/50">
                                Método
                            </dt>
                            <dd className="text-right font-semibold">
                                Web Serial API
                            </dd>

                            <dt className="text-sky-100/50">
                                Puerto Windows
                            </dt>
                            <dd className="text-right font-mono">
                                Seleccionar COM4
                            </dd>

                            <dt className="text-sky-100/50">
                                Parámetros
                            </dt>
                            <dd className="text-right font-mono">
                                19200 · 8N1
                            </dd>

                            <dt className="text-sky-100/50">
                                Flujo
                            </dt>
                            <dd className="text-right font-mono">
                                Sin control
                            </dd>

                            <dt className="text-sky-100/50">
                                Identidad USB
                            </dt>
                            <dd className="break-all text-right font-mono text-xs">
                                {llavePuerto}
                            </dd>

                            <dt className="text-sky-100/50">
                                Inicio
                            </dt>
                            <dd className="text-right font-mono text-xs">
                                {hora(iniciadoEn)}
                            </dd>
                        </dl>

                        <div className="mt-4 rounded-lg border border-sky-100/10 bg-black/15 p-3 text-xs leading-relaxed text-sky-100/65">
                            {detalle}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {conexion === "conectado" ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        void cerrarPuerto()
                                    }
                                    className={`${BOTON} bg-rose-400/15 text-rose-200 hover:bg-rose-400/25`}
                                >
                                    Desconectar
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={
                                        conexion === "seleccionando" ||
                                        conexion === "abriendo"
                                    }
                                    onClick={() =>
                                        void conectar()
                                    }
                                    className={`${BOTON} bg-emerald-300 text-[#072435] hover:bg-emerald-200`}
                                >
                                    Conectar y capturar
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={limpiar}
                                className={`${BOTON} border border-white/10 bg-white/5 text-white/80 hover:bg-white/10`}
                            >
                                Limpiar registro
                            </button>
                        </div>

                        <p className="mt-3 text-xs text-amber-200/75">
                            El nombre COM4 no es legible
                            desde Web Serial: compruébalo
                            en el selector de Chrome. No
                            abras el marcador o MondoVideo
                            simultáneamente.
                        </p>
                    </div>

                    {/* MÉTRICAS */}

                    <div className={`${PANEL} xl:col-span-8`}>
                        <h2 className="mb-4 text-base font-bold">
                            02 · Telemetría de recepción
                        </h2>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
                            {[
                                [
                                    "Bytes recibidos",
                                    m.bytes.toLocaleString("es-ES"),
                                    "Cualquier dato bruto",
                                ],
                                [
                                    "Lecturas read()",
                                    m.bloques.toLocaleString("es-ES"),
                                    "Bloques de Web Serial",
                                ],
                                [
                                    "Tramas válidas",
                                    m.tramas.toLocaleString("es-ES"),
                                    "02 XX XX 03",
                                ],
                                [
                                    "Relojes emitidos",
                                    m.relojes.toLocaleString("es-ES"),
                                    "Actualizaciones",
                                ],
                                [
                                    "Períodos emitidos",
                                    m.periodos.toLocaleString("es-ES"),
                                    "Dirección AA",
                                ],
                                [
                                    "Otras direcciones",
                                    m.otrasDirecciones.toLocaleString("es-ES"),
                                    "Tramas sin mapa",
                                ],
                            ].map(
                                ([
                                    titulo,
                                    valor,
                                    descripcion,
                                ]) => (
                                    <div
                                        key={titulo}
                                        className="rounded-xl border border-sky-200/10 bg-[#112c45] p-3"
                                    >
                                        <p className={ETIQUETA}>
                                            {titulo}
                                        </p>

                                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-cyan-300">
                                            {valor}
                                        </p>

                                        <p className="mt-1 text-[11px] text-sky-100/40">
                                            {descripcion}
                                        </p>
                                    </div>
                                ),
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg bg-black/15 p-3">
                                <p className={ETIQUETA}>
                                    Primera lectura
                                </p>
                                <p className="mt-1 font-mono text-sm">
                                    {hora(m.recibidaPrimera)}
                                </p>
                            </div>

                            <div className="rounded-lg bg-black/15 p-3">
                                <p className={ETIQUETA}>
                                    Últimos bytes
                                </p>
                                <p className="mt-1 font-mono text-sm">
                                    {hora(m.recibidaUltima)}
                                </p>
                            </div>

                            <div className="rounded-lg bg-black/15 p-3">
                                <p className={ETIQUETA}>
                                    Último resultado
                                </p>
                                <p className="mt-1 font-mono text-sm">
                                    {hora(m.resultadoUltimo)}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* =================================
                    FILA 2: RAW Y DECODIFICACIÓN
                    ================================= */}

                <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">

                    {/* BYTES ORIGINALES */}

                    <div className={`${PANEL} min-w-0 xl:col-span-6`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-base font-bold">
                                03 · Bytes originales de COM4
                            </h2>

                            <span className="font-mono text-xs text-sky-200/50">
                                HEX · SIN MODIFICAR
                            </span>
                        </div>

                        <p className="mb-3 text-xs text-sky-100/50">
                            Cada fila representa exactamente
                            un bloque devuelto por reader.read();
                            puede contener media trama o varias.
                        </p>

                        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                            {vista.bloques.length === 0 ? (
                                <p className="rounded-lg bg-black/15 p-5 text-center text-sm text-sky-100/40">
                                    Aún no han llegado bytes.
                                </p>
                            ) : (
                                vista.bloques.map((b) => (
                                    <div
                                        key={b.id}
                                        className="rounded-lg border border-white/5 bg-[#091a2b] p-3"
                                    >
                                        <div className="mb-2 flex flex-wrap justify-between gap-2 text-[11px] text-sky-100/55">
                                            <span className="font-mono">
                                                #{b.id} ·{" "}
                                                {hora(b.recibidoEn)} ·{" "}
                                                {b.bytes} B
                                            </span>

                                            <span className="font-mono">
                                                read:{" "}
                                                {milisegundos(b.esperaLecturaMs)}
                                                {" · "}
                                                decode:{" "}
                                                {milisegundos(b.procesamientoMs)}
                                            </span>
                                        </div>

                                        <div className="break-all font-mono text-xs leading-6 tracking-wide text-emerald-200">
                                            {b.hexadecimal}
                                        </div>

                                        <p className="mt-1 text-[11px] text-sky-100/40">
                                            Tramas detectadas en este bloque:{" "}
                                            {b.tramasDetectadas}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RESULTADO DEL DECODER */}

                    <div className={`${PANEL} min-w-0 xl:col-span-6`}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="text-base font-bold">
                                04 · Tramas y resultado del decoder
                            </h2>

                            <span className="font-mono text-xs text-sky-200/50">
                                DECODER REAL
                            </span>
                        </div>

                        <p className="mb-3 text-xs text-sky-100/50">
                            «Sin actualización» no significa
                            trama errónea: el decoder puede
                            estar esperando otras posiciones
                            o haber recibido un valor repetido.
                        </p>

                        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                            {vista.tramas.length === 0 ? (
                                <p className="rounded-lg bg-black/15 p-5 text-center text-sm text-sky-100/40">
                                    Ninguna trama válida reconocida todavía.
                                </p>
                            ) : (
                                vista.tramas.map((t) => (
                                    <div
                                        key={t.id}
                                        className="rounded-lg border border-white/5 bg-[#091a2b] p-3"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-semibold text-cyan-200">
                                                #{t.id} · {t.hexadecimal}
                                            </span>

                                            <span
                                                className={`rounded-md px-2 py-0.5 text-[11px] ${
                                                    t.salidaTipo === "sin-salida"
                                                        ? "bg-white/10 text-sky-100/50"
                                                        : "bg-emerald-400/15 text-emerald-200"
                                                }`}
                                            >
                                                {t.salidaTipo === "sin-salida"
                                                    ? "Sin actualización"
                                                    : `Salida ${t.salidaTipo}`}
                                            </span>
                                        </div>

                                        <p className="mt-1 text-xs text-sky-200/60">
                                            {t.registro} ·{" "}
                                            {t.significado}
                                        </p>

                                        <p className="mt-1 break-words text-sm font-semibold">
                                            {t.salida}
                                        </p>

                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-sky-100/40">
                                            <span>
                                                Read:{" "}
                                                {hora(t.recibidaEn)}
                                            </span>

                                            <span>
                                                Decoder:{" "}
                                                {hora(
                                                    t.resultadoEn ??
                                                    t.reconocidaEn,
                                                )}
                                            </span>

                                            <span>
                                                Latencia:{" "}
                                                {milisegundos(
                                                    t.desdeLecturaMs,
                                                )}
                                            </span>

                                            <span>
                                                Trama → salida:{" "}
                                                {milisegundos(
                                                    t.desdeTramaMs,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                {/* =================================
                    FILA 3: ESTADOS Y RENDIMIENTO
                    ================================= */}

                <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                    {/* RELOJ INTERPRETADO */}

                    <div className={PANEL}>
                        <p className={ETIQUETA}>
                            05 · Último reloj interpretado
                        </p>

                        <p className="mt-3 font-mono text-5xl font-black tabular-nums text-cyan-300">
                            {vista.reloj?.texto ?? "--:--"}
                        </p>

                        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <dt className="text-sky-100/45">
                                Formato
                            </dt>
                            <dd className="text-right font-mono">
                                {vista.reloj?.formato ?? "—"}
                            </dd>

                            <dt className="text-sky-100/45">
                                Último minuto
                            </dt>
                            <dd className="text-right">
                                {vista.reloj
                                    ? vista.reloj.ultimoMinuto
                                        ? "Sí"
                                        : "No"
                                    : "—"}
                            </dd>

                            <dt className="text-sky-100/45">
                                Grupo de origen
                            </dt>
                            <dd className="text-right font-mono">
                                {vista.reloj?.grupo ?? "—"}
                            </dd>

                            <dt className="text-sky-100/45">
                                Decodificado
                            </dt>
                            <dd className="text-right font-mono">
                                {hora(
                                    vista.reloj
                                        ? new Date(
                                            vista.reloj.recibidoEn,
                                        ).toISOString()
                                        : null,
                                )}
                            </dd>
                        </dl>
                    </div>

                    {/* PERÍODO INTERPRETADO */}

                    <div className={PANEL}>
                        <p className={ETIQUETA}>
                            06 · Último período interpretado
                        </p>

                        <p className="mt-3 font-mono text-5xl font-black text-amber-200">
                            {vista.periodo
                                ? vista.periodo.type === "quarter"
                                    ? vista.periodo.number
                                    : vista.periodo.type === "overtime"
                                        ? "OT"
                                        : "∅"
                                : "—"}
                        </p>

                        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <dt className="text-sky-100/45">
                                Tipo
                            </dt>
                            <dd className="text-right font-mono">
                                {vista.periodo?.type ?? "—"}
                            </dd>

                            <dt className="text-sky-100/45">
                                Raw
                            </dt>
                            <dd className="text-right font-mono">
                                {vista.periodo
                                    ? `0x${hex(vista.periodo.raw)}`
                                    : "—"}
                            </dd>

                            <dt className="text-sky-100/45">
                                Número
                            </dt>
                            <dd className="text-right font-mono">
                                {vista.periodo?.number ?? "null"}
                            </dd>

                            <dt className="text-sky-100/45">
                                Decodificado
                            </dt>
                            <dd className="text-right font-mono">
                                {hora(
                                    vista.periodo
                                        ? new Date(
                                            vista.periodo.recibidoEn,
                                        ).toISOString()
                                        : null,
                                )}
                            </dd>
                        </dl>
                    </div>

                    {/* MÉTRICAS DE TIEMPO */}

                    <div className={PANEL}>
                        <p className={ETIQUETA}>
                            07 · Tiempos y rendimiento
                        </p>

                        <dl className="mt-4 space-y-3 text-sm">
                            {[
                                [
                                    "Espera del último read()",
                                    milisegundos(m.esperaUltimaMs),
                                ],
                                [
                                    "Proceso del último bloque",
                                    milisegundos(m.procesoUltimoMs),
                                ],
                                [
                                    "Máximo por bloque",
                                    milisegundos(m.procesoMaxMs),
                                ],
                                [
                                    "Lectura → resultado",
                                    milisegundos(m.latenciaUltimaMs),
                                ],
                                [
                                    "Latencia máxima",
                                    milisegundos(m.maxLatenciaMs),
                                ],
                                [
                                    "Eventos especiales",
                                    String(m.especiales),
                                ],
                            ].map(([clave, valor]) => (
                                <div
                                    key={clave}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <span className="text-sky-100/55">
                                        {clave}
                                    </span>

                                    <span className="font-mono font-semibold text-white">
                                        {valor}
                                    </span>
                                </div>
                            ))}
                        </dl>

                        <p className="mt-4 rounded-lg bg-black/15 p-3 text-xs leading-relaxed text-sky-100/55">
                            La espera de read() no es latencia de transmisión.
                            El tiempo de decodificación empieza al recibir
                            el bloque en JavaScript y termina al emitir
                            el callback. No incluye el renderizado de React.
                        </p>
                    </div>
                </section>

                {/* AVISOS */}

                {(
                    vista.ultimoError ||
                    m.tramasDescartadas > 0 ||
                    m.bloquesDescartados > 0
                ) && (
                    <section className={`${PANEL} border-amber-300/20`}>
                        <h2 className="font-semibold text-amber-200">
                            Avisos de captura
                        </h2>

                        {vista.ultimoError && (
                            <p className="mt-2 text-sm text-rose-200">
                                {vista.ultimoError}
                            </p>
                        )}

                        {(
                            m.tramasDescartadas > 0 ||
                            m.bloquesDescartados > 0
                        ) && (
                            <p className="mt-2 text-sm text-amber-200/80">
                                Se alcanzó el límite de memoria:
                                se han omitido {m.tramasDescartadas} tramas
                                y {m.bloquesDescartados} bloques antiguos
                                de la exportación. Los contadores globales
                                permanecen completos.
                            </p>
                        )}
                    </section>
                )}

                <footer className="pb-5 text-center text-xs text-sky-100/35">
                    Club Bàsquet Andratx ·
                    Diagnóstico técnico de solo lectura ·
                    Ningún dato se envía a un servidor
                </footer>
            </div>
        </main>
    );
}
