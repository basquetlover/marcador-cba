
import type { EstiloPieza } from "../tipos";


/* ============================================
   MARCADOR CBA
   Pieza visual: Tiempo
   ============================================ */


// 1. PROPIEDADES

interface TiempoProps {
    texto: string;
    estilo: EstiloPieza;
}


// 2. COMPONENTE PRINCIPAL

export default function Tiempo({ texto, estilo }: TiempoProps) {

    // 3. CONFIGURACIÓN VISUAL

    const color = estilo.color ?? "#FFFFFF";

    const fondo = estilo.fondo ?? "transparent";

    const fuente = estilo.fuente ?? '"Bebas Neue", sans-serif';

    const tamanoFuente = estilo.tamanoFuente ?? 120;

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
            aria-label={`Tiempo de juego: ${texto}`}
        >
            {texto}
        </div>
    );
}
