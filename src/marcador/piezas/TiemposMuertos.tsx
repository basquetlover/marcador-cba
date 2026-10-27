
import type { EstiloPieza } from "../tipos";


/* ============================================
   MARCADOR CBA
   Pieza visual: Tiempos muertos
   ============================================ */


// 1. PROPIEDADES

interface TiemposMuertosProps {
    tiemposMuertos: number;
    estilo: EstiloPieza;

    formato?: "numero" | "indicadores" | "ambos";

    cantidadIndicadores?: number;

    representacion?: "utilizados" | "disponibles";
}


// 2. COMPONENTE PRINCIPAL

export default function TiemposMuertos({
    tiemposMuertos,
    estilo,
    formato = "indicadores",
    cantidadIndicadores = 3,
    representacion = "disponibles",
}: TiemposMuertosProps) {

    // 3. CONFIGURACIÓN VISUAL

    const color = estilo.color ?? "#FFC801";

    const fondo = estilo.fondo ?? "transparent";

    const fuente = estilo.fuente ?? '"Bebas Neue", sans-serif';

    const tamanoFuente = estilo.tamanoFuente ?? 80;

    const alineacion = estilo.alineacion ?? "centro";


    // 4. CONFIGURACIÓN DE TIEMPOS MUERTOS

    const tiemposUtilizados = Number.isFinite(tiemposMuertos)
        ? Math.max(0, Math.trunc(tiemposMuertos))
        : 0;

    const totalIndicadores = Number.isFinite(cantidadIndicadores)
        ? Math.max(1, Math.min(20, Math.trunc(cantidadIndicadores)))
        : 3;

    const tiemposDisponibles = Math.max(
        0,
        totalIndicadores - tiemposUtilizados,
    );

    const valorMostrado =
        representacion === "utilizados"
            ? tiemposUtilizados
            : tiemposDisponibles;


    // 5. CONFIGURACIÓN DE ALINEACIÓN

    const alineacionHorizontal =
        alineacion === "izquierda"
            ? "flex-start"
            : alineacion === "derecha"
                ? "flex-end"
                : "center";

    const alineacionTexto =
        alineacion === "izquierda"
            ? "left"
            : alineacion === "derecha"
                ? "right"
                : "center";


    // 6. ÚNICO RETURN

    return (
        <div
            className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden"
            style={{
                alignItems: alineacionHorizontal,

                justifyContent: "center",

                backgroundColor: fondo,

                boxSizing: "border-box",
            }}
            role="img"
            aria-label={
                representacion === "utilizados"
                    ? `Tiempos muertos utilizados: ${valorMostrado}`
                    : `Tiempos muertos disponibles: ${valorMostrado}`
            }
        >

            {/* Representación numérica */}
            {(formato === "numero" || formato === "ambos") && (
                <span
                    className="block w-full min-h-0 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{
                        color: color,

                        fontFamily: fuente,

                        fontSize: `${tamanoFuente}px`,

                        fontVariantNumeric: "tabular-nums",

                        fontWeight: 500,

                        lineHeight: 1,

                        textAlign: alineacionTexto,
                    }}
                >
                    {valorMostrado}
                </span>
            )}


            {/* Representación mediante indicadores */}
            {(formato === "indicadores" || formato === "ambos") && (
                <div
                    className="flex w-full min-h-0 items-center"
                    style={{
                        height:
                            formato === "ambos"
                                ? "35%"
                                : "100%",

                        justifyContent: alineacionHorizontal,

                        gap: "3%",
                    }}
                >
                    {Array.from(
                        { length: totalIndicadores },
                        (_, indice) => (
                            <span
                                key={indice}
                                style={{
                                    flex: "1 1 0",

                                    minWidth: 0,

                                    height: "45%",

                                    borderRadius: "2px",

                                    boxSizing: "border-box",

                                    border: `2px solid ${color}`,

                                    backgroundColor:
                                        indice < valorMostrado
                                            ? color
                                            : "rgba(255,255,255,0.15)",

                                    transition:
                                        "background-color 150ms ease",
                                }}
                            />
                        ),
                    )}
                </div>
            )}

        </div>
    );
}
