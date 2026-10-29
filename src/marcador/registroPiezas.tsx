
import type {
    DatosMarcador,
    PiezaMarcador,
    TipoPieza,
} from "./tipos";

import { CATEGORIAS } from "../const/categorias";

import { ID_RELOJ_PRINCIPAL } from "./datosIniciales";

import Tiempo from "./piezas/Tiempo";
import Puntos from "./piezas/Puntos";
import NombreEquipo from "./piezas/NombreEquipo";
import EscudoEquipo from "./piezas/EscudoEquipo";
import Periodo from "./piezas/Periodo";
import Faltas from "./piezas/Faltas";
import TiemposMuertos from "./piezas/TiemposMuertos";
import ReproductorMultimedia from "./piezas/ReproductorMultimedia";

/* ============================================
   MARCADOR CBA
   REGISTRO CENTRAL DE PIEZAS

   Período:
   - Manual / simulación
   - MONDO mediante Web Serial

   El decoder interpreta COM4.
   Este componente solo visualiza datos.
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
    { tipo: "multimedia", nombre: "Reproductor multimedia" },
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

    // ========================================
    // DATOS VINCULADOS
    // ========================================

    const partidoId =
        pieza.vinculacion.partidoId ??
        datos.partidoPrincipalId;

    const partido =
        datos.partidos[partidoId];

    const lado =
        pieza.vinculacion.lado;

    const equipo =
        partido && lado
            ? partido[lado]
            : null;

    const relojId =
        pieza.vinculacion.relojId;

    const reloj = relojId
        ? datos.relojes[relojId]
        : null;

    // ========================================
    // CONFIGURACIÓN DE CATEGORÍA
    // ========================================

    const categoria = CATEGORIAS.find(
        (cat) =>
            cat.id === partido?.categoriaId,
    );

    const cantidadPeriodos =
        categoria?.reglamento.periodos.cantidad ??
        null;

    // ========================================
    // PROPIEDADES GENERALES
    // ========================================

    const propiedades =
        pieza.propiedades ?? {};

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
        typeof propiedades.cantidadIndicadores ===
            "number" &&
        Number.isFinite(
            propiedades.cantidadIndicadores,
        )
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

    // ========================================
    // PERÍODO MONDO
    // ========================================

    /*
     * En la aplicación actual, el modo MONDO
     * queda reflejado en la fuente del
     * reloj principal.
     *
     * No es necesario volver a interpretar
     * los bytes ni utilizar Web Serial aquí.
     */

    const fuenteRelojPrincipal =
        datos.relojes[ID_RELOJ_PRINCIPAL]
            ?.fuente;

    const usarPeriodoMondo =
        fuenteRelojPrincipal === "mondo";

    /*
     * Estado interpretado por
     * DecodificadorMondo:
     *
     * quarter:
     *     AA 51 - AA 59
     *
     * overtime:
     *     AA 50
     *
     * empty:
     *     AA 5F
     */

    const periodoMondo =
        partido?.periodoMondo ?? null;

    // ========================================
    // CONFIGURACIÓN VISUAL DEL PERÍODO
    // ========================================

    /*
     * Ejemplos:
     *
     * sufijoPeriodo = "Q"
     *     1Q, 2Q, 3Q...
     *
     * textoExtra = "E"
     *     Prórroga normal
     *
     * textoExtraFiba = "O"
     *     Prórroga FIBA
     *
     * Estas opciones no modifican el decoder.
     */

    const sufijoPeriodo =
        typeof propiedades.sufijoPeriodo === "string"
            ? propiedades.sufijoPeriodo
            : "";

    const textoExtra =
        typeof propiedades.textoExtra === "string"
            ? propiedades.textoExtra
            : "E";

    const textoExtraFiba =
        typeof propiedades.textoExtraFiba === "string"
            ? propiedades.textoExtraFiba
            : "O";

    const modoFiba =
        propiedades.modoFiba === true;

    // ========================================
    // PROPIEDADES MULTIMEDIA
    // ========================================

    const multimediaSrc =
        typeof propiedades.src === "string"
            ? propiedades.src
            : null;

    const multimediaTipo =
        propiedades.tipoArchivo === "imagen"
            ? "imagen"
            : propiedades.tipoArchivo === "video"
                ? "video"
                : "auto";

    const multimediaBucle =
        propiedades.bucle !== false;

    const multimediaAjuste =
        propiedades.ajuste === "cubrir"
            ? "cubrir"
            : propiedades.ajuste === "estirar"
                ? "estirar"
                : "contener";

    // ========================================
    // REPRESENTACIÓN DE PIEZAS
    // ========================================

    return (
        <>

            {/* RELOJ */}

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

            {/* PERÍODO */}

            {pieza.tipo === "periodo" && partido && (
                <Periodo
                    periodo={partido.periodo}
                    periodoMondo={periodoMondo}
                    usarPeriodoMondo={usarPeriodoMondo}
                    cantidadPeriodos={cantidadPeriodos}
                    formato={formatoPeriodo}
                    sufijoPeriodo={sufijoPeriodo}
                    textoExtra={textoExtra}
                    textoExtraFiba={textoExtraFiba}
                    modoFiba={modoFiba}
                    estilo={pieza.estilo}
                />
            )}

            {/* FALTAS */}

            {pieza.tipo === "faltas" && equipo && (
                <Faltas
                    faltas={equipo.faltas}
                    estilo={pieza.estilo}
                    formato={formatoIndicadores}
                    cantidadIndicadores={
                        cantidadIndicadores ??
                        categoria?.reglamento.faltas
                            .bonusEquipo ??
                        5
                    }
                />
            )}

            {/* TIEMPOS MUERTOS */}

            {pieza.tipo === "tiempos-muertos" &&
                equipo && (
                    <TiemposMuertos
                        tiemposMuertos={
                            equipo.tiemposMuertos
                        }
                        estilo={pieza.estilo}
                        formato={formatoIndicadores}
                        cantidadIndicadores={
                            cantidadIndicadores ?? 3
                        }
                        representacion={
                            representacionTiempos
                        }
                    />
                )}

            {/* REPRODUCTOR MULTIMEDIA */}

            {pieza.tipo === "multimedia" && (
                <ReproductorMultimedia
                    src={multimediaSrc}
                    tipo={multimediaTipo}
                    bucle={multimediaBucle}
                    ajuste={multimediaAjuste}
                    estilo={pieza.estilo}
                />
            )}

        </>
    );
}
