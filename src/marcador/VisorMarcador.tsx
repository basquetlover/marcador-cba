
import { useEffect, useRef, useState } from "react";

import type {
    DatosMarcador,
    DisenoMarcador,
} from "./tipos";

import LienzoMarcador from "./LienzoMarcador";


/* ============================================
   MARCADOR CBA
   Visor de proyección del marcador
   ============================================ */


// 1. PROPIEDADES

interface VisorMarcadorProps {
    diseno: DisenoMarcador;
    datos: DatosMarcador;
}


// 2. COMPONENTE PRINCIPAL

export default function VisorMarcador({
    diseno,
    datos,
}: VisorMarcadorProps) {

    // 3. REFERENCIAS

    const visorRef = useRef<HTMLDivElement>(null);


    // 4. ESTADOS

    const [pantallaCompleta, setPantallaCompleta] =
        useState(false);

    const [errorPantalla, setErrorPantalla] =
        useState<string | null>(null);


    // 5. DETECTAR CAMBIOS DE PANTALLA COMPLETA

    useEffect(() => {

        const actualizarPantallaCompleta = () => {

            setPantallaCompleta(
                document.fullscreenElement === visorRef.current,
            );

        };

        document.addEventListener(
            "fullscreenchange",
            actualizarPantallaCompleta,
        );

        actualizarPantallaCompleta();

        return () => {

            document.removeEventListener(
                "fullscreenchange",
                actualizarPantallaCompleta,
            );

        };

    }, []);


    // 6. ÚNICO RETURN

    return (
        <div
            className="fixed left-0 top-0 z-40 m-0 p-0"
            style={{
                width: "min(832px, 100vw)",
            }}
        >

            {/* ÁREA DE PROYECCIÓN */}
            <div
                ref={visorRef}
                className="relative m-0 overflow-hidden p-0"
                style={{
                    width: pantallaCompleta
                        ? "100vw"
                        : "100%",

                    height: pantallaCompleta
                        ? "100dvh"
                        : "min(520px, 62.5vw)",

                    backgroundColor: "#000000",

                    border: "none",

                    borderRadius: 0,

                    boxSizing: "border-box",
                }}
                aria-label={`Proyección del marcador: ${diseno.nombre}`}
            >

                {/* RENDERIZADOR ÚNICO */}
                <LienzoMarcador
                    diseno={diseno}
                    datos={datos}
                    alineacion={
                        pantallaCompleta
                            ? "centro"
                            : "inicio"
                    }
                />

            </div>


            {/* CONTROLES FUERA DEL ÁREA CAPTURADA */}
            {!pantallaCompleta && (

                <div
                    className="flex w-full flex-col gap-2 bg-brand-blue-deep p-3"
                >

                    {/* BOTÓN DE PANTALLA COMPLETA */}
                    <button
                        type="button"
                        onClick={() => {

                            setErrorPantalla(null);

                            if (!visorRef.current) return;

                            if (!visorRef.current.requestFullscreen) {

                                setErrorPantalla(
                                    "Este navegador no admite pantalla completa.",
                                );

                                return;
                            }

                            void visorRef.current
                                .requestFullscreen()
                                .catch((error: unknown) => {

                                    setErrorPantalla(
                                        error instanceof Error
                                            ? error.message
                                            : "No se pudo activar la pantalla completa.",
                                    );

                                });

                        }}
                        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-brand-blue-deep transition-colors hover:bg-brand-yellow-bright"
                    >
                        {/* ICONO */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-5 w-5 fill-current"
                            aria-hidden="true"
                        >
                            <path d="M3 3h7v2H5v5H3V3zm11 0h7v7h-2V5h-5V3zM3 14h2v5h5v2H3v-7zm16 0h2v7h-7v-2h5v-5z" />
                        </svg>

                        <span>
                            Pantalla completa
                        </span>
                    </button>


                    {/* INSTRUCCIONES */}
                    <p
                        className="text-center text-xs text-white/70"
                    >
                        Pulsa Esc para volver a la configuración.
                    </p>


                    {/* ERRORES */}
                    {errorPantalla && (

                        <p
                            role="alert"
                            className="rounded-lg bg-red-500/15 p-2 text-center text-sm text-red-200"
                        >
                            {errorPantalla}
                        </p>

                    )}

                </div>

            )}

        </div>
    );
}
