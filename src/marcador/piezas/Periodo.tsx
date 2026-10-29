
import type { EstiloPieza } from "../tipos";

/* ============================================
   MARCADOR CBA
   Pieza visual: Periodo

   Admite:
   - Periodo numérico manual
   - Periodo recibido de MONDO
   - Valores alfabéticos
   ============================================ */

interface PeriodoProps {
    periodo: number | string;
    estilo: EstiloPieza;

    cantidadPeriodos?: number | null;
    formato?: "numero" | "texto";
}

export default function Periodo({
    periodo,
    estilo,
    cantidadPeriodos = null,
    formato = "numero",
}: PeriodoProps) {

    // CONFIGURACIÓN VISUAL

    const color = estilo.color ?? "#FFFFFF";
    const fondo = estilo.fondo ?? "transparent";

    const fuente =
        estilo.fuente ?? '"Bebas Neue", sans-serif';

    const tamanoFuente =
        estilo.tamanoFuente ?? 80;

    const alineacion =
        estilo.alineacion ?? "centro";


    // VALOR ORIGINAL DEL PERÍODO

    const valorOriginal =
        typeof periodo === "string"
            ? periodo.trim()
            : Number.isFinite(periodo)
                ? String(Math.trunc(periodo))
                : "1";


    // DISTINGUIR NÚMEROS DE LETRAS

    const esNumerico = /^\d+$/.test(valorOriginal);

    const periodoNumerico = esNumerico
        ? Math.max(1, Number(valorOriginal))
        : null;


    // CONFIGURACIÓN DE PRÓRROGAS

    const limitePeriodos =
        cantidadPeriodos !== null &&
            Number.isFinite(cantidadPeriodos) &&
            cantidadPeriodos > 0
            ? Math.trunc(cantidadPeriodos)
            : null;

    const esProrroga =
        periodoNumerico !== null &&
        limitePeriodos !== null &&
        periodoNumerico > limitePeriodos;

    const numeroProrroga =
        esProrroga &&
            periodoNumerico !== null &&
            limitePeriodos !== null
            ? periodoNumerico - limitePeriodos
            : 0;


    // TEXTO QUE APARECE EN EL MARCADOR

    let textoPeriodo: string;

    if (!esNumerico) {

        // MONDO puede enviar una letra.
        // Se muestra literalmente, sin convertirla
        // a un período numérico ni a una prórroga.

        textoPeriodo = valorOriginal || "-";

    } else if (esProrroga) {

        textoPeriodo =
            formato === "texto"
                ? `PRÓRROGA ${numeroProrroga}`
                : `PR${numeroProrroga}`;

    } else {

        textoPeriodo =
            formato === "texto"
                ? `PERIODO ${periodoNumerico}`
                : String(periodoNumerico);
    }


    // ETIQUETA ACCESIBLE

    const etiqueta =
        esProrroga
            ? `Prórroga ${numeroProrroga}`
            : `Periodo ${valorOriginal}`;


    // REPRESENTACIÓN VISUAL

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
                color,

                fontFamily: fuente,
                fontSize: `${tamanoFuente}px`,

                fontVariantNumeric: "tabular-nums",
                fontWeight: 500,
                lineHeight: 1,
                boxSizing: "border-box",
            }}
            aria-label={etiqueta}
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
