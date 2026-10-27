
import { useState } from "react";

import type { EstiloPieza } from "../tipos";


/* ============================================
   MARCADOR CBA
   Pieza visual: Reproductor multimedia
   ============================================ */


// 1. PROPIEDADES

interface ReproductorMultimediaProps {
    src?: string | null;

    tipo?: "imagen" | "video" | "auto";

    bucle?: boolean;

    ajuste?: "contener" | "cubrir" | "estirar";

    estilo?: EstiloPieza;
}


// 2. COMPONENTE PRINCIPAL

export default function ReproductorMultimedia({
    src = null,
    tipo = "auto",
    bucle = true,
    ajuste = "contener",
}: ReproductorMultimediaProps) {

    // 3. ESTADO DE ERRORES

    const [archivoConError, setArchivoConError] =
        useState<string | null>(null);


    // 4. CONFIGURACIÓN VISUAL

    const ajusteVisual =
        ajuste === "cubrir"
            ? "cover"
            : ajuste === "estirar"
                ? "fill"
                : "contain";


    // 5. IDENTIFICACIÓN DEL CONTENIDO

    const archivo = src?.trim() ?? "";

    const tipoDetectado =
        tipo === "auto"
            ? (
                /\.(mp4|webm|ogv|ogg)(?:[?#].*)?$/i.test(archivo) ||
                    archivo.startsWith("data:video/")
                    ? "video"
                    : "imagen"
            )
            : tipo;

    const disponible =
        archivo.length > 0 &&
        archivoConError !== archivo;


    // 6. ÚNICO RETURN

    return (
        <div
            className="relative border-2 border-primary rounded-lg bg-[#033266]/70 h-full w-full overflow-hidden"
            style={{
                boxSizing: "border-box",
            }}
        >

            {/* REPRODUCCIÓN DE VÍDEO */}

            {disponible && tipoDetectado === "video" && (

                <video
                    key={archivo}
                    src={archivo}

                    autoPlay
                    loop={bucle}
                    muted
                    playsInline

                    controls={false}
                    preload="auto"

                    onError={() => {
                        setArchivoConError(archivo);
                    }}

                    className="absolute inset-0 h-full w-full"

                    style={{
                        objectFit: ajusteVisual,
                        pointerEvents: "none",
                    }}
                />

            )}


            {/* VISUALIZACIÓN DE IMAGEN */}

            {disponible && tipoDetectado === "imagen" && (

                <img
                    key={archivo}
                    src={archivo}

                    alt="Contenido multimedia del marcador"

                    draggable={false}
                    loading="eager"

                    onError={() => {
                        setArchivoConError(archivo);
                    }}

                    className="absolute inset-0 h-full w-full"

                    style={{
                        objectFit: ajusteVisual,
                        pointerEvents: "none",
                        userSelect: "none",
                    }}
                />

            )}


            {/* DISEÑO PREDETERMINADO */}

            {!disponible && (

                <div
                    className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
                >

                    <img
                        src="/favicon.svg"
                        alt="Marcador CBA"
                        className="h-30 w-30 mb-2"
                    />

                    <p className="text-center text text-primary font-semibold uppercase tracking-widest mt-5">
                        #Fent basquet desde 1985
                    </p>

                    <p className="text-center text text-primary font-semibold uppercase tracking-widest mt-2">
                        #Sentiment Blau Groc
                    </p>

                </div>

            )}

        </div>
    );
}
