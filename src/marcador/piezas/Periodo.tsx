
import type { EstiloPieza } from "../tipos";


/* ============================================
   MARCADOR CBA
   Pieza visual: Periodo
   ============================================ */


// 1. PROPIEDADES

interface PeriodoProps {
    periodo: number;
    estilo: EstiloPieza;

    cantidadPeriodos?: number | null;
    formato?: "numero" | "texto";
}


// 2. COMPONENTE PRINCIPAL

export default function Periodo({
    periodo,
    estilo,
    cantidadPeriodos = null,
    formato = "numero",
}: PeriodoProps) {

    // 3. CONFIGURACIÓN VISUAL

    const color = estilo.color ?? "#FFFFFF";

    const fondo = estilo.fondo ?? "transparent";

    const fuente = estilo.fuente ?? '"Bebas Neue", sans-serif';

    const tamanoFuente = estilo.tamanoFuente ?? 80;

    const alineacion = estilo.alineacion ?? "centro";


    // 4. CONFIGURACIÓN DEL PERIODO

    const periodoActual = Number.isFinite(periodo)
        ? Math.max(1, Math.trunc(periodo))
        : 1;

    const limitePeriodos =
        cantidadPeriodos !== null &&
        Number.isFinite(cantidadPeriodos) &&
        cantidadPeriodos > 0
            ? Math.trunc(cantidadPeriodos)
            : null;

    const esProrroga =
        limitePeriodos !== null &&
        periodoActual > limitePeriodos;

    const numeroProrroga =
        esProrroga && limitePeriodos !== null
            ? periodoActual - limitePeriodos
            : 0;

    const textoPeriodo = esProrroga
        ? formato === "texto"
            ? `PRÓRROGA ${numeroProrroga}`
            : `PR${numeroProrroga}`
        : formato === "texto"
            ? `PERIODO ${periodoActual}`
            : String(periodoActual);


    // 5. ÚNICO RETURN

    return (
        <div
            className="flex h-full w-full min-h-0 min-w-0 overflow-hidden"
            style={{
                alignItems: "center",

                justifyContent:
                    alineacion === "izquierda"
                        ? "flex-start"
                        : alineacion === "derecha"
                            ? "flex-end"
                            : "center",

                backgroundColor: fondo,

                color: color,

                fontFamily: fuente,

                fontSize: `${tamanoFuente}px`,

                fontVariantNumeric: "tabular-nums",

                fontWeight: 500,

                lineHeight: 1,

                boxSizing: "border-box",
            }}
            aria-label={
                esProrroga
                    ? `Prórroga ${numeroProrroga}`
                    : `Periodo ${periodoActual}`
            }
        >
            <span
                className="block min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                    textAlign:
                        alineacion === "izquierda"
                            ? "left"
                            : alineacion === "derecha"
                                ? "right"
                                : "center",
                }}
            >
                {textoPeriodo}
            </span>
        </div>
    );
}
