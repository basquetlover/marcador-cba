
import type { DatosMarcador } from "./tipos";


/* ============================================
   MARCADOR CBA
   Datos iniciales del sistema
   ============================================ */


// 1. IDENTIFICADORES PRINCIPALES

export const ID_PARTIDO_PRINCIPAL = "partido-principal";

export const ID_RELOJ_PRINCIPAL = "reloj-principal";


// 2. ESTADO INICIAL

export const DATOS_INICIALES: DatosMarcador = {

    // Modo de funcionamiento
    modo: "individual",

    // Partido activo
    partidoPrincipalId: ID_PARTIDO_PRINCIPAL,


    // 3. PARTIDOS

    partidos: {
        [ID_PARTIDO_PRINCIPAL]: {

            id: ID_PARTIDO_PRINCIPAL,

            categoriaId: null,
            periodo: 1,

            posesion: null,


            // Equipo local
            local: {
                id: null,

                nombre: "C.B. Andratx",
                escudo: "/favicon.png",

                puntos: 0,
                faltas: 0,
                tiemposMuertos: 0,

                fuenteNombre: "manual",
                fuenteEscudo: "manual",
            },


            // Equipo visitante
            visitante: {
                id: null,

                nombre: "Visitante",
                escudo: null,

                puntos: 0,
                faltas: 0,
                tiemposMuertos: 0,

                fuenteNombre: "manual",
                fuenteEscudo: "manual",
            },

        },
    },


    // 4. RELOJES

    relojes: {
        [ID_RELOJ_PRINCIPAL]: {

            id: ID_RELOJ_PRINCIPAL,

            fuente: "mondo",

            // Sin datos hasta conectar la consola
            texto: "--:--",

            actualizadoEn: null,

        },
    },

};
