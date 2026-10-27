
import { useEffect, useRef, useState } from "react";

import type {
    DatosMarcador,
    DisenoMarcador,
} from "./tipos";

import RegistroPiezas from "./registroPiezas";


/* ============================================
   MARCADOR CBA
   Renderizador de capas del marcador
   ============================================ */


// 1. PROPIEDADES

interface LienzoMarcadorProps {
    diseno: DisenoMarcador;
    datos: DatosMarcador;

    alineacion?: "inicio" | "centro";
}


// 2. COMPONENTE PRINCIPAL

export default function LienzoMarcador({
    diseno,
    datos,
    alineacion = "inicio",
}: LienzoMarcadorProps) {

    // 3. REFERENCIAS

    const contenedorRef = useRef<HTMLDivElement>(null);


    // 4. ESTADOS

    const [dimensiones, setDimensiones] = useState({
        ancho: 0,
        alto: 0,
    });


    // 5. DETECTAR CAMBIOS DE TAMAÑO

    useEffect(() => {

        const contenedor = contenedorRef.current;

        if (!contenedor) return;

        const actualizarDimensiones = () => {

            const rectangulo = contenedor.getBoundingClientRect();

            setDimensiones((actual) => {

                if (
                    actual.ancho === rectangulo.width &&
                    actual.alto === rectangulo.height
                ) {
                    return actual;
                }

                return {
                    ancho: rectangulo.width,
                    alto: rectangulo.height,
                };

            });

        };

        const observador = new ResizeObserver(
            actualizarDimensiones,
        );

        observador.observe(contenedor);

        actualizarDimensiones();

        return () => {
            observador.disconnect();
        };

    }, []);


    // 6. RESOLUCIÓN DEL DISEÑO

    const anchoDiseno = Math.max(
        1,
        diseno.resolucion.ancho,
    );

    const altoDiseno = Math.max(
        1,
        diseno.resolucion.alto,
    );


    // 7. ESCALADO PROPORCIONAL

    const escala =
        dimensiones.ancho > 0 &&
        dimensiones.alto > 0
            ? Math.min(
                dimensiones.ancho / anchoDiseno,
                dimensiones.alto / altoDiseno,
            )
            : 0;


    // 8. POSICIÓN DEL LIENZO

    const desplazamientoX =
        alineacion === "centro"
            ? (dimensiones.ancho - anchoDiseno * escala) / 2
            : 0;

    const desplazamientoY =
        alineacion === "centro"
            ? (dimensiones.alto - altoDiseno * escala) / 2
            : 0;


    // 9. ORDENAR CAPAS

    const capasOrdenadas = [...diseno.capas]
        .filter((pieza) => pieza.visible)
        .sort((a, b) => a.zIndex - b.zIndex);


    // 10. ÚNICO RETURN

    return (
        <div
            ref={contenedorRef}
            className="relative h-full w-full overflow-hidden"
            style={{
                backgroundColor: diseno.fondo,
                isolation: "isolate",
            }}
            aria-label={`Marcador: ${diseno.nombre}`}
        >

            {/* LIENZO ORIGINAL */}
            {escala > 0 && (

                <div
                    className="absolute overflow-hidden"
                    style={{
                        left: desplazamientoX,
                        top: desplazamientoY,

                        width: anchoDiseno,
                        height: altoDiseno,

                        transform: `scale(${escala})`,

                        transformOrigin: "top left",

                        backgroundColor: diseno.fondo,
                    }}
                >

                    {/* CAPAS DEL DISEÑO */}
                    {capasOrdenadas.map((pieza) => (

                        <div
                            key={pieza.id}
                            className="absolute overflow-hidden"
                            data-pieza-id={pieza.id}
                            data-pieza-tipo={pieza.tipo}
                            style={{
                                left: pieza.x,
                                top: pieza.y,

                                width: pieza.ancho,
                                height: pieza.alto,

                                zIndex: pieza.zIndex,

                                boxSizing: "border-box",
                            }}
                        >

                            {/* FONDOS, MARCOS E IMÁGENES */}
                            {pieza.tipo === "imagen" ? (

                                <div
                                    className="h-full w-full"
                                    role="presentation"
                                    style={{
                                        backgroundImage:
                                            typeof pieza.propiedades?.src === "string"
                                                ? `url("${pieza.propiedades.src}")`
                                                : "none",

                                        backgroundRepeat: "no-repeat",

                                        backgroundPosition: "center",

                                        backgroundSize:
                                            pieza.propiedades?.ajuste === "contener"
                                                ? "contain"
                                                : pieza.propiedades?.ajuste === "cubrir"
                                                    ? "cover"
                                                    : "100% 100%",
                                    }}
                                />

                            ) : (

                                /* PIEZAS FUNCIONALES */
                                <RegistroPiezas
                                    pieza={pieza}
                                    datos={datos}
                                />

                            )}

                        </div>

                    ))}

                </div>

            )}

        </div>
    );
}
