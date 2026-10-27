
import { createServer } from "node:http";
import {
    createWriteStream,
    mkdirSync,
} from "node:fs";

import {
    dirname,
    join,
} from "node:path";

import { fileURLToPath } from "node:url";

import { SerialPort } from "serialport";

import {
    WebSocket,
    WebSocketServer,
} from "ws";

import {
    DecodificadorMondo,
} from "./protocolo.mjs";


/* ============================================
   MARCADOR CBA
   Servidor local MONDO

   Consola MONDO
       ↓
   COM4
       ↓
   Decodificador
       ↓
   WebSocket
       ↓
   React

   ============================================ */


// 1. CONFIGURACIÓN GENERAL

const CONFIG = {

    // Puerto de la consola MONDO
    puertoSerie: process.env.MONDO_COM ?? "COM4",

    // Parámetros del puerto serie
    baudRate: 19200,
    dataBits: 8,
    stopBits: 1,
    parity: "none",

    // Servidor local
    host: "127.0.0.1",
    puertoWebSocket: 8765,

    // Reconexión
    reconexionMs: 3000,

    // Diagnóstico
    guardarCapturas:
        process.argv.includes("--captura"),

};


// 2. ORÍGENES AUTORIZADOS

const origenesPermitidos = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]);

if (process.env.MONDO_ORIGEN_WEB) {

    origenesPermitidos.add(
        process.env.MONDO_ORIGEN_WEB,
    );

}


// 3. ESTADO DEL SERVIDOR

let puertoSerie = null;

let temporizadorReconexion = null;

let cerrando = false;

let estadoConexion = "desconectado";

let detalleConexion = "";

let ultimaLectura = null;


// 4. SISTEMA DE CAPTURAS

const carpetaActual = dirname(
    fileURLToPath(import.meta.url),
);

let archivoCaptura = null;

if (CONFIG.guardarCapturas) {

    const carpetaCapturas = join(
        carpetaActual,
        "capturas",
    );

    mkdirSync(carpetaCapturas, {
        recursive: true,
    });

    const fecha = new Date()
        .toISOString()
        .replaceAll(":", "-")
        .replaceAll(".", "-");

    const rutaArchivo = join(
        carpetaCapturas,
        `mondo-${fecha}.jsonl`,
    );

    archivoCaptura = createWriteStream(
        rutaArchivo,
        { flags: "a" },
    );

    archivoCaptura.on("error", (error) => {

        console.error(
            "[MONDO] Error de captura:",
            error.message,
        );

    });

    console.log(
        "[MONDO] Capturas:",
        rutaArchivo,
    );

}


// 5. GUARDAR DATOS DE DIAGNÓSTICO

function registrar(tipo, datos = {}) {

    if (!archivoCaptura) {
        return;
    }

    archivoCaptura.write(
        JSON.stringify({

            fecha: new Date().toISOString(),

            tipo,

            ...datos,

        }) + "\n",
    );

}


// 6. CONVERTIR BYTES A HEXADECIMAL

function convertirHexadecimal(datos) {

    return Array.from(datos)
        .map((byte) =>
            byte.toString(16)
                .toUpperCase()
                .padStart(2, "0"),
        )
        .join(" ");

}


// 7. SERVIDOR HTTP LOCAL

const servidorHttp = createServer(
    (peticion, respuesta) => {

        if (
            peticion.method !== "GET" ||
            peticion.url !== "/estado"
        ) {

            respuesta.writeHead(404);
            respuesta.end();

            return;
        }

        const estado = {

            servicio: "CBA MONDO",

            estado: estadoConexion,

            detalle: detalleConexion,

            puerto: CONFIG.puertoSerie,

            baudRate: CONFIG.baudRate,

            reloj: ultimaLectura,

            fecha: new Date().toISOString(),

        };

        respuesta.writeHead(200, {

            "Content-Type":
                "application/json; charset=utf-8",

            "Cache-Control": "no-store",

        });

        respuesta.end(
            JSON.stringify(estado),
        );

    },
);


// 8. SERVIDOR WEBSOCKET

const servidorWebSocket = new WebSocketServer({

    noServer: true,

    maxPayload: 2048,

    perMessageDeflate: false,

});


// 9. ENVIAR MENSAJES

function enviarMensaje(cliente, mensaje) {

    if (
        cliente.readyState !== WebSocket.OPEN
    ) {
        return;
    }

    cliente.send(
        JSON.stringify(mensaje),
    );

}


