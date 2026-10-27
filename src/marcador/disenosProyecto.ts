
import type { DisenoMarcador } from "./tipos";

/* ============================================
   MARCADOR CBA
   Diseños del proyecto
   ============================================ */

// 1. RESOLUCIÓN BASE DEL MARCADOR

export const RESOLUCION_MARCADOR = {
    ancho: 832,
    alto: 520,
};

// 2. DISEÑO SIMPLE
// Basado en el XML recibido: Layout(2).xml

export const DISENO_PROYECTO_SIMPLE: DisenoMarcador = {
    version: 1,

    id: "cba_dis_simple",
    nombre: "Diseño Simple",

    miniatura: "simple",

    resolucion: {
        ancho: RESOLUCION_MARCADOR.ancho,
        alto: RESOLUCION_MARCADOR.alto,
    },

    fondo: "transparent",

    capas: [

        // Fondo general del layout
        {
            id: "simple-fondo-general",
            tipo: "imagen",
            nombre: "Fondo general",

            x: 0,
            y: 0,

            ancho: 832,
            alto: 520,

            zIndex: 1,

            visible: true,
            bloqueado: true,

            vinculacion: {},

            estilo: {},

            propiedades: {
                src: "/marcador/simple/fondoVacio.png",
                ajuste: "cubrir",
            },
        },

         // ====================================
        // REPRODUCTOR MULTIMEDIA
        // VideoReady del XML original
        // ====================================

        {
            id: "simple-reproductor-multimedia",
            tipo: "multimedia",
            nombre: "Reproductor multimedia",

            x: 187,
            y: 54,
            ancho: 460,
            alto: 268,

            zIndex: 25,
            visible: true,
            bloqueado: false,

            vinculacion: {},

            estilo: {
                fondo: "#032a55",
                color: "#FFC801",
                alineacion: "centro",
            },

            propiedades: {
                src: "",
                tipoArchivo: "auto",
                bucle: true,
                ajuste: "contener",
            },
        },

        // Escudo local
        {
            id: "simple-escudo-local",
            tipo: "escudo-equipo",
            nombre: "Escudo local",

            x: 48,
            y: 18,

            ancho: 90,
            alto: 90,

            zIndex: 20,

            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
                lado: "local",
            },

            estilo: {
                fondo: "transparent",
                alineacion: "centro",
            },

            propiedades: {
                ajuste: "contener",
            },
        },

        // Escudo visitante
        {
            id: "simple-escudo-visitante",
            tipo: "escudo-equipo",
            nombre: "Escudo visitante",

            x: 693,
            y: 18,

            ancho: 90,
            alto: 90,

            zIndex: 20,

            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
                lado: "visitante",
            },

            estilo: {
                fondo: "transparent",
                alineacion: "centro",
            },

            propiedades: {
                ajuste: "contener",
            },
        },

        // Fondo nombre local
        {
            id: "simple-marco-nombre-local",
            tipo: "imagen",
            nombre: "Fondo nombre local",

            x: 18,
            y: 112,
            ancho: 160,
            alto: 103,

            zIndex: 10,
            visible: true,
            bloqueado: false,

            vinculacion: {},
            estilo: {},

            propiedades: {
                src: "/marcador/simple/marcoNombreLocal.png",
                ajuste: "estirar",
            },
        },

        // Nombre local
        {
            id: "simple-nombre-local",
            tipo: "nombre-equipo",
            nombre: "Nombre equipo local",

            x: 18,
            y: 112,
            ancho: 160,
            alto: 103,

            zIndex: 30,
            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
                lado: "local",
            },

            estilo: {
                color: "rgb(3, 50, 102)",
                fondo: "transparent",
                fuente: "Arial, sans-serif",
                tamanoFuente: 18,
                alineacion: "centro",
            },

            propiedades: {
                numeroDeLineas: 2,
                espaciado: 31,
            },
        },

        // Fondo nombre visitante
        {
            id: "simple-marco-nombre-visitante",
            tipo: "imagen",
            nombre: "Fondo nombre visitante",

            x: 664,
            y: 112,
            ancho: 160,
            alto: 103,

            zIndex: 10,
            visible: true,
            bloqueado: false,

            vinculacion: {},
            estilo: {},

            propiedades: {
                src: "/marcador/simple/marcoNombreLocal.png",
                ajuste: "estirar",
            },
        },
        // Nombre visitante
        {
            id: "simple-nombre-visitante",
            tipo: "nombre-equipo",
            nombre: "Nombre equipo visitante",

            x: 664,
            y: 112,
            ancho: 160,
            alto: 103,

            zIndex: 30,
            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
                lado: "visitante",
            },

            estilo: {
                color: "rgb(3, 50, 102)",
                fondo: "transparent",
                fuente: "Arial, sans-serif",
                tamanoFuente: 18,
                alineacion: "centro",
            },

            propiedades: {
                negrita: true,
                numeroDeLineas: 2,
                espaciado: 31,
            },
        },

        // Puntos local
        {
            id: "simple-puntos-local",
            tipo: "puntos",
            nombre: "Puntos local",

            x: 0,
            y: 209,

            ancho: 200,
            alto: 100,

            zIndex: 30,

            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
                lado: "local",
            },

            estilo: {
                color: "rgb(255, 200, 1)",
                fondo: "transparent",
                fuente: "Arial, sans-serif",
                tamanoFuente: 70,
                alineacion: "centro",
            },

            propiedades: {
                offsetX: -19,
                offsetY: 0,
                anchoTexto: 226,
                altoTexto: 100,
            },
        },

        // Puntos visitante
        {
            id: "simple-puntos-visitante",
            tipo: "puntos",
            nombre: "Puntos visitante",

            x: 650,
            y: 210,

            ancho: 180,
            alto: 100,

            zIndex: 30,

            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
                lado: "visitante",
            },

            estilo: {
                color: "rgb(255, 200, 1)",
                fondo: "transparent",
                fuente: "Arial, sans-serif",
                tamanoFuente: 70,
                alineacion: "centro",
            },

            propiedades: {
                offsetX: -25,
                offsetY: 0,
                anchoTexto: 226,
                altoTexto: 100,
            },
        },

        // Faltas local
        {
            id: "simple-faltas-local",
            tipo: "faltas",
            nombre: "Faltas local",

            x: 65,
            y: 365,

            ancho: 100,
            alto: 40,

            zIndex: 30,

            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
                lado: "local",
            },

            estilo: {
                color: "rgb(255, 200, 1)",
                fondo: "transparent",
                fuente: "Arial, sans-serif",
                tamanoFuente: 40,
                alineacion: "centro",
            },

            propiedades: {
                formato: "numero",
                cantidadIndicadores: 5,
            },
        },

        // Faltas visitante
        {
            id: "simple-faltas-visitante",
            tipo: "faltas",
            nombre: "Faltas visitante",

            x: 715,
            y: 365,

            ancho: 100,
            alto: 40,

            zIndex: 30,

            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
                lado: "visitante",
            },

            estilo: {
                color: "rgb(255, 200, 1)",
                fondo: "transparent",
                fuente: "Arial, sans-serif",
                tamanoFuente: 40,
                alineacion: "centro",
            },

            propiedades: {
                formato: "numero",
                cantidadIndicadores: 5,
            },
        },

        // Fondo del reloj
        {
            id: "simple-marco-tiempo",
            tipo: "imagen",
            nombre: "Fondo del reloj",

            x: 236,
            y: 348,
            ancho: 360,
            alto: 140,

            zIndex: 10,
            visible: true,
            bloqueado: false,

            vinculacion: {},
            estilo: {},

            propiedades: {
                src: "/marcador/simple/marcoTiempo.png",
                ajuste: "estirar",
            },
        },

        // Tiempo principal
        {
            id: "simple-tiempo-principal",
            tipo: "tiempo",
            nombre: "Tiempo principal",

            x: 260,
            y: 336,

            ancho: 312,
            alto: 120,

            zIndex: 40,

            visible: true,
            bloqueado: false,

            vinculacion: {
                relojId: "reloj-principal",
            },

            estilo: {
                color: "rgb(255, 255, 255)",
                fondo: "transparent",
                fuente: "Arial, sans-serif",
                tamanoFuente: 70,
                alineacion: "centro",
            },

            propiedades: {},
        },

        // Periodo
        {
            id: "simple-periodo",
            tipo: "periodo",
            nombre: "Periodo",

            x: 430,
            y: 445,

            ancho: 50,
            alto: 38,

            zIndex: 40,

            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
            },

            estilo: {
                color: "rgb(255, 100, 0)",
                fondo: "transparent",
                fuente: "Arial, sans-serif",
                tamanoFuente: 26,
                alineacion: "centro",
            },

            propiedades: {
                formato: "numero",
            },
        },

        // Tiempos muertos local
        {
            id: "simple-tiempo-muerto-local",
            tipo: "tiempos-muertos",
            nombre: "Tiempos muertos local",

            x: 42,
            y: 469,

            ancho: 102,
            alto: 20,

            zIndex: 35,

            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
                lado: "local",
            },

            estilo: {
                color: "rgb(255, 255, 0)",
                fondo: "transparent",
                fuente: "Helvetica, Arial, sans-serif",
                tamanoFuente: 20,
                alineacion: "centro",
            },

            propiedades: {
                formato: "indicadores",
                representacion: "disponibles",
                cantidadIndicadores: 3,
            },
        },

        // Tiempos muertos visitante
        {
            id: "simple-tiempo-muerto-visitante",
            tipo: "tiempos-muertos",
            nombre: "Tiempos muertos visitante",

            x: 688,
            y: 469,

            ancho: 102,
            alto: 20,

            zIndex: 35,

            visible: true,
            bloqueado: false,

            vinculacion: {
                partidoId: "partido-principal",
                lado: "visitante",
            },

            estilo: {
                color: "rgb(255, 255, 0)",
                fondo: "transparent",
                fuente: "Helvetica, Arial, sans-serif",
                tamanoFuente: 20,
                alineacion: "centro",
            },

            propiedades: {
                formato: "indicadores",
                representacion: "disponibles",
                cantidadIndicadores: 3,
            },
        },

    ],
};

// 3. DISEÑO COMPLETO
// Provisional hasta recibir el XML del marcador completo.
// Mantiene la misma resolución base y la misma compatibilidad.

export const DISENO_PROYECTO_COMPLETO: DisenoMarcador = {
    version: 1,

    id: "cba_dis_completo",
    nombre: "Diseño Completo",

    miniatura: "completo",

    resolucion: {
        ancho: RESOLUCION_MARCADOR.ancho,
        alto: RESOLUCION_MARCADOR.alto,
    },

    fondo: "transparent",

    capas: [
        ...DISENO_PROYECTO_SIMPLE.capas,
    ],
};

// 4. LISTADO GENERAL DE DISEÑOS DEL PROYECTO

export const DISENOS_PROYECTO: DisenoMarcador[] = [
    DISENO_PROYECTO_SIMPLE,
    DISENO_PROYECTO_COMPLETO,
];

// 5. ACCESO RÁPIDO POR ID

export const DISENOS_PROYECTO_POR_ID: Record<string, DisenoMarcador> = {
    [DISENO_PROYECTO_SIMPLE.id]: DISENO_PROYECTO_SIMPLE,
    [DISENO_PROYECTO_COMPLETO.id]: DISENO_PROYECTO_COMPLETO,
};