export const DISENOS = [
    {
        id: "cba_dis_simple",
        nombre: "Diseño Simple",
        miniatura: "simple",
        estructura: {
            nombreEquiLocal: true,
            nombreEquiVisitante: true,
            marcadorLocal: true,
            marcadorVisitante: true,
            periodo: true,
            tiempo: true,
            escudoLocal: true,
            escudoVisitante: true,
            faltasEquipo: true,
            tiempoMuerto: true,
            publicidad: true,
            posesion: false,
            infoJugador: false,
            detalleJugador: {
                numero: false,
                faltas: false,
                puntos: false,
            }
        }
    },
    {
        id: "cba_dis_completo",
        nombre: "Diseño Completo",
        miniatura: "completo",
        estructura: {
            nombreEquiLocal: true,
            nombreEquiVisitante: true,
            marcadorLocal: true,
            marcadorVisitante: true,
            periodo: true,
            tiempo: true,
            escudoLocal: true,
            escudoVisitante: true,
            faltasEquipo: true,
            tiempoMuerto: true,
            publicidad: true,
            posesion: false,
            infoJugador: true,
            detalleJugador: {
                numero: true,
                faltas: true,
                puntos: true,
            }
        }
    }
]