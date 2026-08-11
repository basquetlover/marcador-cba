export const CATEGORIAS = [
    {
        id: "premini",
        nombre: "Premini",

        reglamento: {
            periodos: {
                cantidad: 8,
                duracion: 6 * 60,
                descansoEntrePeriodos: 1 * 60,
                descansoMedioPartido: 5 * 60,
            },

            prorroga: {
                permitida: true,
                duracion: 5 * 60,
                descansoPrevio: 2 * 60,
                cantidadMaxima: null,
            },

            reloj: {
                cuentaAtras: true,
                detenerEnTiempoMuerto: true,
                detenerEnTirosLibres: true,
            },

            posesion: {
                activa: true,
                duracion: 24,
                reinicioOfensivo: 14,
            },

            faltas: {
                maximasJugador: 5,
                bonusEquipo: 5,
                reiniciarCadaPeriodo: true,
                reiniciarEnProrroga: false,
            },

            tiemposMuertos: {
                primeraMitad: 2,
                segundaMitad: 2,
                porProrroga: 1,
                duracion: 60,
            },
        },

        configuracionMarcador: {
        detalleJugador: {
            numero: true,
            faltas: true,
            puntos: false,
        },
    },
    },
    {
        id: "mini",
        nombre: "Mini",

        reglamento: {
            periodos: {
                cantidad: 6,
                duracion: 8 * 60,
                descansoEntrePeriodos: 1 * 60,
                descansoMedioPartido: 5 * 60,
            },

            prorroga: {
                permitida: true,
                duracion: 5 * 60,
                descansoPrevio: 2 * 60,
                cantidadMaxima: null,
            },

            reloj: {
                cuentaAtras: true,
                detenerEnTiempoMuerto: true,
                detenerEnTirosLibres: true,
            },

            posesion: {
                activa: true,
                duracion: 24,
                reinicioOfensivo: 14,
            },

            faltas: {
                maximasJugador: 5,
                bonusEquipo: 5,
                reiniciarCadaPeriodo: true,
                reiniciarEnProrroga: false,
            },

            tiemposMuertos: {
                primeraMitad: 2,
                segundaMitad: 2,
                porProrroga: 1,
                duracion: 60,
            },
        },

        configuracionMarcador: {
        detalleJugador: {
            numero: true,
            faltas: true,
            puntos: false,
        },
    },
    },
    {
    id: "infantil",
    nombre: "Infantil",

    reglamento: {
        periodos: {
        cantidad: 4,
        duracion: 10 * 60,
        descansoEntrePeriodos: 1 * 60,
        descansoMedioPartido: 10 * 60,
        },

        prorroga: {
        permitida: true,
        duracion: 5 * 60,
        descansoPrevio: 2 * 60,
        cantidadMaxima: null,
        },

        reloj: {
        cuentaAtras: true,
        detenerEnTiempoMuerto: true,
        detenerEnTirosLibres: true,
        },

        posesion: {
        activa: true,
        duracion: 24,
        reinicioOfensivo: 14,
        },

        faltas: {
        maximasJugador: 5,
        bonusEquipo: 5,
        reiniciarCadaPeriodo: true,
        reiniciarEnProrroga: false,
        },

        tiemposMuertos: {
        primeraMitad: 2,
        segundaMitad: 3,
        porProrroga: 1,
        duracion: 60,
        },
    },

    configuracionMarcador: {
        detalleJugador: {
        numero: true,
        faltas: true,
        puntos: false,
        },
    },
    },
    {
    id: "cadete",
    nombre: "Cadete",

    reglamento: {
        periodos: {
        cantidad: 4,
        duracion: 10 * 60,
        descansoEntrePeriodos: 1 * 60,
        descansoMedioPartido: 10 * 60,
        },

        prorroga: {
        permitida: true,
        duracion: 5 * 60,
        descansoPrevio: 2 * 60,
        cantidadMaxima: null,
        },

        reloj: {
        cuentaAtras: true,
        detenerEnTiempoMuerto: true,
        detenerEnTirosLibres: true,
        },

        posesion: {
        activa: true,
        duracion: 24,
        reinicioOfensivo: 14,
        },

        faltas: {
        maximasJugador: 5,
        bonusEquipo: 5,
        reiniciarCadaPeriodo: true,
        reiniciarEnProrroga: false,
        },

        tiemposMuertos: {
        primeraMitad: 2,
        segundaMitad: 3,
        porProrroga: 1,
        duracion: 60,
        },
    },

    configuracionMarcador: {
        detalleJugador: {
        numero: true,
        faltas: true,
        puntos: true,
        },
    },
    },
    {
    id: "junior",
    nombre: "Junior",

    reglamento: {
        periodos: {
        cantidad: 4,
        duracion: 10 * 60,
        descansoEntrePeriodos: 1 * 60,
        descansoMedioPartido: 10 * 60,
        },

        prorroga: {
        permitida: true,
        duracion: 5 * 60,
        descansoPrevio: 2 * 60,
        cantidadMaxima: null,
        },

        reloj: {
        cuentaAtras: true,
        detenerEnTiempoMuerto: true,
        detenerEnTirosLibres: true,
        },

        posesion: {
        activa: true,
        duracion: 24,
        reinicioOfensivo: 14,
        },

        faltas: {
        maximasJugador: 5,
        bonusEquipo: 5,
        reiniciarCadaPeriodo: true,
        reiniciarEnProrroga: false,
        },

        tiemposMuertos: {
        primeraMitad: 2,
        segundaMitad: 3,
        porProrroga: 1,
        duracion: 60,
        },
    },

    configuracionMarcador: {
        detalleJugador: {
        numero: true,
        faltas: true,
        puntos: true,
        },
    },
    },
    {
    id: "senior",
    nombre: "Senior",

    reglamento: {
        periodos: {
        cantidad: 4,
        duracion:  10 * 60,
        descansoEntrePeriodos: 1 * 60,
        descansoMedioPartido: 10 * 60,
        },

        prorroga: {
        permitida: true,
        duracion: 5 * 60,
        descansoPrevio: 2 * 60,
        cantidadMaxima: null,
        },

        reloj: {
        cuentaAtras: true,
        detenerEnTiempoMuerto: true,
        detenerEnTirosLibres: true,
        },

        posesion: {
        activa: true,
        duracion: 24,
        reinicioOfensivo: 14,
        },

        faltas: {
        maximasJugador: 5,
        bonusEquipo: 5,
        reiniciarCadaPeriodo: true,
        reiniciarEnProrroga: false,
        },

        tiemposMuertos: {
        primeraMitad: 2,
        segundaMitad: 3,
        porProrroga: 1,
        duracion: 60,
        },
    },

    configuracionMarcador: {
        detalleJugador: {
        numero: true,
        faltas: true,
        puntos: true,
        },
    },
    },
]