// 10. ENVIAR A TODOS LOS CLIENTES

function difundir(mensaje) {

    for (
        const cliente of servidorWebSocket.clients
    ) {

        enviarMensaje(
            cliente,
            mensaje,
        );

    }

}


// 11. CONTROLAR CONEXIONES WEBSOCKET

servidorHttp.on(
    "upgrade",
    (peticion, socket, cabeza) => {

        const url = new URL(
            peticion.url ?? "/",
            `http://${CONFIG.host}`,
        );

        const origen =
            peticion.headers.origin;

        if (
            url.pathname !== "/mondo" ||
            (
                origen &&
                !origenesPermitidos.has(origen)
            )
        ) {

            socket.write(
                "HTTP/1.1 403 Forbidden\r\n" +
                "Connection: close\r\n\r\n",
            );

            socket.destroy();

            return;
        }

        servidorWebSocket.handleUpgrade(
            peticion,
            socket,
            cabeza,
            (cliente) => {

                servidorWebSocket.emit(
                    "connection",
                    cliente,
                    peticion,
                );

            },
        );

    },
);


// 12. NUEVO CLIENTE CONECTADO

servidorWebSocket.on(
    "connection",
    (cliente) => {

        console.log(
            "[MONDO] Cliente web conectado.",
        );

        enviarMensaje(cliente, {

            tipo: "estado",

            estado: estadoConexion,

            detalle: detalleConexion,

            puerto: CONFIG.puertoSerie,

            fecha: new Date().toISOString(),

        });

        // Enviar el último tiempo válido

        if (ultimaLectura) {

            enviarMensaje(
                cliente,
                ultimaLectura,
            );

        }

        // El servidor todavía es de solo lectura

        cliente.on("message", () => {

            cliente.close(
                1008,
                "Servidor de solo lectura",
            );

        });

        cliente.on("close", () => {

            console.log(
                "[MONDO] Cliente web desconectado.",
            );

        });

    },
);


// 13. PUBLICAR ESTADO DEL PUERTO

function publicarEstado(
    estado,
    detalle = "",
) {

    estadoConexion = estado;

    detalleConexion = detalle;

    const mensaje = {

        tipo: "estado",

        estado,

        detalle,

        puerto: CONFIG.puertoSerie,

        baudRate: CONFIG.baudRate,

        fecha: new Date().toISOString(),

    };

    difundir(mensaje);

    registrar(
        "estado",
        mensaje,
    );

    console.log(
        `[MONDO] ${estado}` +
        (detalle ? `: ${detalle}` : ""),
    );

}


// 14. DECODIFICADOR DEL RELOJ

const decodificador = new DecodificadorMondo({

    // Trama MONDO recibida

    alTrama(trama) {

        registrar("trama", {

            direccion: trama.direccion,

            dato: trama.dato,

            hexadecimal: trama.hexadecimal,

        });

    },


    // Tiempo interpretado

    alTiempo(lectura) {

        const formato =
            lectura.formato ??
            (
                lectura.ultimoMinuto
                    ? "SS.d"
                    : "MM:SS"
            );

        const mensaje = {

            tipo: "tiempo",

            fuente: "mondo",

            relojId: "reloj-principal",

            ...lectura,

            formato,

        };

        // Guardar última lectura válida

        ultimaLectura = mensaje;

        // Transmitir a React

        difundir(mensaje);

        // Guardar diagnóstico opcional

        registrar(
            "tiempo",
            mensaje,
        );

        if (CONFIG.guardarCapturas) {

            console.log(
                `[RELOJ] ${lectura.texto}`,
            );

        }

    },


    // Valores especiales del protocolo

    alTiempoEspecial(lectura) {

        const mensaje = {

            tipo: "tiempo-especial",

            fuente: "mondo",

            ...lectura,

        };

        registrar(
            "tiempo-especial",
            mensaje,
        );

        difundir(mensaje);

        // No sustituimos el último
        // tiempo válido por un dato
        // que no podamos interpretar.

    },

});


// 15. PROGRAMAR RECONEXIÓN

function programarReconexion() {

    if (
        cerrando ||
        temporizadorReconexion
    ) {
        return;
    }

    temporizadorReconexion = setTimeout(
        () => {

            temporizadorReconexion = null;

            conectarPuertoSerie();

        },
        CONFIG.reconexionMs,
    );

}


// 16. GESTIONAR DESCONEXIÓN

