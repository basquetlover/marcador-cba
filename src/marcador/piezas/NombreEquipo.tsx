
import type { EstiloPieza } from "../tipos";


/* ============================================
   MARCADOR CBA
   Pieza visual: Nombre de equipo
   ============================================ */


// 1. PROPIEDADES

interface NombreEquipoProps {
    nombre: string;
    estilo: EstiloPieza;
}


// 2. COMPONENTE PRINCIPAL

export default function NombreEquipo({ nombre, estilo }: NombreEquipoProps) {

    // 3. CONFIGURACIÓN VISUAL

    const color = estilo.color ?? "#FFFFFF";

    const fondo = estilo.fondo ?? "transparent";

    const fuente = estilo.fuente ?? '"Hanken Grotesk", sans-serif';

    const tamanoFuente = estilo.tamanoFuente ?? 64;

    const alineacion = estilo.alineacion ?? "centro";


    // 4. ÚNICO RETURN

    return (
        <div
            className="flex h-full w-full min-w-0 overflow-hidden"
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

                fontWeight: 700,

                lineHeight: 1.1,

                boxSizing: "border-box",
            }}
            aria-label={`Equipo: ${nombre}`}
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

                    textTransform: "uppercase",
                }}
            >
                {nombre}
            </span>
        </div>
    );
}
