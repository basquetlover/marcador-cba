
/* ============================================
   MARCADOR CBA
   Protocolo MONDO - Reloj de baloncesto

   Normal:
   A3 A2 : A1 A0

   Último minuto:
   A3 A2 . A1

   A0 = 5F => ultimoMinuto = true
   ============================================ */


// 1. CONSTANTES DEL PROTOCOLO

const STX = 0x02;
const ETX = 0x03;

const DATO_VACIO = 0x5f;


// 2. DIRECCIONES DEL RELOJ

const POSICIONES = new Map([

    // Mapa principal MONDO

    [0xa3, { grupo: "A", indice: 0 }],
    [0xa2, { grupo: "A", indice: 1 }],
    [0xa1, { grupo: "A", indice: 2 }],
    [0xa0, { grupo: "A", indice: 3 }],

    // Mapa alternativo identificado anteriormente.
    // Su comportamiento en el último minuto
    // queda pendiente de verificación real.

    [0x74, { grupo: "B", indice: 0 }],
    [0x73, { grupo: "B", indice: 1 }],
    [0x72, { grupo: "B", indice: 2 }],
    [0x71, { grupo: "B", indice: 3 }],

]);


// 3. UTILIDADES

function hexadecimal(byte) {

    return byte
        .toString(16)
        .toUpperCase()
        .padStart(2, "0");
}

function convertirDigito(dato) {

    if (
        dato >= 0x50 &&
        dato <= 0x59
    ) {

        return dato - 0x50;
    }

    return null;
}

function dosDigitos(numero) {

    return String(numero).padStart(2, "0");
}


// 4. DECODIFICADOR MONDO

export class DecodificadorMondo {

    constructor({
        alTiempo,
        alTrama,
        alTiempoEspecial,
    } = {}) {

        this.alTiempo = alTiempo;

        this.alTrama = alTrama;

        this.alTiempoEspecial = alTiempoEspecial;

        this.reiniciar();
    }


    // 5. REINICIAR ESTADO

    reiniciar() {

        this.trama = [];

        this.grupo = null;

        this.digitos = [
            null,
            null,
            null,
            null,
        ];

        this.ultimoMinuto = false;

        this.ultimoTexto = null;

        this.ultimoEspecial = null;
    }


    // 6. RECIBIR BYTES DESDE COM4

    recibir(bytes) {

        for (const byte of bytes) {

            if (
                !Number.isInteger(byte) ||
                byte < 0 ||
                byte > 255
            ) {
                continue;
            }

            // Nueva trama

            if (byte === STX) {

                this.trama = [STX];

                continue;
            }

            // Ignorar datos fuera de tramas

            if (this.trama.length === 0) {
                continue;
            }

            this.trama.push(byte);

            // Formato:
            // 02 DIRECCION DATO 03

            if (this.trama.length < 4) {
                continue;
            }

            const [
                inicio,
                direccion,
                dato,
                fin,
            ] = this.trama;

            this.trama = [];

            if (
                inicio !== STX ||
                fin !== ETX
            ) {
                continue;
            }

            // Notificar trama para diagnóstico

            this.alTrama?.({
                direccion,
                dato,

                hexadecimal: [
                    inicio,
                    direccion,
                    dato,
                    fin,
                ]
                    .map(hexadecimal)
                    .join(" "),
            });

            // Interpretar registro

            this.procesarDato(
                direccion,
                dato,
            );
        }
    }


    // 7. PROCESAR UN REGISTRO MONDO

