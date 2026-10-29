
import type { EstiloPieza } from "../tipos";
import type { PeriodoMondo } from "../DecodificadorMondo";

/* ============================================
   MARCADOR CBA
   PIEZA VISUAL: PERIODO

   Fuentes:
   - Manual
   - MONDO mediante COM4

   El componente NO interpreta bytes.
   Recibe el periodo ya decodificado.
   ============================================ */

interface PeriodoProps {
    // Periodo numérico/manual existente
    periodo: number | string;

    estilo: EstiloPieza;

    cantidadPeriodos?: number | null;

    formato?: "numero" | "texto";

    // Estado original recibido desde MONDO
    periodoMondo?: PeriodoMondo | null;

    // Indica que MONDO tiene prioridad.
    // Si todavía no ha llegado AA, muestra vacío.
    usarPeriodoMondo?: boolean;

    // Texto opcional detrás del número: "Q"
    sufijoPeriodo?: string;

    // Texto para tiempo extra
    textoExtra?: string;

    // Texto para tiempo extra FIBA
    textoExtraFiba?: string;

    modoFiba?: boolean;
}

/* ============================================
   COMPONENTE PRINCIPAL
   ============================================ */

export default function Periodo({
    periodo,
    estilo,

    cantidadPeriodos = null,
    formato = "numero",

    periodoMondo = null,
    usarPeriodoMondo = false,

    sufijoPeriodo = "",

    textoExtra = "E",
    textoExtraFiba = "O",

    modoFiba = false,
}: PeriodoProps) {

    /* ========================================
       ESTILO ORIGINAL
       ======================================== */

    const color =
        estilo.color ?? "#FFFFFF";

    const fondo =
        estilo.fondo ?? "transparent";

    const fuente =
        estilo.fuente ??
        '"Bebas Neue", sans-serif';

    const tamanoFuente =
        estilo.tamanoFuente ?? 80;

    const alineacion =
        estilo.alineacion ?? "centro";

    /* ========================================
       TEXTO DEL PERIODO
       ======================================== */

    let textoPeriodo = "";

    let etiqueta = "Sin periodo";

    if (usarPeriodoMondo) {

        /* ====================================
           FUENTE: MONDO
           ==================================== */

        if (!periodoMondo) {

            // Todavía no hemos recibido AA.
            // No inventar un período inicial.

            textoPeriodo = "";
            etiqueta = "Esperando periodo de MONDO";

        } else if (
            periodoMondo.type === "empty"
        ) {

            // AA 5F
            // MONDOVIDEO muestra un espacio
            // en blanco, no el numero cero.

            textoPeriodo = "";
            etiqueta = "Sin periodo";

        } else if (
            periodoMondo.type === "overtime"
        ) {

            // AA 50
            // La consola indica tiempo extra.
            // React decide el texto que muestra.

            textoPeriodo = modoFiba
                ? textoExtraFiba
                : textoExtra;

            etiqueta = "Prorroga";

        } else if (
            periodoMondo.type === "quarter" &&
            periodoMondo.number !== null
        ) {

            // AA 51...59
            // Se utiliza el numero del decoder.
            // No se calcula desde el reloj.

            const numero =
                periodoMondo.number;

            textoPeriodo =
                formato === "texto"
                    ? `PERIODO ${numero}`
                    : `${numero}${sufijoPeriodo}`;

            etiqueta =
                `Periodo ${numero}`;
        }

    } else {

        /* ====================================
           FUENTE: MANUAL
           ==================================== */

        const valorOriginal =
            typeof periodo === "string"
                ? periodo.trim()
                : Number.isFinite(periodo)
                    ? String(Math.trunc(periodo))
                    : "";

        const esNumerico =
            /^\d+$/.test(valorOriginal);

        if (!esNumerico) {

            // Permitir texto manual.
            textoPeriodo = valorOriginal;

            etiqueta = valorOriginal
                ? `Periodo ${valorOriginal}`
                : "Sin periodo";

        } else {

            const numero = Math.max(
                1,
                Number(valorOriginal),
            );

            const limitePeriodos =
                cantidadPeriodos !== null &&
                Number.isFinite(cantidadPeriodos) &&
                cantidadPeriodos > 0
                    ? Math.trunc(cantidadPeriodos)
                    : null;

            const esProrroga =
                limitePeriodos !== null &&
                numero > limitePeriodos;

            if (
                esProrroga &&
                limitePeriodos !== null
            ) {

                // Prórrogas controladas manualmente
                const numeroProrroga =
                    numero - limitePeriodos;

                textoPeriodo =
                    formato === "texto"
                        ? `PRÓRROGA ${numeroProrroga}`
                        : `PR${numeroProrroga}`;

                etiqueta =
                    `Prórroga ${numeroProrroga}`;

            } else {

                textoPeriodo =
                    formato === "texto"
                        ? `PERIODO ${numero}`
                        : `${numero}${sufijoPeriodo}`;

                etiqueta =
                    `Periodo ${numero}`;
            }
        }
    }

    /* ========================================
       VISUALIZACION
       ======================================== */

    return (
        <div
            className="
                flex h-full w-full
                min-h-0 min-w-0
                overflow-hidden
            "
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

                fontVariantNumeric:
                    "tabular-nums",

                fontWeight: 500,

                lineHeight: 1,

                boxSizing: "border-box",
            }}
            aria-label={etiqueta}
        >
            <span
                className="
                    block min-w-0 max-w-full
                    overflow-hidden
                    text-ellipsis whitespace-nowrap
                "
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
