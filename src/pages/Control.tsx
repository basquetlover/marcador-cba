
import {
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

import type {
    ChangeEvent,
} from "react";

import type {
    DisenoMarcador,
} from "../marcador/tipos";

import usePageTitle from "../lib/usePageTitle";

import { DISENOS } from "../const/disenos";
import { CATEGORIAS } from "../const/categorias";

import {
    cargarDisenoSeleccionado,
    guardarDisenoSeleccionado,
} from "../lib/disenoStorage";

import {
    obtenerOCrearIdVinculacion,
} from "../lib/vinculacionCookie";

import {
    obtenerCalendarioConfiguradoFBIB,
} from "../lib/fbib";

import {
    obtenerEquiposClubFBIB,
} from "../lib/fbib/clubes";

import QrVinculacion from "../components/QrVinculacion";

import VisorMarcador from "../marcador/VisorMarcador";

import {
    DISENO_PROYECTO_SIMPLE,
    DISENOS_PROYECTO_POR_ID,
} from "../marcador/disenosProyecto";

import {
    MarcadorContext,
} from "../marcador/MarcadorProvider";

import {
    ID_RELOJ_PRINCIPAL,
} from "../marcador/datosIniciales";


/* ============================================
   MARCADOR CBA
   Página principal de control
   ============================================ */


// 1. ARCHIVOS MULTIMEDIA DEL PROYECTO
//
// Los archivos incluidos en:
// src/assets/multimedia/
//
// aparecerán automáticamente en el selector
// al compilar el proyecto.

const MULTIMEDIA_PROYECTO = import.meta.glob<string>(
    "/src/assets/multimedia/**/*.{png,jpg,jpeg,webp,gif,svg,mp4,webm,ogg,ogv}",
    {
        eager: true,
        query: "?url",
        import: "default",
    },
);

const ARCHIVOS_PROYECTO = Object.entries(
    MULTIMEDIA_PROYECTO,
).map(([nombre, url]) => ({
    nombre: nombre.split("/").pop() ?? nombre,
    url,
    tipo: /\.(mp4|webm|ogg|ogv)$/i.test(nombre)
        ? "video" as const
        : "imagen" as const,
}));


// 2. COMPONENTE PRINCIPAL

export default function Control() {

    usePageTitle("Control Marcador");


    // 3. CONTEXTO

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
    } = marcador;

    const partido = datos.partidos[
        datos.partidoPrincipalId
    ];

    const reloj = datos.relojes[
        ID_RELOJ_PRINCIPAL
    ];


    // 4. DISEÑOS

    const [selectedDiseno, setSelectedDiseno] =
        useState<string>(() => {

            const guardado = cargarDisenoSeleccionado();

            return guardado &&
                DISENOS_PROYECTO_POR_ID[guardado]
                    ? guardado
                    : DISENO_PROYECTO_SIMPLE.id;

        });

    const [disenosEditados, setDisenosEditados] =
        useState<Record<string, DisenoMarcador>>({});

    const disenoActivo =
        disenosEditados[selectedDiseno] ??
        DISENOS_PROYECTO_POR_ID[selectedDiseno] ??
        DISENO_PROYECTO_SIMPLE;


    // 5. MULTIMEDIA

    const inputArchivoRef = useRef<HTMLInputElement>(
        null,
    );

    const urlsLocalesRef = useRef<Record<string, string>>(
        {},
    );

    const [rutaProyecto, setRutaProyecto] = useState("");

    const [errorMultimedia, setErrorMultimedia] =
        useState<string | null>(null);

    const [errorPantalla, setErrorPantalla] =
        useState<string | null>(null);

    const piezaMultimedia = disenoActivo.capas.find(
        (pieza) => pieza.tipo === "multimedia",
    );

    const propiedadesMultimedia =
        piezaMultimedia?.propiedades ?? {};

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


    // 6. ESTADOS GENERALES

    const [qrAbierto, setQrAbierto] = useState(false);

    const [vinculacionId] = useState(
        obtenerOCrearIdVinculacion,
    );

    const [relojManual, setRelojManual] = useState(
        "10:00",
    );

    const [estadoFBIB, setEstadoFBIB] = useState<
        "consultando" | "disponible" | "error"
    >("consultando");


    // 7. CONSULTAS FBIB

    useEffect(() => {

        let activo = true;

        const mes = new Date().getMonth();

        Promise.allSettled([
            obtenerCalendarioConfiguradoFBIB(mes),
            obtenerEquiposClubFBIB(),
        ]).then((resultados) => {

            if (!activo) return;

            setEstadoFBIB(
                resultados.every(
                    (resultado) =>
                        resultado.status === "fulfilled",
                )
                    ? "disponible"
                    : "error",
            );

        });

        return () => {
            activo = false;
        };

    }, []);


    // 8. LIBERACIÓN DE ARCHIVOS TEMPORALES

    useEffect(() => {

        const urlsLocales = urlsLocalesRef.current;

        return () => {

            Object.values(urlsLocales).forEach(
                (url) => URL.revokeObjectURL(url),
            );

        };

    }, []);


    // 9. ACTUALIZACIÓN DEL DISEÑO MULTIMEDIA

    const actualizarMultimedia = (
        cambios: Record<
            string,
            string | number | boolean | null
        >,
    ) => {

        setDisenosEditados((actuales) => {

            const base =
                actuales[selectedDiseno] ??
                DISENOS_PROYECTO_POR_ID[selectedDiseno] ??
                DISENO_PROYECTO_SIMPLE;

            return {
                ...actuales,

                [selectedDiseno]: {
                    ...base,

                    capas: base.capas.map((pieza) => {

                        if (pieza.tipo !== "multimedia") {
                            return pieza;
                        }

                        return {
                            ...pieza,

                            propiedades: {
                                ...pieza.propiedades,
                                ...cambios,
                            },
                        };

                    }),
                },
            };

        });

    };


    // 10. SELECCIONAR ARCHIVO DEL PC

    const seleccionarArchivoPC = (
        evento: ChangeEvent<HTMLInputElement>,
    ) => {

        const archivo = evento.target.files?.[0];

        if (!archivo) return;

        const esVideo =
            archivo.type.startsWith("video/");

        const esImagen =
            archivo.type.startsWith("image/");

        if (!esVideo && !esImagen) {

            setErrorMultimedia(
                "Selecciona una imagen o un vídeo válido.",
            );

            evento.target.value = "";
            return;
        }

        const anterior =
            urlsLocalesRef.current[selectedDiseno];

        if (anterior) {
            URL.revokeObjectURL(anterior);
        }

        const url = URL.createObjectURL(archivo);

        urlsLocalesRef.current[selectedDiseno] = url;

        actualizarMultimedia({
            src: url,
            tipoArchivo: esVideo ? "video" : "imagen",
        });

        setErrorMultimedia(null);

        evento.target.value = "";

    };


    // 11. SELECCIONAR ARCHIVO DEL PROYECTO

    const seleccionarArchivoProyecto = (
        url: string,
        tipo: "imagen" | "video",
    ) => {

        const anterior =
            urlsLocalesRef.current[selectedDiseno];

        if (anterior) {
            URL.revokeObjectURL(anterior);

            delete urlsLocalesRef.current[
                selectedDiseno
            ];
        }

        actualizarMultimedia({
            src: url,
            tipoArchivo: tipo,
        });

        setErrorMultimedia(null);

    };


    // 12. CATEGORÍA

    const categoriaSeleccionada = CATEGORIAS.find(
        (categoria) =>
            categoria.id === partido?.categoriaId,
    );

    const reglas =
        categoriaSeleccionada?.reglamento;


    // 13. ÚNICO RETURN

    return (
        <>

            {/* OCULTAR CONTROLES INTERNOS DEL VISOR
                PARA MOSTRARLOS EN LA COLUMNA DERECHA */}

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
                CONFIGURACIÓN COMPLETA
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

                            void visor.requestFullscreen()
                                .catch(() => {

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
                        <p
                            role="alert"
                            className="text-sm text-red-300"
                        >
                            {errorPantalla}
                        </p>
                    )}


                    {/* ====================================
                        REPRODUCTOR MULTIMEDIA
                        ==================================== */}

                    <section className="rounded-2xl bg-brand-blue-dark p-5">

                        <h2 className="text-xl font-bold uppercase text-primary">
                            Reproductor multimedia
                        </h2>

                        <p className="mt-1 text-sm text-white/60">
                            Zona VideoReady · 460 × 268 px
                        </p>


                        {/* ARCHIVO ACTUAL */}

                        <div className="mt-4 rounded-lg bg-brand-blue-deep p-3">

                            <p className="text-xs font-semibold uppercase text-white/50">
                                Contenido seleccionado
                            </p>

                            <p className="mt-1 break-all text-sm text-white">
                                {fuenteMultimedia
                                    ? fuenteMultimedia.startsWith("blob:")
                                        ? "Archivo seleccionado del PC"
                                        : fuenteMultimedia
                                    : "Diseño predeterminado CBA"}
                            </p>

                        </div>


                        {/* ARCHIVO DEL PC */}

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
                            onClick={() =>
                                inputArchivoRef.current?.click()
                            }
                            className="mt-4 min-h-11 w-full cursor-pointer rounded-lg bg-primary px-4 py-2 font-bold text-brand-blue-deep hover:bg-brand-yellow-bright disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Seleccionar imagen o vídeo del PC
                        </button>


                        {/* ARCHIVOS INCLUIDOS EN EL PROYECTO */}

                        <label className="mt-5 block text-sm font-semibold text-white">
                            Archivos del proyecto
                        </label>

                        <select
                            value=""
                            disabled={
                                !piezaMultimedia ||
                                ARCHIVOS_PROYECTO.length === 0
                            }
                            onChange={(evento) => {

                                const archivo =
                                    ARCHIVOS_PROYECTO.find(
                                        (item) =>
                                            item.url ===
                                            evento.target.value,
                                    );

                                if (!archivo) return;

                                seleccionarArchivoProyecto(
                                    archivo.url,
                                    archivo.tipo,
                                );

                            }}
                            className="mt-2 w-full rounded-lg border border-white/20 bg-brand-blue-deep px-3 py-3 text-white disabled:opacity-50"
                        >

                            <option value="">
                                {ARCHIVOS_PROYECTO.length > 0
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


                        {/* RUTA MANUAL DEL PROYECTO */}

                        <label className="mt-4 block text-sm font-semibold text-white">
                            Ruta de archivo del proyecto
                        </label>

                        <div className="mt-2 flex gap-2">

                            <input
                                type="text"
                                value={rutaProyecto}
                                onChange={(evento) =>
                                    setRutaProyecto(
                                        evento.target.value,
                                    )
                                }
                                placeholder="/marcador/publicidad.mp4"
                                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-brand-blue-deep px-3 py-2 text-sm text-white outline-none focus:border-primary"
                            />

                            <button
                                type="button"
                                disabled={!piezaMultimedia}
                                onClick={() => {

                                    const ruta =
                                        rutaProyecto.trim();

                                    if (
                                        !ruta.startsWith("/") ||
                                        ruta.startsWith("//") ||
                                        !/\.(png|jpe?g|webp|gif|svg|mp4|webm|ogg|ogv)$/i.test(ruta)
                                    ) {

                                        setErrorMultimedia(
                                            "Introduce una ruta local válida del proyecto.",
                                        );

                                        return;
                                    }

                                    const esVideo =
                                        /\.(mp4|webm|ogg|ogv)$/i.test(ruta);

                                    seleccionarArchivoProyecto(
                                        ruta,
                                        esVideo ? "video" : "imagen",
                                    );

                                }}
                                className="min-h-11 cursor-pointer rounded-lg bg-primary px-4 font-bold text-brand-blue-deep disabled:opacity-50"
                            >
                                Aplicar
                            </button>

                        </div>

                        <p className="mt-2 text-xs text-white/50">
                            Puedes utilizar archivos de public mediante
                            rutas como /marcador/publicidad.mp4.
                        </p>


                        {/* CONFIGURACIÓN DEL BUCLE */}

                        <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-brand-blue-deep p-4">

                            <div>

                                <p className="font-semibold text-white">
                                    Reproducción en bucle
                                </p>

                                <p className="text-xs text-white/60">
                                    Repetir el vídeo al terminar
                                </p>

                            </div>

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

                                const anterior =
                                    urlsLocalesRef.current[
                                        selectedDiseno
                                    ];

                                if (anterior) {
                                    URL.revokeObjectURL(anterior);

                                    delete urlsLocalesRef.current[
                                        selectedDiseno
                                    ];
                                }

                                actualizarMultimedia({
                                    src: "",
                                    tipoArchivo: "auto",
                                    bucle: true,
                                });

                                setRutaProyecto("");
                                setErrorMultimedia(null);

                            }}
                            className="mt-3 w-full cursor-pointer rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
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
                        CONTROL DE PUNTOS Y FALTAS
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

                                        <h3 className="text-center font-bold uppercase text-white">
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
                                                                            [campo.clave]:
                                                                                Math.max(
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

                                                if (!partido) return;

                                                actualizarPeriodo(
                                                    partido.periodo +
                                                        incremento,
                                                );

                                            }}
                                            className="min-h-11 min-w-12 cursor-pointer rounded-lg bg-primary text-xl font-bold text-brand-blue-deep hover:bg-brand-yellow-bright disabled:opacity-50"
                                        >
                                            {incremento > 0
                                                ? "+"
                                                : "−"}
                                        </button>

                                    ),
                                )}

                            </div>

                        </div>


                        {/* RELOJ */}

                        <div className="mt-4 rounded-xl bg-brand-blue-deep p-4">

                            <div className="flex items-center justify-between gap-3">

                                <p className="font-semibold">
                                    Tiempo de juego
                                </p>

                                <span className="bebas-neue text-3xl text-primary">
                                    {reloj?.texto ?? "--:--"}
                                </span>

                            </div>

                            <div className="mt-3 flex gap-2">

                                <input
                                    type="text"
                                    value={relojManual}
                                    onChange={(evento) =>
                                        setRelojManual(
                                            evento.target.value,
                                        )
                                    }
                                    className="min-w-0 flex-1 rounded-lg bg-brand-blue-dark px-3 py-2 text-white"
                                    placeholder="10:00"
                                    aria-label="Tiempo manual"
                                />

                                <button
                                    type="button"
                                    onClick={() => {

                                        const valor =
                                            relojManual.trim();

                                        if (
                                            !/^\d{1,2}:\d{2}$/.test(valor)
                                        ) return;

                                        const [minutos, segundos] =
                                            valor.split(":").map(Number);

                                        if (
                                            minutos > 99 ||
                                            segundos > 59
                                        ) return;

                                        actualizarReloj(
                                            valor,
                                            ID_RELOJ_PRINCIPAL,
                                            "manual",
                                        );

                                    }}
                                    className="min-h-11 cursor-pointer rounded-lg bg-primary px-4 font-bold text-brand-blue-deep"
                                >
                                    Aplicar
                                </button>

                            </div>

                            <p className="mt-2 text-xs text-white/50">
                                Entrada manual provisional hasta conectar COM4.
                            </p>

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

                        <label className="mt-4 block text-sm text-white/70">
                            Categoría
                        </label>

                        <select
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

                                <div className="rounded-lg bg-brand-blue-deep p-3">

                                    <p className="text-xs text-white/60">
                                        Periodos
                                    </p>

                                    <p className="text-xl font-bold">
                                        {reglas.periodos.cantidad}
                                    </p>

                                </div>

                                <div className="rounded-lg bg-brand-blue-deep p-3">

                                    <p className="text-xs text-white/60">
                                        Duración
                                    </p>

                                    <p className="text-xl font-bold">
                                        {reglas.periodos.duracion / 60} min
                                    </p>

                                </div>

                                <div className="rounded-lg bg-brand-blue-deep p-3">

                                    <p className="text-xs text-white/60">
                                        Prórroga
                                    </p>

                                    <p className="font-bold">
                                        {reglas.prorroga.permitida
                                            ? "Habilitada"
                                            : "Deshabilitada"}
                                    </p>

                                </div>

                                <div className="rounded-lg bg-brand-blue-deep p-3">

                                    <p className="text-xs text-white/60">
                                        Duración prórroga
                                    </p>

                                    <p className="font-bold">
                                        {reglas.prorroga.duracion / 60} min
                                    </p>

                                </div>

                            </div>

                        )}

                    </section>


                    {/* ====================================
                        EQUIPOS
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

                                        <label className="mt-3 block text-sm text-white/70">
                                            Nombre
                                        </label>

                                        <input
                                            type="text"
                                            value={partido?.[lado].nombre ?? ""}
                                            onChange={(evento) =>
                                                actualizarEquipo(
                                                    lado,
                                                    {
                                                        nombre:
                                                            evento.target.value,
                                                        fuenteNombre: "manual",
                                                    },
                                                )
                                            }
                                            className="mt-2 w-full rounded-lg bg-brand-blue-dark px-3 py-2 text-white"
                                        />

                                        <label className="mt-3 block text-sm text-white/70">
                                            Escudo
                                        </label>

                                        <input
                                            type="text"
                                            value={partido?.[lado].escudo ?? ""}
                                            onChange={(evento) =>
                                                actualizarEquipo(
                                                    lado,
                                                    {
                                                        escudo:
                                                            evento.target.value || null,
                                                        fuenteEscudo: "manual",
                                                    },
                                                )
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

                                <p className="bebas-neue text-4xl text-white">
                                    {vinculacionId}
                                </p>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setQrAbierto((actual) => !actual)
                                }
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
                            La sincronización entre dispositivos todavía no está implementada.
                        </p>

                    </section>


                    {/* PIE DE PÁGINA */}

                    <footer className="pb-4 text-center text-xs text-white/40">
                        C.B. Andratx · Sistema de marcador
                    </footer>

                </div>

            </main>

        </>
    );
}
