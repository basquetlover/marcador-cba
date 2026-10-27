
import { useContext, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { DisenoMarcador } from "../marcador/tipos";
import type { ModoReloj } from "../marcador/MarcadorProvider";

import usePageTitle from "../lib/usePageTitle";
import { DISENOS } from "../const/disenos";
import { CATEGORIAS } from "../const/categorias";
import {
    cargarDisenoSeleccionado,
    guardarDisenoSeleccionado,
} from "../lib/disenoStorage";
import { obtenerOCrearIdVinculacion } from "../lib/vinculacionCookie";
import { obtenerCalendarioConfiguradoFBIB } from "../lib/fbib";
import { obtenerEquiposClubFBIB } from "../lib/fbib/clubes";
import QrVinculacion from "../components/QrVinculacion";
import VisorMarcador from "../marcador/VisorMarcador";
import {
    DISENO_PROYECTO_SIMPLE,
    DISENOS_PROYECTO_POR_ID,
} from "../marcador/disenosProyecto";
import { MarcadorContext } from "../marcador/MarcadorProvider";
import { ID_RELOJ_PRINCIPAL } from "../marcador/datosIniciales";

/* ============================================
   MARCADOR CBA - PANEL DE CONTROL
   Proyección fija 832 x 520 (izquierda)
   Controles (derecha)
   ============================================ */

const MULTIMEDIA_PROYECTO = import.meta.glob<string>(
    "/src/assets/multimedia/**/*.{png,jpg,jpeg,webp,gif,svg,mp4,webm,ogg,ogv}",
    { eager: true, query: "?url", import: "default" },
);

const ARCHIVOS_PROYECTO = Object.entries(MULTIMEDIA_PROYECTO).map(
    ([ruta, url]) => ({
        nombre: ruta.split("/").pop() ?? ruta,
        url,
        tipo: /\.(mp4|webm|ogg|ogv)$/i.test(ruta)
            ? "video" as const
            : "imagen" as const,
    }),
);

const OPCIONES_RELOJ: {
    id: ModoReloj;
    nombre: string;
    descripcion: string;
}[] = [
    {
        id: "manual",
        nombre: "Manual",
        descripcion: "Sin conectar al equipo MONDO",
    },
    {
        id: "mondo",
        nombre: "MONDO",
        descripcion: "Leer COM4 desde el servidor local",
    },
    {
        id: "simulacion",
        nombre: "Simulación",
        descripcion: "Cuenta atrás de prueba",
    },
];

function validarTiempoManual(texto: string): string | null {
    const valor = texto.trim();

    const normal = /^(\d{1,2}):([0-5]\d)$/.exec(valor);

    if (normal) {
        return `${normal[1].padStart(2, "0")}:${normal[2]}`;
    }

    const ultimoMinuto = /^([0-5]\d)\.([0-9])$/.exec(valor);

    if (ultimoMinuto) {
        return valor;
    }

    return null;
}

export default function Control() {
    usePageTitle("Control Marcador");

    const marcador = useContext(MarcadorContext);

    if (!marcador) {
        throw new Error(
            "Control debe utilizarse dentro de MarcadorProvider.",
        );
    }

    const {
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
    } = marcador;

    const partido = datos.partidos[datos.partidoPrincipalId];
    const reloj = datos.relojes[ID_RELOJ_PRINCIPAL];

    // DISEÑOS

    const [selectedDiseno, setSelectedDiseno] = useState<string>(() => {
        const guardado = cargarDisenoSeleccionado();

        return guardado && DISENOS_PROYECTO_POR_ID[guardado]
            ? guardado
            : DISENO_PROYECTO_SIMPLE.id;
    });

    const [disenosEditados, setDisenosEditados] =
        useState<Record<string, DisenoMarcador>>({});

    const disenoActivo =
        disenosEditados[selectedDiseno] ??
        DISENOS_PROYECTO_POR_ID[selectedDiseno] ??
        DISENO_PROYECTO_SIMPLE;

    // MULTIMEDIA

    const inputArchivoRef = useRef<HTMLInputElement>(null);
    const urlsLocalesRef = useRef<Record<string, string>>({});

    const [rutaProyecto, setRutaProyecto] = useState("");
    const [errorMultimedia, setErrorMultimedia] =
        useState<string | null>(null);

    const [errorPantalla, setErrorPantalla] =
        useState<string | null>(null);

    const [errorReloj, setErrorReloj] =
        useState<string | null>(null);

    const [relojManual, setRelojManual] = useState("10:00");

    // ESTADOS GENERALES

    const [qrAbierto, setQrAbierto] = useState(false);

    const [vinculacionId] = useState(
        obtenerOCrearIdVinculacion,
    );

    const [estadoFBIB, setEstadoFBIB] = useState<
        "consultando" | "disponible" | "error"
    >("consultando");

    const piezaMultimedia = disenoActivo.capas.find(
        (pieza) => pieza.tipo === "multimedia",
    );

    const propiedadesMultimedia = piezaMultimedia?.propiedades ?? {};

    const bucleMultimedia =
        propiedadesMultimedia.bucle !== false;

    const fuenteMultimedia =
        typeof propiedadesMultimedia.src === "string"
            ? propiedadesMultimedia.src
            : "";

    const tipoMultimedia =
        propiedadesMultimedia.tipoArchivo === "video"
            ? "video"
            : propiedadesMultimedia.tipoArchivo === "imagen"
                ? "imagen"
                : "auto";

    // CATEGORÍA

    const categoriaSeleccionada = CATEGORIAS.find(
        (categoria) => categoria.id === partido?.categoriaId,
    );

    const reglas = categoriaSeleccionada?.reglamento;

    // CONSULTAS FBIB

    // useEffect(() => {
    //     let activo = true;
    //     const mes = new Date().getMonth();

    //     Promise.allSettled([
    //         obtenerCalendarioConfiguradoFBIB(mes),
    //         obtenerEquiposClubFBIB(),
    //     ]).then((resultados) => {
    //         if (!activo) return;

    //         setEstadoFBIB(
    //             resultados.every(
    //                 (resultado) => resultado.status === "fulfilled",
    //             )
    //                 ? "disponible"
    //                 : "error",
    //         );
    //     });

    //     return () => {
    //         activo = false;
    //     };
    // }, []);

    // // LIBERAR ARCHIVOS TEMPORALES AL DESMONTAR

    // useEffect(() => {
    //     const urlsLocales = urlsLocalesRef.current;

    //     return () => {
    //         Object.values(urlsLocales).forEach(
    //             (url) => URL.revokeObjectURL(url),
    //         );
    //     };
    // }, []);

    // ACTUALIZAR MULTIMEDIA

    function actualizarMultimedia(
        cambios: Record<string, string | number | boolean | null>,
    ) {
        setDisenosEditados((actuales) => {
            const base =
                actuales[selectedDiseno] ??
                DISENOS_PROYECTO_POR_ID[selectedDiseno] ??
                DISENO_PROYECTO_SIMPLE;

            return {
                ...actuales,

                [selectedDiseno]: {
                    ...base,

                    capas: base.capas.map((pieza) =>
                        pieza.tipo === "multimedia"
                            ? {
                                ...pieza,

                                propiedades: {
                                    ...pieza.propiedades,
                                    ...cambios,
                                },
                            }
                            : pieza,
                    ),
                },
            };
        });
    }

    function liberarArchivoLocal() {
        const anterior = urlsLocalesRef.current[selectedDiseno];

        if (anterior) {
            URL.revokeObjectURL(anterior);
            delete urlsLocalesRef.current[selectedDiseno];
        }
    }

    function seleccionarArchivoPC(
        evento: ChangeEvent<HTMLInputElement>,
    ) {
        const archivo = evento.target.files?.[0];

        if (!archivo) return;

        const esVideo = archivo.type.startsWith("video/");
        const esImagen = archivo.type.startsWith("image/");

        if (!esVideo && !esImagen) {
            setErrorMultimedia(
                "Selecciona una imagen o vídeo válido.",
            );

            evento.target.value = "";
            return;
        }

        liberarArchivoLocal();

        const url = URL.createObjectURL(archivo);

        urlsLocalesRef.current[selectedDiseno] = url;

        actualizarMultimedia({
            src: url,
            tipoArchivo: esVideo ? "video" : "imagen",
        });

        setErrorMultimedia(null);
        evento.target.value = "";
    }

    function seleccionarArchivoProyecto(
        url: string,
        tipo: "imagen" | "video",
    ) {
        liberarArchivoLocal();

        actualizarMultimedia({
            src: url,
            tipoArchivo: tipo,
        });

        setErrorMultimedia(null);
    }

    // RELOJ MANUAL

    function aplicarTiempoManual() {
        const valor = validarTiempoManual(relojManual);

        if (!valor) {
            setErrorReloj(
                "Introduce MM:SS (08:34) o SS.d (59.3).",
            );
            return;
        }

        setErrorReloj(null);

        cambiarModoReloj("manual");

        actualizarReloj(
            valor,
            ID_RELOJ_PRINCIPAL,
            "manual",
        );
    }

    // SELECCIONAR FUENTE DEL RELOJ

    function seleccionarModo(modo: ModoReloj) {
        setErrorReloj(null);

        if (modo === "mondo") {
            activarRelojMondo();
        } else if (modo === "simulacion") {
            reiniciarSimulacion();
        } else {
            cambiarModoReloj("manual");
        }
    }

    // ESTADO VISUAL MONDO

    const mondoConectado =
        estadoMondo.websocket === "conectado" &&
        estadoMondo.puerto === "conectado";

    const etiquetaEstado =
        modoReloj !== "mondo"
            ? "Desactivado"
            : mondoConectado
                ? "COM4 conectado"
                : estadoMondo.websocket === "conectando"
                    ? "Conectando..."
                    : estadoMondo.websocket === "conectado"
                        ? "Servidor activo · COM4 sin conexión"
                        : "Sin conexión";

    return (
        <>
            {/* OCULTAR BOTONES DEL VISOR FUERA DE LA CAPTURA */}

            <style>
                {`
                    #visor-proyeccion > div >
                    div:not([aria-label^="Proyección del marcador:"]) {
                        display: none !important;
                    }
                `}
            </style>

            {/* ====================================
                COLUMNA IZQUIERDA
                MARCADOR 832 x 520
                ==================================== */}

            <div id="visor-proyeccion">
                <VisorMarcador
                    diseno={disenoActivo}
                    datos={datos}
                />
            </div>

            {/* ====================================
                COLUMNA DERECHA
                CONTROLES
                ==================================== */}

            <main
                className="min-h-dvh bg-brand-blue-deep text-white"
                style={{
                    marginLeft: 832,
                    minWidth: 380,
                }}
            >
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-5">

                    {/* CABECERA */}

                    <header className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold uppercase text-primary">
                                Control del marcador
                            </h1>

                            <p className="text-sm text-white/60">
                                C.B. Andratx · Configuración
                            </p>
                        </div>

                        <span className="rounded-lg bg-brand-blue-dark px-3 py-2 text-xs font-semibold">
                            832 × 520
                        </span>
                    </header>

                    {/* PANTALLA COMPLETA */}

                    <button
                        type="button"
                        onClick={() => {
                            setErrorPantalla(null);

                            const visor =
                                document.querySelector<HTMLDivElement>(
                                    '#visor-proyeccion [aria-label^="Proyección del marcador:"]',
                                );

                            if (!visor) {
                                setErrorPantalla(
                                    "No se encontró el visor.",
                                );
                                return;
                            }

                            void visor.requestFullscreen().catch(() => {
                                setErrorPantalla(
                                    "No se pudo activar la pantalla completa.",
                                );
                            });
                        }}
                        className="min-h-12 cursor-pointer rounded-xl bg-primary px-5 py-3 font-bold text-brand-blue-deep hover:bg-brand-yellow-bright"
                    >
                        Pantalla completa
                    </button>

                    {errorPantalla && (
                        <p role="alert" className="text-sm text-red-300">
                            {errorPantalla}
                        </p>
                    )}

                    {/* ====================================
                        RELOJ MANUAL / MONDO / SIMULACIÓN
                        ==================================== */}

                    <section className="rounded-2xl bg-brand-blue-dark p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-xl font-bold uppercase text-primary">
                                Reloj de partido
                            </h2>

                            <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    modoReloj === "mondo" && mondoConectado
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : modoReloj === "mondo"
                                            ? "bg-amber-500/20 text-amber-200"
                                            : "bg-white/10 text-white/80"
                                }`}
                            >
                                {etiquetaEstado}
                            </span>
                        </div>

                        <p className="mt-1 text-sm text-white/60">
                            Selecciona la fuente del tiempo para este navegador.
                        </p>

                        {/* SELECTOR DE MODO */}

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {OPCIONES_RELOJ.map((opcion) => (
                                <button
                                    key={opcion.id}
                                    type="button"
                                    onClick={() => seleccionarModo(opcion.id)}
                                    aria-pressed={modoReloj === opcion.id}
                                    className={`min-h-16 cursor-pointer rounded-xl border-2 p-3 text-left transition-colors ${
                                        modoReloj === opcion.id
                                            ? "border-primary bg-brand-blue-deep"
                                            : "border-white/15 bg-brand-blue-deep/40 hover:border-white/50"
                                    }`}
                                >
                                    <span
                                        className={`block text-sm font-bold ${
                                            modoReloj === opcion.id
                                                ? "text-primary"
                                                : "text-white"
                                        }`}
                                    >
                                        {opcion.nombre}
                                    </span>

                                    <span className="mt-1 block text-xs text-white/60">
                                        {opcion.descripcion}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* TIEMPO ACTUAL */}

                        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-brand-blue-deep p-4">
                            <div>
                                <p className="text-xs font-semibold uppercase text-white/50">
                                    Tiempo mostrado
                                </p>

                                <p className="mt-1 text-xs text-white/60">
                                    {modoReloj === "mondo"
                                        ? "Fuente: consola MONDO"
                                        : modoReloj === "simulacion"
                                            ? "Fuente: simulación local"
                                            : "Fuente: entrada manual"}
                                </p>
                            </div>

                            <span className="bebas-neue text-4xl tabular-nums text-primary">
                                {reloj?.texto ?? "--:--"}
                            </span>
                        </div>

                        {/* MODO MONDO */}

                        {modoReloj === "mondo" && (
                            <div className="mt-3 rounded-xl bg-brand-blue-deep p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold">
                                        Conexión MONDO
                                    </p>

                                    <span className="text-xs text-white/60">
                                        COM4 · 19200 · 8N1
                                    </span>
                                </div>

                                <p
                                    className="mt-2 text-sm text-white/70"
                                    role="status"
                                >
                                    {estadoMondo.detalle}
                                </p>

                                {estadoMondo.ultimaLecturaEn !== null && (
                                    <p className="mt-2 text-xs text-white/50">
                                        Última recepción:{" "}
                                        {new Date(
                                            estadoMondo.ultimaLecturaEn,
                                        ).toLocaleTimeString("es-ES")}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    onClick={reconectarMondo}
                                    className="mt-3 min-h-11 w-full cursor-pointer rounded-lg bg-primary px-4 py-2 font-bold text-brand-blue-deep hover:bg-brand-yellow-bright"
                                >
                                    Reconectar al servidor MONDO
                                </button>

                                <p className="mt-2 text-xs text-white/50">
                                    Este botón reconecta React. No inicia
                                    programas de Windows ni abre COM4 por sí mismo.
                                </p>
                            </div>
                        )}

                        {/* MODO SIMULACIÓN */}

                        {modoReloj === "simulacion" && (
                            <div className="mt-3 rounded-xl bg-brand-blue-deep p-4">
                                <p className="text-sm text-white/70">
                                    Cuenta atrás de prueba desde 08:34.
                                    Al entrar en el último minuto cambia
                                    automáticamente al formato SS.d.
                                </p>

                                <button
                                    type="button"
                                    onClick={reiniciarSimulacion}
                                    className="mt-3 min-h-11 w-full cursor-pointer rounded-lg bg-primary px-4 py-2 font-bold text-brand-blue-deep hover:bg-brand-yellow-bright"
                                >
                                    Reiniciar simulación
                                </button>
                            </div>
                        )}

                        {/* MODO MANUAL */}

                        {modoReloj === "manual" && (
                            <div className="mt-3 rounded-xl bg-brand-blue-deep p-4">
                                <label
                                    htmlFor="tiempo-manual"
                                    className="block text-sm font-semibold"
                                >
                                    Introducir tiempo manual
                                </label>

                                <div className="mt-2 flex gap-2">
                                    <input
                                        id="tiempo-manual"
                                        type="text"
                                        inputMode="text"
                                        value={relojManual}
                                        onChange={(evento) =>
                                            setRelojManual(evento.target.value)
                                        }
                                        onKeyDown={(evento) => {
                                            if (evento.key === "Enter") {
                                                aplicarTiempoManual();
                                            }
                                        }}
                                        placeholder="08:34 o 59.3"
                                        aria-invalid={Boolean(errorReloj)}
                                        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-brand-blue-dark px-3 py-2 text-white focus:border-primary focus:outline-none"
                                    />

                                    <button
                                        type="button"
                                        onClick={aplicarTiempoManual}
                                        className="min-h-11 cursor-pointer rounded-lg bg-primary px-4 font-bold text-brand-blue-deep hover:bg-brand-yellow-bright"
                                    >
                                        Aplicar
                                    </button>
                                </div>

                                <p className="mt-2 text-xs text-white/50">
                                    Formatos admitidos: 08:34 y 59.3.
                                </p>

                                {errorReloj && (
                                    <p
                                        role="alert"
                                        className="mt-2 text-sm text-red-300"
                                    >
                                        {errorReloj}
                                    </p>
                                )}
                            </div>
                        )}
                    </section>

                    {/* ====================================
                        MULTIMEDIA
                        ==================================== */}

                    <section className="rounded-2xl bg-brand-blue-dark p-5">
                        <h2 className="text-xl font-bold uppercase text-primary">
                            Reproductor multimedia
                        </h2>

                        <p className="mt-1 text-sm text-white/60">
                            Zona VideoReady · 460 × 268 px
                        </p>

                        <div className="mt-4 rounded-lg bg-brand-blue-deep p-3">
                            <p className="text-xs font-semibold uppercase text-white/50">
                                Contenido seleccionado
                            </p>

                            <p className="mt-1 break-all text-sm">
                                {fuenteMultimedia
                                    ? fuenteMultimedia.startsWith("blob:")
                                        ? "Archivo seleccionado del PC"
                                        : fuenteMultimedia
                                    : "Diseño predeterminado CBA"}
                            </p>
                        </div>

                        <input
                            ref={inputArchivoRef}
                            type="file"
                            accept="image/*,video/mp4,video/webm,video/ogg"
                            className="hidden"
                            onChange={seleccionarArchivoPC}
                        />

                        <button
                            type="button"
                            disabled={!piezaMultimedia}
                            onClick={() => inputArchivoRef.current?.click()}
                            className="mt-4 min-h-11 w-full cursor-pointer rounded-lg bg-primary px-4 py-2 font-bold text-brand-blue-deep hover:bg-brand-yellow-bright disabled:opacity-50"
                        >
                            Seleccionar imagen o vídeo del PC
                        </button>

                        {/* ARCHIVOS INCLUIDOS */}

                        <label
                            htmlFor="archivo-proyecto"
                            className="mt-5 block text-sm font-semibold"
                        >
                            Archivos del proyecto
                        </label>

                        <select
                            id="archivo-proyecto"
                            value=""
                            disabled={
                                !piezaMultimedia ||
                                ARCHIVOS_PROYECTO.length === 0
                            }
                            onChange={(evento) => {
                                const archivo = ARCHIVOS_PROYECTO.find(
                                    (item) => item.url === evento.target.value,
                                );

                                if (archivo) {
                                    seleccionarArchivoProyecto(
                                        archivo.url,
                                        archivo.tipo,
                                    );
                                }
                            }}
                            className="mt-2 w-full rounded-lg border border-white/20 bg-brand-blue-deep px-3 py-3 text-white disabled:opacity-50"
                        >
                            <option value="">
                                {ARCHIVOS_PROYECTO.length
                                    ? "Seleccionar archivo"
                                    : "No hay archivos empaquetados"}
                            </option>

                            {ARCHIVOS_PROYECTO.map((archivo) => (
                                <option
                                    key={archivo.url}
                                    value={archivo.url}
                                >
                                    {archivo.nombre}
                                </option>
                            ))}
                        </select>

                        {/* RUTA MANUAL */}

                        <label
                            htmlFor="ruta-multimedia"
                            className="mt-4 block text-sm font-semibold"
                        >
                            Ruta de archivo del proyecto
                        </label>

                        <div className="mt-2 flex gap-2">
                            <input
                                id="ruta-multimedia"
                                type="text"
                                value={rutaProyecto}
                                onChange={(evento) =>
                                    setRutaProyecto(evento.target.value)
                                }
                                placeholder="/marcador/publicidad.mp4"
                                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-brand-blue-deep px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                            />

                            <button
                                type="button"
                                disabled={!piezaMultimedia}
                                onClick={() => {
                                    const ruta = rutaProyecto.trim();

                                    if (
                                        !ruta.startsWith("/") ||
                                        ruta.startsWith("//") ||
                                        !/\.(png|jpe?g|webp|gif|svg|mp4|webm|ogg|ogv)$/i.test(
                                            ruta,
                                        )
                                    ) {
                                        setErrorMultimedia(
                                            "Introduce una ruta local válida del proyecto.",
                                        );
                                        return;
                                    }

                                    seleccionarArchivoProyecto(
                                        ruta,
                                        /\.(mp4|webm|ogg|ogv)$/i.test(ruta)
                                            ? "video"
                                            : "imagen",
                                    );
                                }}
                                className="min-h-11 cursor-pointer rounded-lg bg-primary px-4 font-bold text-brand-blue-deep disabled:opacity-50"
                            >
                                Aplicar
                            </button>
                        </div>

                        <p className="mt-2 text-xs text-white/50">
                            Puedes utilizar archivos de public con rutas
                            como /marcador/publicidad.mp4.
                        </p>

                        {/* BUCLE */}

                        <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-brand-blue-deep p-4">
                            <span>
                                <span className="block font-semibold">
                                    Reproducción en bucle
                                </span>

                                <span className="block text-xs text-white/60">
                                    Repetir el vídeo al terminar
                                </span>
                            </span>

                            <input
                                type="checkbox"
                                checked={bucleMultimedia}
                                disabled={!piezaMultimedia}
                                onChange={(evento) =>
                                    actualizarMultimedia({
                                        bucle: evento.target.checked,
                                    })
                                }
                                className="size-5 cursor-pointer accent-yellow-400"
                            />
                        </label>

                        {/* RESTABLECER */}

                        <button
                            type="button"
                            disabled={!piezaMultimedia}
                            onClick={() => {
                                liberarArchivoLocal();

                                actualizarMultimedia({
                                    src: "",
                                    tipoArchivo: "auto",
                                    bucle: true,
                                });

                                setRutaProyecto("");
                                setErrorMultimedia(null);
                            }}
                            className="mt-3 w-full cursor-pointer rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                        >
                            Restablecer contenido predeterminado
                        </button>

                        {errorMultimedia && (
                            <p
                                role="alert"
                                className="mt-3 text-sm text-red-300"
                            >
                                {errorMultimedia}
                            </p>
                        )}

                        <p className="mt-3 text-xs text-white/50">
                            Tipo de contenido: {tipoMultimedia}.
                            Los vídeos se reproducen sin sonido.
                        </p>
                    </section>

                    {/* ====================================
                        CONTROL DEL PARTIDO
                        ==================================== */}

                    <section className="rounded-2xl bg-brand-blue-dark p-5">
                        <h2 className="text-xl font-bold uppercase text-primary">
                            Control del partido
                        </h2>

                        <div className="mt-4 grid grid-cols-1 gap-3 2xl:grid-cols-2">
                            {(["local", "visitante"] as const).map(
                                (lado) => (
                                    <div
                                        key={lado}
                                        className="rounded-xl bg-brand-blue-deep p-4"
                                    >
                                        <h3 className="text-center font-bold uppercase">
                                            {lado === "local"
                                                ? "Local"
                                                : "Visitante"}
                                        </h3>

                                        <p className="mt-1 truncate text-center text-xs text-white/60">
                                            {partido?.[lado].nombre ?? "-"}
                                        </p>

                                        <p className="bebas-neue mt-3 text-center text-6xl text-primary">
                                            {partido?.[lado].puntos ?? 0}
                                        </p>

                                        {/* PUNTOS */}

                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                            {([-1, 1, 2] as const).map(
                                                (incremento) => (
                                                    <button
                                                        key={incremento}
                                                        type="button"
                                                        disabled={!partido}
                                                        onClick={() => {
                                                            if (!partido) return;

                                                            actualizarEquipo(
                                                                lado,
                                                                {
                                                                    puntos: Math.max(
                                                                        0,
                                                                        partido[lado].puntos +
                                                                            incremento,
                                                                    ),
                                                                },
                                                            );
                                                        }}
                                                        className="min-h-11 cursor-pointer rounded-lg bg-primary font-bold text-brand-blue-deep hover:bg-brand-yellow-bright disabled:opacity-50"
                                                    >
                                                        {incremento > 0
                                                            ? `+${incremento}`
                                                            : incremento}
                                                    </button>
                                                ),
                                            )}
                                        </div>

                                        {/* FALTAS Y TIEMPOS MUERTOS */}

                                        {([
                                            {
                                                clave: "faltas",
                                                titulo: "Faltas",
                                            },
                                            {
                                                clave: "tiemposMuertos",
                                                titulo: "T. muertos usados",
                                            },
                                        ] as const).map((campo) => (
                                            <div
                                                key={campo.clave}
                                                className="mt-4 flex items-center justify-between gap-2"
                                            >
                                                <span className="text-sm text-white/75">
                                                    {campo.titulo}
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    {([-1, 1] as const).map(
                                                        (incremento) => (
                                                            <button
                                                                key={incremento}
                                                                type="button"
                                                                disabled={!partido}
                                                                onClick={() => {
                                                                    if (!partido) return;

                                                                    actualizarEquipo(
                                                                        lado,
                                                                        {
                                                                            [campo.clave]: Math.max(
                                                                                0,
                                                                                partido[lado][campo.clave] +
                                                                                    incremento,
                                                                            ),
                                                                        },
                                                                    );
                                                                }}
                                                                className="flex size-8 cursor-pointer items-center justify-center rounded bg-white/10 font-bold hover:bg-white/20 disabled:opacity-50"
                                                            >
                                                                {incremento > 0
                                                                    ? "+"
                                                                    : "−"}
                                                            </button>
                                                        ),
                                                    )}

                                                    <span className="min-w-5 text-center font-bold">
                                                        {partido?.[lado][campo.clave] ?? 0}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ),
                            )}
                        </div>

                        {/* PERIODO */}

                        <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-blue-deep p-4">
                            <div>
                                <p className="text-sm text-white/60">
                                    Periodo
                                </p>

                                <p className="bebas-neue text-4xl text-primary">
                                    {partido?.periodo ?? 1}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                {([-1, 1] as const).map(
                                    (incremento) => (
                                        <button
                                            key={incremento}
                                            type="button"
                                            disabled={!partido}
                                            onClick={() => {
                                                if (partido) {
                                                    actualizarPeriodo(
                                                        partido.periodo +
                                                            incremento,
                                                    );
                                                }
                                            }}
                                            className="min-h-11 min-w-12 cursor-pointer rounded-lg bg-primary text-xl font-bold text-brand-blue-deep hover:bg-brand-yellow-bright disabled:opacity-50"
                                        >
                                            {incremento > 0 ? "+" : "−"}
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ====================================
                        DISEÑO
                        ==================================== */}

                    <section className="rounded-2xl bg-brand-blue-dark p-5">
                        <h2 className="text-xl font-bold uppercase text-primary">
                            Diseño de proyección
                        </h2>

                        <div className="mt-4 grid grid-cols-1 gap-3 2xl:grid-cols-2">
                            {DISENOS.map((diseno) => (
                                <button
                                    key={diseno.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedDiseno(diseno.id);

                                        guardarDisenoSeleccionado(
                                            diseno.id,
                                        );
                                    }}
                                    className={`cursor-pointer rounded-xl border-2 p-3 text-left ${
                                        selectedDiseno === diseno.id
                                            ? "border-primary bg-brand-blue-deep"
                                            : "border-white/20 hover:border-white/60"
                                    }`}
                                >
                                    <img
                                        src={`/miniaturas/${diseno.miniatura}.png`}
                                        alt={diseno.nombre}
                                        className="aspect-video w-full rounded-lg object-contain"
                                    />

                                    <p className="mt-2 font-bold">
                                        {diseno.nombre}
                                    </p>

                                    {selectedDiseno === diseno.id && (
                                        <span className="text-xs font-bold text-primary">
                                            Activo
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* ====================================
                        REGLAS Y CATEGORÍA
                        ==================================== */}

                    <section className="rounded-2xl bg-brand-blue-dark p-5">
                        <h2 className="text-xl font-bold uppercase text-primary">
                            Reglas y tiempos
                        </h2>

                        <label
                            htmlFor="categoria"
                            className="mt-4 block text-sm text-white/70"
                        >
                            Categoría
                        </label>

                        <select
                            id="categoria"
                            value={partido?.categoriaId ?? ""}
                            onChange={(evento) =>
                                actualizarCategoria(
                                    evento.target.value || null,
                                )
                            }
                            className="mt-2 w-full rounded-lg bg-brand-blue-deep px-3 py-3 text-white"
                        >
                            <option value="">
                                Seleccionar categoría
                            </option>

                            {CATEGORIAS.map((categoria) => (
                                <option
                                    key={categoria.id}
                                    value={categoria.id}
                                >
                                    {categoria.nombre}
                                </option>
                            ))}
                        </select>

                        {reglas && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {[
                                    {
                                        titulo: "Periodos",
                                        valor: reglas.periodos.cantidad,
                                    },
                                    {
                                        titulo: "Duración",
                                        valor: `${reglas.periodos.duracion / 60} min`,
                                    },
                                    {
                                        titulo: "Prórroga",
                                        valor: reglas.prorroga.permitida
                                            ? "Habilitada"
                                            : "Deshabilitada",
                                    },
                                    {
                                        titulo: "Duración prórroga",
                                        valor: `${reglas.prorroga.duracion / 60} min`,
                                    },
                                ].map((info) => (
                                    <div
                                        key={info.titulo}
                                        className="rounded-lg bg-brand-blue-deep p-3"
                                    >
                                        <p className="text-xs text-white/60">
                                            {info.titulo}
                                        </p>

                                        <p className="text-xl font-bold">
                                            {info.valor}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* ====================================
                        DATOS DE LOS EQUIPOS
                        ==================================== */}

                    <section className="rounded-2xl bg-brand-blue-dark p-5">
                        <h2 className="text-xl font-bold uppercase text-primary">
                            Datos de los equipos
                        </h2>

                        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-2">
                            {(["local", "visitante"] as const).map(
                                (lado) => (
                                    <div
                                        key={lado}
                                        className="rounded-xl bg-brand-blue-deep p-4"
                                    >
                                        <h3 className="font-bold uppercase text-primary">
                                            {lado === "local"
                                                ? "Equipo local"
                                                : "Equipo visitante"}
                                        </h3>

                                        <label
                                            htmlFor={`nombre-${lado}`}
                                            className="mt-3 block text-sm text-white/70"
                                        >
                                            Nombre
                                        </label>

                                        <input
                                            id={`nombre-${lado}`}
                                            type="text"
                                            value={partido?.[lado].nombre ?? ""}
                                            onChange={(evento) =>
                                                actualizarEquipo(lado, {
                                                    nombre: evento.target.value,
                                                    fuenteNombre: "manual",
                                                })
                                            }
                                            className="mt-2 w-full rounded-lg bg-brand-blue-dark px-3 py-2 text-white"
                                        />

                                        <label
                                            htmlFor={`escudo-${lado}`}
                                            className="mt-3 block text-sm text-white/70"
                                        >
                                            Escudo
                                        </label>

                                        <input
                                            id={`escudo-${lado}`}
                                            type="text"
                                            value={partido?.[lado].escudo ?? ""}
                                            onChange={(evento) =>
                                                actualizarEquipo(lado, {
                                                    escudo:
                                                        evento.target.value || null,
                                                    fuenteEscudo: "manual",
                                                })
                                            }
                                            placeholder="/marcador/escudo.png"
                                            className="mt-2 w-full rounded-lg bg-brand-blue-dark px-3 py-2 text-white"
                                        />
                                    </div>
                                ),
                            )}
                        </div>
                    </section>

                    {/* ====================================
                        QR Y FBIB
                        ==================================== */}

                    <section className="rounded-2xl bg-brand-blue-dark p-5">
                        <h2 className="text-xl font-bold uppercase text-primary">
                            Sincronización
                        </h2>

                        <p className="mt-1 text-xs text-white/60">
                            Código de identificación del controlador.
                        </p>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-blue-deep p-4">
                            <div>
                                <p className="text-xs uppercase text-white/50">
                                    Código
                                </p>

                                <p className="bebas-neue text-4xl">
                                    {vinculacionId}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setQrAbierto((actual) => !actual)
                                }
                                aria-label="Mostrar código QR de vinculación"
                                className="cursor-pointer rounded-lg bg-white p-2"
                            >
                                <QrVinculacion
                                    partidoId={vinculacionId}
                                    size={80}
                                />
                            </button>
                        </div>

                        {qrAbierto && (
                            <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-brand-blue-deep p-4">
                                <div className="rounded-lg bg-white p-3">
                                    <QrVinculacion
                                        partidoId={vinculacionId}
                                        size={230}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setQrAbierto(false)}
                                    className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-sm font-bold"
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}

                        <div className="mt-4 rounded-xl bg-brand-blue-deep p-3">
                            <p className="text-sm font-semibold">
                                Consultas FBIB
                            </p>

                            <p className="mt-1 text-xs text-white/60">
                                {estadoFBIB === "consultando"
                                    ? "Consultando..."
                                    : estadoFBIB === "disponible"
                                        ? "Consulta correcta"
                                        : "No disponible"}
                            </p>
                        </div>

                        <p className="mt-3 text-xs text-white/50">
                            La sincronización entre dispositivos todavía
                            no está implementada.
                        </p>
                    </section>

                    <footer className="pb-4 text-center text-xs text-white/40">
                        C.B. Andratx · Sistema de marcador
                    </footer>
                </div>
            </main>
        </>
    );
}
