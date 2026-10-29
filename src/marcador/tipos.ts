
import type { PeriodoMondo } from "./DecodificadorMondo";

/* ============================================
   MARCADOR CBA
   Tipos generales del sistema
   ============================================ */


// 1. TIPOS GENERALES

export type LadoEquipo = "local" | "visitante";

export type ModoMarcador =
    | "individual"
    | "multipista";

export type FuenteTiempo =
    | "mondo"
    | "manual";

export type FuenteEquipo =
    | "manual"
    | "fbib"
    | "base-datos";


// 2. EQUIPOS

export interface EquipoMarcador {
    id: string | null;

    nombre: string;
    escudo: string | null;

    puntos: number;
    faltas: number;
    tiemposMuertos: number;

    fuenteNombre: FuenteEquipo;
    fuenteEscudo: FuenteEquipo;
}


// 3. PARTIDOS

export interface PartidoMarcador {
    id: string;

    categoriaId: string | null;

    /*
     * PERÍODO NUMÉRICO
     *
     * Conserva la compatibilidad con:
     * - Controles manuales
     * - Botones + y -
     * - Componentes existentes
     *
     * Cuando MONDO envía AA 51-59,
     * este número también se actualiza.
     *
     * AA 50 y AA 5F no deben convertir
     * este número en cero.
     */
    periodo: number;

    /*
     * PERÍODO RECIBIDO DESDE MONDO
     *
     * undefined:
     *   Todavía no se ha establecido.
     *
     * null:
     *   No existe una lectura MONDO activa.
     *
     * quarter:
     *   AA 51-59 => períodos 1-9.
     *
     * overtime:
     *   AA 50 => tiempo extra.
     *
     * empty:
     *   AA 5F => no mostrar período.
     *
     * El objeto conserva el byte original.
     */
    periodoMondo?: PeriodoMondo | null;

    local: EquipoMarcador;
    visitante: EquipoMarcador;

    posesion: LadoEquipo | null;
}


// 4. RELOJES

export interface RelojMarcador {
    id: string;

    fuente: FuenteTiempo;
    texto: string;

    actualizadoEn: number | null;
}


// 5. ESTADO GENERAL DEL MARCADOR

export interface DatosMarcador {
    modo: ModoMarcador;

    partidoPrincipalId: string;

    partidos: Record<
        string,
        PartidoMarcador
    >;

    relojes: Record<
        string,
        RelojMarcador
    >;
}


// 6. TIPOS DE PIEZAS

export type TipoPieza =
    | "tiempo"
    | "puntos"
    | "nombre-equipo"
    | "escudo-equipo"
    | "periodo"
    | "faltas"
    | "tiempos-muertos"
    | "posesion"
    | "imagen"
    | "texto"
    | "multimedia"
    | (string & {});


// 7. VINCULACIÓN DE PIEZAS

export interface VinculacionPieza {
    relojId?: string;

    partidoId?: string;

    lado?: LadoEquipo;
}


// 8. ESTILOS DE PIEZAS

export interface EstiloPieza {
    color?: string;
    fondo?: string;

    fuente?: string;
    tamanoFuente?: number;

    alineacion?:
        | "izquierda"
        | "centro"
        | "derecha";
}


// 9. PIEZA DEL MARCADOR

export interface PiezaMarcador {
    id: string;

    tipo: TipoPieza;
    nombre: string;

    // Posición en el lienzo

    x: number;
    y: number;

    // Dimensiones

    ancho: number;
    alto: number;

    // Orden de capas

    zIndex: number;

    // Estado visual

    visible: boolean;
    bloqueado: boolean;

    // Datos asociados

    vinculacion: VinculacionPieza;

    // Apariencia

    estilo: EstiloPieza;

    // Opciones adicionales

    propiedades?: Record<
        string,
        string | number | boolean | null
    >;
}


// 10. DISEÑOS DEL MARCADOR

export interface DisenoMarcador {
    version: 1;

    id: string;
    nombre: string;

    miniatura?: string;

    resolucion: {
        ancho: number;
        alto: number;
    };

    fondo: string;

    capas: PiezaMarcador[];
}
