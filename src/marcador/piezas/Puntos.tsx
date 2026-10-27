
import type { EstiloPieza } from "../tipos";


/* ============================================
   MARCADOR CBA
   Pieza visual: Puntos
   ============================================ */


// 1. PROPIEDADES

interface PuntosProps {
    puntos: number;
    estilo: EstiloPieza;
}


// 2. COMPONENTE PRINCIPAL

export default function Puntos({ puntos, estilo }: PuntosProps) {

    // 3. CONFIGURACIÓN VISUAL

    const color = estilo.color ?? "#FFC801";

    const fondo = estilo.fondo ?? "transparent";

    const fuente = estilo.fuente ?? '"Bebas Neue", sans-serif';

    const tamanoFuente = estilo.tamanoFuente ?? 140;

    const alineacion = estilo.alineacion ?? "centro";


    // 4. ÚNICO RETURN

    return (
        <div
            className="flex h-full w-full overflow-hidden"
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

                whiteSpace: "nowrap",

                boxSizing: "border-box",
            }}
            aria-label={`Puntuación: ${puntos}`}
        >
            {puntos}
        </div>
    );
}
