
import type {
    DatosMarcador,
    PiezaMarcador,
    TipoPieza,
} from "./tipos";

import { CATEGORIAS } from "../const/categorias";

import Tiempo from "./piezas/Tiempo";
import Puntos from "./piezas/Puntos";
import NombreEquipo from "./piezas/NombreEquipo";
import EscudoEquipo from "./piezas/EscudoEquipo";
import Periodo from "./piezas/Periodo";
import Faltas from "./piezas/Faltas";
import TiemposMuertos from "./piezas/TiemposMuertos";


/* ============================================
   MARCADOR CBA
   Registro central de piezas
   ============================================ */


// 1. PIEZAS DISPONIBLES

export const PIEZAS_DISPONIBLES: {
    tipo: TipoPieza;
    nombre: string;
}[] = [
    { tipo: "tiempo", nombre: "Tiempo" },
    { tipo: "puntos", nombre: "Puntos" },
    { tipo: "nombre-equipo", nombre: "Nombre de equipo" },
    { tipo: "escudo-equipo", nombre: "Escudo de equipo" },
    { tipo: "periodo", nombre: "Periodo" },
    { tipo: "faltas", nombre: "Faltas de equipo" },
    { tipo: "tiempos-muertos", nombre: "Tiempos muertos" },
];


// 2. PROPIEDADES

interface RegistroPiezasProps {
    pieza: PiezaMarcador;
    datos: DatosMarcador;
}


// 3. COMPONENTE PRINCIPAL

export default function RegistroPiezas({
    pieza,
    datos,
}: RegistroPiezasProps) {

    // 4. IDENTIFICAR DATOS VINCULADOS

    const partidoId =
        pieza.vinculacion.partidoId ??
        datos.partidoPrincipalId;

    const partido = datos.partidos[partidoId];

    const lado = pieza.vinculacion.lado;

    const equipo =
        partido && lado
            ? partido[lado]
            : null;

    const relojId = pieza.vinculacion.relojId;

    const reloj = relojId
        ? datos.relojes[relojId]
        : null;


    // 5. CONFIGURACIÓN DE LA CATEGORÍA

    const categoria = CATEGORIAS.find(
        (cat) => cat.id === partido?.categoriaId,
    );

    const cantidadPeriodos =
        categoria?.reglamento.periodos.cantidad ?? null;


    // 6. PROPIEDADES DE LA PIEZA

    const propiedades = pieza.propiedades ?? {};

    const formatoPeriodo =
        propiedades.formato === "texto"
            ? "texto"
            : "numero";

    const formatoIndicadores =
        propiedades.formato === "numero"
            ? "numero"
            : propiedades.formato === "ambos"
                ? "ambos"
                : "indicadores";

    const cantidadIndicadores =
        typeof propiedades.cantidadIndicadores === "number" &&
        Number.isFinite(propiedades.cantidadIndicadores)
            ? propiedades.cantidadIndicadores
            : undefined;

    const representacionTiempos =
        propiedades.representacion === "utilizados"
            ? "utilizados"
            : "disponibles";

    const ajusteEscudo =
        propiedades.ajuste === "cubrir"
            ? "cubrir"
            : "contener";


    // 7. ÚNICO RETURN

    return (
        <>

            {/* TIEMPO */}
            {pieza.tipo === "tiempo" && (
                <Tiempo
                    texto={reloj?.texto ?? "--:--"}
                    estilo={pieza.estilo}
                />
            )}


            {/* PUNTOS */}
            {pieza.tipo === "puntos" && equipo && (
                <Puntos
                    puntos={equipo.puntos}
                    estilo={pieza.estilo}
                />
            )}


            {/* NOMBRE DEL EQUIPO */}
            {pieza.tipo === "nombre-equipo" && equipo && (
                <NombreEquipo
                    nombre={equipo.nombre}
                    estilo={pieza.estilo}
                />
            )}


            {/* ESCUDO DEL EQUIPO */}
            {pieza.tipo === "escudo-equipo" && equipo && (
                <EscudoEquipo
                    escudo={equipo.escudo}
                    nombreEquipo={equipo.nombre}
                    estilo={pieza.estilo}
                    ajuste={ajusteEscudo}
                />
            )}


            {/* PERIODO */}
            {pieza.tipo === "periodo" && partido && (
                <Periodo
                    periodo={partido.periodo}
                    cantidadPeriodos={cantidadPeriodos}
                    formato={formatoPeriodo}
                    estilo={pieza.estilo}
                />
            )}


            {/* FALTAS DEL EQUIPO */}
            {pieza.tipo === "faltas" && equipo && (
                <Faltas
                    faltas={equipo.faltas}
                    estilo={pieza.estilo}
                    formato={formatoIndicadores}
                    cantidadIndicadores={
                        cantidadIndicadores ??
                        categoria?.reglamento.faltas.bonusEquipo ??
                        5
                    }
                />
            )}


            {/* TIEMPOS MUERTOS */}
            {pieza.tipo === "tiempos-muertos" && equipo && (
                <TiemposMuertos
                    tiemposMuertos={equipo.tiemposMuertos}
                    estilo={pieza.estilo}
                    formato={formatoIndicadores}
                    cantidadIndicadores={
                        cantidadIndicadores ?? 3
                    }
                    representacion={representacionTiempos}
                />
            )}

        </>
    );
}