function gestionarDesconexion(
    puerto,
    motivo,
) {

    // Ignorar eventos de puertos
    // que ya no son el puerto actual

    if (
        puertoSerie !== puerto ||
        cerrando
    ) {
        return;
    }

    puertoSerie = null;

    ultimaLectura = null;

    decodificador.reiniciar();

    publicarEstado(
        "desconectado",
        motivo,
    );

    programarReconexion();

}


// 17. CONECTAR CON MONDO

function conectarPuertoSerie() {

    if (
        cerrando ||
        puertoSerie
    ) {
        return;
    }

    const puerto = new SerialPort({

        path: CONFIG.puertoSerie,

        baudRate: CONFIG.baudRate,

        dataBits: CONFIG.dataBits,

        stopBits: CONFIG.stopBits,

        parity: CONFIG.parity,

        autoOpen: false,

        lock: true,

    });

    puertoSerie = puerto;

    publicarEstado("conectando");


    // PUERTO ABIERTO

    puerto.on("open", () => {

        if (
            puertoSerie !== puerto ||
            cerrando
        ) {
            return;
        }

        decodificador.reiniciar();

        ultimaLectura = null;

        publicarEstado("conectado");

    });


    // DATOS RECIBIDOS DESDE COM4

    puerto.on("data", (datos) => {

        if (
            puertoSerie !== puerto ||
            cerrando
        ) {
            return;
        }

        // Registrar bytes originales
        // para poder estudiar las décimas.

        registrar("bytes", {

            hexadecimal:
                convertirHexadecimal(datos),

        });

        // Enviar datos al decodificador

        decodificador.recibir(datos);

    });


    // ERROR DE COMUNICACIÓN

    puerto.on("error", (error) => {

        if (
            puertoSerie !== puerto ||
            cerrando
        ) {
            return;
        }

        console.error(
            "[MONDO] Error COM4:",
            error.message,
        );

        if (puerto.isOpen) {

            puerto.close();

        } else {

            gestionarDesconexion(
                puerto,
                error.message,
            );

        }

    });


    // PUERTO CERRADO

    puerto.on("close", () => {

        gestionarDesconexion(
            puerto,
            "Puerto serie cerrado",
        );

    });


    // ABRIR COM4

    puerto.open((error) => {

        if (!error) {
            return;
        }

        gestionarDesconexion(
            puerto,
            error.message,
        );

    });

}


// 18. CIERRE CONTROLADO

function cerrarServidor() {

    if (cerrando) {
        return;
    }

    cerrando = true;

    console.log(
        "[MONDO] Cerrando servidor...",
    );

    if (temporizadorReconexion) {

        clearTimeout(
            temporizadorReconexion,
        );

        temporizadorReconexion = null;

    }

    // Cerrar conexiones web

    for (
        const cliente of servidorWebSocket.clients
    ) {

        cliente.terminate();

    }

    servidorWebSocket.close();

    servidorHttp.close();

    // Liberar COM4

    if (puertoSerie?.isOpen) {

        puertoSerie.close();

    }

    archivoCaptura?.end();

}


// 19. SEÑALES DE WINDOWS / NODE

process.once(
    "SIGINT",
    cerrarServidor,
);

process.once(
    "SIGTERM",
    cerrarServidor,
);


// 20. INICIAR SERVIDOR LOCAL

servidorHttp.listen(
    CONFIG.puertoWebSocket,
    CONFIG.host,
    () => {

        console.log(
            "================================",
        );

        console.log(
            "  MARCADOR CBA - SERVIDOR MONDO",
        );

        console.log(
            "================================",
        );

        console.log(
            `Puerto serie: ${CONFIG.puertoSerie}`,
        );

        console.log(
            `Baudios: ${CONFIG.baudRate}`,
        );

        console.log(
            "WebSocket:",
            `ws://${CONFIG.host}:` +
            `${CONFIG.puertoWebSocket}/mondo`,
        );

        console.log(
            "Estado:",
            `http://${CONFIG.host}:` +
            `${CONFIG.puertoWebSocket}/estado`,
        );

        console.log(
            "================================",
        );

        // Iniciar lectura de MONDO

        conectarPuertoSerie();

    },
);


// 21. ERRORES DEL SERVIDOR HTTP

servidorHttp.on(
    "error",
    (error) => {

        console.error(
            "[MONDO] Error del servidor:",
            error.message,
        );

        cerrarServidor();

    },
);
