
import { useContext, useEffect, useState } from "react";

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


// 1. COMPONENTE PRINCIPAL

export default function Control() {

    usePageTitle("Control Marcador");


    // 2. CONTEXTO DEL MARCADOR

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

    const partido = datos.partidos[datos.partidoPrincipalId];

    const reloj = datos.relojes[ID_RELOJ_PRINCIPAL];


    // 3. SELECCIÓN DE DISEÑO

    const [selectedDiseno, setSelectedDiseno] = useState<string>(
        () => {

            const guardado = cargarDisenoSeleccionado();

            if (
                guardado &&
                DISENOS_PROYECTO_POR_ID[guardado]
            ) {
                return guardado;
            }

            return DISENO_PROYECTO_SIMPLE.id;

        },
    );

    const disenoActivo =
        DISENOS_PROYECTO_POR_ID[selectedDiseno] ??
        DISENO_PROYECTO_SIMPLE;


    // 4. VINCULACIÓN QR

    const [vinculacionId] = useState(
        obtenerOCrearIdVinculacion,
    );

    const [qrAbierto, setQrAbierto] = useState(false);


    // 5. RELOJ MANUAL

    const [relojManual, setRelojManual] = useState("10:00");


    // 6. ESTADO DE CONSULTA FBIB

    const [estadoFBIB, setEstadoFBIB] = useState<
        "consultando" | "disponible" | "error"
    >("consultando");


    // 7. CONSULTAS FBIB EXISTENTES

    useEffect(() => {

        let activo = true;

        const mes = new Date().getMonth();

        Promise.allSettled([
            obtenerCalendarioConfiguradoFBIB(mes),
            obtenerEquiposClubFBIB(),
        ]).then((resultados) => {

            if (!activo) return;

            const correcto = resultados.every(
                (resultado) =>
                    resultado.status === "fulfilled",
            );

            setEstadoFBIB(
                correcto ? "disponible" : "error",
            );

            if (!correcto) {
                console.warn(
                    "Alguna consulta FBIB no está disponible.",
                    resultados,
                );
            }

        });

        return () => {
            activo = false;
        };

    }, []);


    // 8. CATEGORÍA ACTUAL

    const categoriaSeleccionada = CATEGORIAS.find(
        (categoria) =>
            categoria.id === partido?.categoriaId,
    );

    const reglas = categoriaSeleccionada?.reglamento;


    // 9. ÚNICO RETURN

    return (
        <>

            {/* ====================================
                VISOR DEL MARCADOR
                ==================================== */}

            <VisorMarcador
                diseno={disenoActivo}
                datos={datos}
            />


            {/* ====================================
                PÁGINA DE CONFIGURACIÓN
                ==================================== */}

            <main className="min-h-screen w-full bg-brand-blue-deep text-white">

                {/* PRIMERA FILA:
                    RESERVA DE CAPTURA + CONTROL
                */}

                <section className="grid w-full grid-cols-1 min-[1180px]:grid-cols-[832px_minmax(0,1fr)]">

                    {/* ESPACIO RESERVADO PARA EL VISOR */}

                    <div
                        aria-hidden="true"
                        className="pointer-events-none"
                        style={{
                            width: "min(832px, 100vw)",

                            height:
                                "calc(min(520px, 62.5vw) + 128px)",
                        }}
                    />


                    {/* CONTROL RÁPIDO */}

                    <aside className="min-w-0 p-4 sm:p-6">

                        <div className="rounded-2xl border border-white/15 bg-brand-blue-dark p-5 shadow-xl">

                            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">

                                <div>
                                    <h1 className="text-2xl font-bold uppercase text-primary">
                                        Control del marcador
                                    </h1>

                                    <p className="mt-1 text-sm text-white/60">
                                        Modificaciones en directo
                                    </p>
                                </div>

                                <span className="rounded-lg bg-brand-blue-deep px-3 py-2 text-xs font-semibold text-white/80">
                                    {disenoActivo.nombre}
                                </span>

                            </div>


                            {/* PUNTUACIONES */}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:grid-cols-1 min-[1600px]:grid-cols-2">

                                {(["local", "visitante"] as const).map(
                                    (lado) => (

                                        <div
                                            key={lado}
                                            className="min-w-0 rounded-xl bg-brand-blue-deep p-4"
                                        >

                                            <p className="text-center text-xs font-bold uppercase tracking-wider text-white/60">
                                                {lado === "local"
                                                    ? "Equipo local"
                                                    : "Equipo visitante"}
                                            </p>

                                            <p className="mt-1 truncate text-center text-sm font-semibold text-white">
                                                {partido?.[lado].nombre ?? "-"}
                                            </p>

                                            <p className="bebas-neue mt-2 text-center text-6xl text-primary">
                                                {partido?.[lado].puntos ?? 0}
                                            </p>

                                            <div className="mt-3 grid grid-cols-3 gap-2">

                                                <button
                                                    type="button"
                                                    disabled={!partido}
                                                    onClick={() => {

                                                        if (!partido) return;

                                                        actualizarEquipo(
                                                            lado,
                                                            {
                                                                puntos: Math.max(
                                                                    0,
                                                                    partido[lado].puntos - 1,
                                                                ),
                                                            },
                                                        );

                                                    }}
                                                    className="min-h-11 cursor-pointer rounded-lg bg-white/10 text-xl font-bold hover:bg-white/20 disabled:opacity-50"
                                                >
                                                    −1
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={!partido}
                                                    onClick={() => {

                                                        if (!partido) return;

                                                        actualizarEquipo(
                                                            lado,
                                                            {
                                                                puntos:
                                                                    partido[lado].puntos + 1,
                                                            },
                                                        );

                                                    }}
                                                    className="min-h-11 cursor-pointer rounded-lg bg-primary text-xl font-bold text-brand-blue-deep hover:bg-brand-yellow-bright disabled:opacity-50"
                                                >
                                                    +1
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={!partido}
                                                    onClick={() => {

                                                        if (!partido) return;

                                                        actualizarEquipo(
                                                            lado,
                                                            {
                                                                puntos:
                                                                    partido[lado].puntos + 2,
                                                            },
                                                        );

                                                    }}
                                                    className="min-h-11 cursor-pointer rounded-lg bg-primary/80 text-lg font-bold text-brand-blue-deep hover:bg-primary disabled:opacity-50"
                                                >
                                                    +2
                                                </button>

                                            </div>

                                            {/* FALTAS */}

                                            <div className="mt-4 flex items-center justify-between gap-2">

                                                <span className="text-sm text-white/75">
                                                    Faltas
                                                </span>

                                                <div className="flex items-center gap-2">

                                                    <button
                                                        type="button"
                                                        disabled={!partido}
                                                        onClick={() => {

                                                            if (!partido) return;

                                                            actualizarEquipo(
                                                                lado,
                                                                {
                                                                    faltas: Math.max(
                                                                        0,
                                                                        partido[lado].faltas - 1,
                                                                    ),
                                                                },
                                                            );

                                                        }}
                                                        className="flex size-8 cursor-pointer items-center justify-center rounded bg-white/10 font-bold hover:bg-white/20 disabled:opacity-50"
                                                    >
                                                        −
                                                    </button>

                                                    <span className="min-w-5 text-center font-bold">
                                                        {partido?.[lado].faltas ?? 0}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        disabled={!partido}
                                                        onClick={() => {

                                                            if (!partido) return;

                                                            actualizarEquipo(
                                                                lado,
                                                                {
                                                                    faltas:
                                                                        partido[lado].faltas + 1,
                                                                },
                                                            );

                                                        }}
                                                        className="flex size-8 cursor-pointer items-center justify-center rounded bg-primary font-bold text-brand-blue-deep disabled:opacity-50"
                                                    >
                                                        +
                                                    </button>

                                                </div>

                                            </div>


                                            {/* TIEMPOS MUERTOS */}

                                            <div className="mt-3 flex items-center justify-between gap-2">

                                                <span className="text-sm text-white/75">
                                                    T. muertos usados
                                                </span>

                                                <div className="flex items-center gap-2">

                                                    <button
                                                        type="button"
                                                        disabled={!partido}
                                                        onClick={() => {

                                                            if (!partido) return;

                                                            actualizarEquipo(
                                                                lado,
                                                                {
                                                                    tiemposMuertos: Math.max(
                                                                        0,
                                                                        partido[lado].tiemposMuertos - 1,
                                                                    ),
                                                                },
                                                            );

                                                        }}
                                                        className="flex size-8 cursor-pointer items-center justify-center rounded bg-white/10 font-bold hover:bg-white/20 disabled:opacity-50"
                                                    >
                                                        −
                                                    </button>

                                                    <span className="min-w-5 text-center font-bold">
                                                        {partido?.[lado].tiemposMuertos ?? 0}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        disabled={!partido}
                                                        onClick={() => {

                                                            if (!partido) return;

                                                            actualizarEquipo(
                                                                lado,
                                                                {
                                                                    tiemposMuertos:
                                                                        partido[lado].tiemposMuertos + 1,
                                                                },
                                                            );

                                                        }}
                                                        className="flex size-8 cursor-pointer items-center justify-center rounded bg-primary font-bold text-brand-blue-deep disabled:opacity-50"
                                                    >
                                                        +
                                                    </button>

                                                </div>

                                            </div>

                                        </div>

                                    ),
                                )}

                            </div>


                            {/* PERIODO */}

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-blue-deep p-4">

                                <div>
                                    <p className="text-xs uppercase text-white/60">
                                        Periodo actual
                                    </p>

                                    <p className="bebas-neue text-4xl text-primary">
                                        {partido?.periodo ?? 1}
                                    </p>
                                </div>

                                <div className="flex gap-2">

                                    <button
                                        type="button"
                                        disabled={!partido}
                                        onClick={() => {

                                            if (!partido) return;

                                            actualizarPeriodo(
                                                partido.periodo - 1,
                                            );

                                        }}
                                        className="min-h-11 min-w-12 cursor-pointer rounded-lg bg-white/10 text-xl font-bold hover:bg-white/20 disabled:opacity-50"
                                    >
                                        −
                                    </button>

                                    <button
                                        type="button"
                                        disabled={!partido}
                                        onClick={() => {

                                            if (!partido) return;

                                            actualizarPeriodo(
                                                partido.periodo + 1,
                                            );

                                        }}
                                        className="min-h-11 min-w-12 cursor-pointer rounded-lg bg-primary text-xl font-bold text-brand-blue-deep hover:bg-brand-yellow-bright disabled:opacity-50"
                                    >
                                        +
                                    </button>

                                </div>

                            </div>


                            {/* RELOJ MANUAL */}

                            <div className="mt-4 rounded-xl bg-brand-blue-deep p-4">

                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            Tiempo de juego
                                        </p>

                                        <p className="text-xs text-white/60">
                                            Fuente: {reloj?.fuente ?? "sin configurar"}
                                        </p>
                                    </div>

                                    <span className="bebas-neue text-3xl text-primary">
                                        {reloj?.texto ?? "--:--"}
                                    </span>

                                </div>

                                <div className="flex gap-2">

                                    <input
                                        type="text"
                                        value={relojManual}
                                        onChange={(evento) =>
                                            setRelojManual(evento.target.value)
                                        }
                                        placeholder="10:00"
                                        aria-label="Tiempo manual"
                                        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-brand-blue-dark px-3 py-2 text-white outline-none focus:border-primary"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => {

                                            const valor = relojManual.trim();

                                            if (!/^\d{1,2}:\d{2}$/.test(valor)) {
                                                return;
                                            }

                                            const [minutos, segundos] =
                                                valor.split(":").map(Number);

                                            if (
                                                minutos > 99 ||
                                                segundos > 59
                                            ) {
                                                return;
                                            }

                                            actualizarReloj(
                                                valor,
                                                ID_RELOJ_PRINCIPAL,
                                                "manual",
                                            );

                                        }}
                                        className="min-h-11 cursor-pointer rounded-lg bg-primary px-4 font-bold text-brand-blue-deep hover:bg-brand-yellow-bright"
                                    >
                                        Aplicar
                                    </button>

                                </div>

                                <p className="mt-2 text-xs text-white/50">
                                    Entrada manual provisional.
                                    La lectura COM4 se integrará después.
                                </p>

                            </div>

                        </div>

                    </aside>

                </section>


                {/* ====================================
                    CONFIGURACIÓN GENERAL
                    ==================================== */}

                <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 pb-12 sm:px-6 xl:grid-cols-2">


                    {/* SELECCIÓN DEL DISEÑO */}

                    <div className="rounded-2xl bg-brand-blue-light p-5 shadow-xl">

                        <h2 className="text-2xl font-bold uppercase text-primary">
                            Diseño de proyección
                        </h2>

                        <p className="mt-1 text-sm text-brand-blue-deep/80">
                            Selecciona el diseño que se mostrará en el marcador.
                        </p>

                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

                            {DISENOS.map((diseno) => (

                                <button
                                    type="button"
                                    key={diseno.id}
                                    onClick={() => {

                                        setSelectedDiseno(diseno.id);

                                        guardarDisenoSeleccionado(
                                            diseno.id,
                                        );

                                    }}
                                    className={`cursor-pointer rounded-xl border-2 p-3 text-left transition-colors ${
                                        selectedDiseno === diseno.id
                                            ? "border-primary bg-brand-blue-dark"
                                            : "border-white/40 bg-brand-blue-dark/70 hover:border-white"
                                    }`}
                                >

                                    <img
                                        src={`/miniaturas/${diseno.miniatura}.png`}
                                        alt={`Vista previa de ${diseno.nombre}`}
                                        className="aspect-video w-full rounded-lg object-contain"
                                    />

                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">

                                        <span className="font-bold text-white">
                                            {diseno.nombre}
                                        </span>

                                        {selectedDiseno === diseno.id && (
                                            <span className="rounded bg-primary px-2 py-1 text-xs font-bold uppercase text-brand-blue-deep">
                                                Activo
                                            </span>
                                        )}

                                    </div>

                                </button>

                            ))}

                        </div>

                        <p className="mt-4 text-xs text-brand-blue-deep/75">
                            Resolución del proyecto: 832 × 520 píxeles.
                        </p>

                    </div>


                    {/* REGLAS Y TIEMPOS */}

                    <div className="rounded-2xl bg-brand-blue-light p-5 shadow-xl">

                        <h2 className="text-2xl font-bold uppercase text-primary">
                            Reglas y tiempos
                        </h2>

                        <p className="mt-1 text-sm text-brand-blue-deep/80">
                            Configuración según categoría.
                        </p>

                        <label className="mt-5 block text-sm font-semibold text-white">
                            Categoría
                        </label>

                        <select
                            value={partido?.categoriaId ?? ""}
                            onChange={(evento) =>
                                actualizarCategoria(
                                    evento.target.value || null,
                                )
                            }
                            className="mt-2 w-full cursor-pointer rounded-lg border border-white/20 bg-brand-blue-dark px-3 py-3 text-white outline-none focus:border-primary"
                        >
                            <option value="">
                                Selecciona una categoría
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


                        {reglas ? (

                            <div className="mt-5 grid grid-cols-2 gap-3">

                                <div className="rounded-lg bg-brand-blue-dark p-4">
                                    <p className="text-xs uppercase text-white/60">
                                        Periodos
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-white">
                                        {reglas.periodos.cantidad}
                                    </p>
                                </div>

                                <div className="rounded-lg bg-brand-blue-dark p-4">
                                    <p className="text-xs uppercase text-white/60">
                                        Duración
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-white">
                                        {reglas.periodos.duracion / 60} min
                                    </p>
                                </div>

                                <div className="rounded-lg bg-brand-blue-dark p-4">
                                    <p className="text-xs uppercase text-white/60">
                                        Prórroga
                                    </p>

                                    <p className="mt-2 font-bold text-white">
                                        {reglas.prorroga.permitida
                                            ? "Habilitada"
                                            : "Deshabilitada"}
                                    </p>
                                </div>

                                <div className="rounded-lg bg-brand-blue-dark p-4">
                                    <p className="text-xs uppercase text-white/60">
                                        Duración prórroga
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-white">
                                        {reglas.prorroga.duracion / 60} min
                                    </p>
                                </div>

                            </div>

                        ) : (

                            <div className="mt-5 flex min-h-40 items-center justify-center rounded-xl bg-brand-blue-dark/50 p-5 text-center">

                                <p className="text-white/70">
                                    Selecciona una categoría para consultar las reglas.
                                </p>

                            </div>

                        )}

                    </div>


                    {/* DATOS DEL PARTIDO */}

                    <div className="rounded-2xl bg-brand-blue-light p-5 shadow-xl">

                        <h2 className="text-2xl font-bold uppercase text-primary">
                            Datos del partido
                        </h2>

                        <p className="mt-1 text-sm text-brand-blue-deep/80">
                            Los cambios se reflejan directamente en el marcador.
                        </p>

                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

                            {(["local", "visitante"] as const).map(
                                (lado) => (

                                    <div
                                        key={lado}
                                        className="min-w-0 rounded-xl bg-brand-blue-dark p-4"
                                    >

                                        <h3 className="mb-4 text-center text-lg font-bold uppercase text-primary">
                                            {lado === "local"
                                                ? "Equipo local"
                                                : "Equipo visitante"}
                                        </h3>

                                        <label className="block text-sm text-white/70">
                                            Nombre del equipo
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
                                            placeholder="Nombre del equipo"
                                            className="mt-2 w-full rounded-lg border border-white/15 bg-brand-blue-deep px-3 py-2 text-white outline-none focus:border-primary"
                                        />

                                        <label className="mt-4 block text-sm text-white/70">
                                            Ruta o URL del escudo
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
                                            placeholder="/img/escudo.png"
                                            className="mt-2 w-full rounded-lg border border-white/15 bg-brand-blue-deep px-3 py-2 text-white outline-none focus:border-primary"
                                        />

                                    </div>

                                ),
                            )}

                        </div>

                    </div>


                    {/* SINCRONIZACIÓN / VINCULACIÓN */}

                    <div className="rounded-2xl bg-brand-blue-light p-5 shadow-xl">

                        <h2 className="text-2xl font-bold uppercase text-primary">
                            Sincronización
                        </h2>

                        <p className="mt-1 text-sm text-brand-blue-deep/80">
                            Identificación del partido y acceso mediante QR.
                        </p>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-blue-dark p-4">

                            <div>
                                <p className="text-sm font-semibold uppercase text-white/60">
                                    Código de vinculación
                                </p>

                                <p className="bebas-neue mt-2 text-4xl text-white">
                                    {vinculacionId}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setQrAbierto((actual) => !actual)
                                }
                                className="cursor-pointer rounded-lg bg-white p-2 transition-transform hover:scale-105"
                                aria-label="Mostrar u ocultar código QR"
                                aria-expanded={qrAbierto}
                            >
                                <QrVinculacion
                                    partidoId={vinculacionId}
                                    size={80}
                                />
                            </button>

                        </div>


                        {/* QR AMPLIADO DENTRO DE LA CONFIGURACIÓN */}

                        {qrAbierto && (

                            <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-brand-blue-dark p-5">

                                <p className="text-center font-bold text-white">
                                    Vincular controlador
                                </p>

                                <div className="rounded-lg bg-white p-3">

                                    <QrVinculacion
                                        partidoId={vinculacionId}
                                        size={230}
                                    />

                                </div>

                                <button
                                    type="button"
                                    onClick={() => setQrAbierto(false)}
                                    className="cursor-pointer rounded-lg bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
                                >
                                    Cerrar QR
                                </button>

                            </div>

                        )}


                        {/* ESTADO FBIB */}

                        <div className="mt-4 rounded-xl bg-brand-blue-dark p-4">

                            <div className="flex flex-wrap items-center justify-between gap-3">

                                <div>
                                    <p className="font-semibold text-white">
                                        Consultas FBIB
                                    </p>

                                    <p className="text-xs text-white/60">
                                        Equipos y calendario del club
                                    </p>
                                </div>

                                <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white">

                                    {estadoFBIB === "consultando"
                                        ? "Consultando..."
                                        : estadoFBIB === "disponible"
                                            ? "Consulta correcta"
                                            : "No disponible"}

                                </span>

                            </div>

                            <p className="mt-3 text-xs text-white/50">
                                La consulta no implica sincronización con el marcador.
                                La selección de partidos FBIB se incorporará en una fase posterior.
                            </p>

                        </div>

                    </div>

                </section>


                {/* PIE DE PÁGINA */}

                <footer className="border-t border-white/10 bg-brand-blue-dark px-5 py-6">

                    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">

                        <p className="text-sm font-semibold text-white">
                            C.B. Andratx · Sistema de marcador
                        </p>

                        <p className="text-xs text-white/50">
                            Resolución MONDO: 832 × 520
                        </p>

                    </div>

                </footer>

            </main>

        </>
    );
}