    procesarDato(direccion, dato) {

        const posicion =
            POSICIONES.get(direccion);

        if (!posicion) {
            return;
        }

        // Evitar mezclar registros de
        // mapas de direcciones distintos.

        if (this.grupo !== posicion.grupo) {

            this.grupo = posicion.grupo;

            this.digitos = [
                null,
                null,
                null,
                null,
            ];

            this.ultimoMinuto = false;

            this.ultimoTexto = null;

            this.ultimoEspecial = null;
        }


        // 8. DETECTAR VALOR ESPECIAL 5F

        if (dato === DATO_VACIO) {

            this.digitos[posicion.indice] = null;


            // A0 = 5F
            // CAMBIO AL FORMATO SS.d

            if (posicion.indice === 3) {

                this.ultimoMinuto = true;

                this.publicarTiempo();

                return;
            }


            // 5F EN OTRA POSICIÓN

            const firma =
                `${this.grupo}:${posicion.indice}:5F`;

            if (this.ultimoEspecial !== firma) {

                this.ultimoEspecial = firma;

                this.alTiempoEspecial?.({

                    grupo: this.grupo,

                    direccion,

                    dato,

                    motivo:
                        "5F-en-otra-posicion",

                    recibidoEn: Date.now(),
                });
            }

            return;
        }


        // 9. CONVERTIR DATO A DÍGITO

        const numero =
            convertirDigito(dato);

        if (numero === null) {
            return;
        }

        this.digitos[posicion.indice] =
            numero;


        // 10. DETECTAR REGRESO A MM:SS

        if (posicion.indice === 3) {

            // A0 vuelve a ser un dígito normal

            this.ultimoMinuto = false;
        }

        this.ultimoEspecial = null;


        // 11. ACTUALIZAR TIEMPO

        this.publicarTiempo();
    }


    // 12. RECONSTRUIR EL RELOJ

    publicarTiempo() {

        // En el último minuto necesitamos
        // solamente A3, A2 y A1.

        const posicionesNecesarias =
            this.ultimoMinuto
                ? [0, 1, 2]
                : [0, 1, 2, 3];


        // No publicar hasta disponer
        // de las posiciones necesarias.

        const incompleto =
            posicionesNecesarias.some(
                (indice) =>
                    this.digitos[indice] === null,
            );

        if (incompleto) {
            return;
        }


        // Valores individuales

        const [
            d0,
            d1,
            d2,
            d3,
        ] = this.digitos;


        let texto;

        let formato;

        let minutos;

        let segundos;

        let decimas;


        // ====================================
        // FORMATO ÚLTIMO MINUTO
        // SS.d
        // ====================================

        if (this.ultimoMinuto) {

            // A3 = decenas de segundos
            // A2 = unidades de segundos
            // A1 = décimas

            minutos = 0;

            segundos =
                d0 * 10 + d1;

            decimas = d2;

            formato = "SS.d";


            // Validar tiempo

            if (segundos > 59) {
                return;
            }


            // Ejemplo:
            // A3=55 A2=59 A1=53
            // 59.3

            texto =
                `${dosDigitos(segundos)}.${decimas}`;
        }


        // ====================================
        // FORMATO NORMAL
        // MM:SS
        // ====================================

        else {

            // A3 = decenas minutos
            // A2 = unidades minutos
            // A1 = decenas segundos
            // A0 = unidades segundos

            minutos =
                d0 * 10 + d1;

            segundos =
                d2 * 10 + d3;

            decimas = null;

            formato = "MM:SS";


            // Validar segundos

            if (segundos > 59) {
                return;
            }


            // Ejemplo:
            // A3=50 A2=58 A1=53 A0=54
            // 08:34

            texto =
                `${dosDigitos(minutos)}:` +
                `${dosDigitos(segundos)}`;
        }


        // 13. EVITAR ENVÍOS REPETIDOS

        if (texto === this.ultimoTexto) {
            return;
        }

        this.ultimoTexto = texto;


        // 14. ENVIAR TIEMPO AL SERVIDOR

        this.alTiempo?.({

            texto,

            formato,

            ultimoMinuto: this.ultimoMinuto,

            minutos,

            segundos,

            decimas,

            grupo: this.grupo,

            recibidoEn: Date.now(),

        });
    }
}
