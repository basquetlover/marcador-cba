
import type { EstiloPieza } from "../tipos";


/* ============================================
   MARCADOR CBA
   Pieza visual: Escudo de equipo
   ============================================ */


// 1. PROPIEDADES

interface EscudoEquipoProps {
    escudo: string | null;
    nombreEquipo?: string;
    estilo: EstiloPieza;
    ajuste?: "contener" | "cubrir";
}


// 2. COMPONENTE PRINCIPAL

export default function EscudoEquipo({
    escudo,
    nombreEquipo,
    estilo,
    ajuste = "contener",
}: EscudoEquipoProps) {

    // 3. CONFIGURACIÓN VISUAL

    const fondo = estilo.fondo ?? "transparent";

    const alineacion = estilo.alineacion ?? "centro";

    const posicionHorizontal =
        alineacion === "izquierda"
            ? "left"
            : alineacion === "derecha"
                ? "right"
                : "center";

    const modoAjuste =
        ajuste === "cubrir"
            ? "cover"
            : "contain";


    // 4. ÚNICO RETURN

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

                boxSizing: "border-box",
            }}
        >
            {escudo && (
                <img
                    src={escudo}
                    alt={
                        nombreEquipo
                            ? `Escudo de ${nombreEquipo}`
                            : "Escudo del equipo"
                    }
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    style={{
                        display: "block",

                        width: "100%",
                        height: "100%",

                        objectFit: modoAjuste,

                        objectPosition: `${posicionHorizontal} center`,

                        userSelect: "none",

                        pointerEvents: "none",
                    }}
                />
            )}
        </div>
    );
}
