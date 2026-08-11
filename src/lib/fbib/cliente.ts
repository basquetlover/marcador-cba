import { FBIB_API_URL } from "./config";
import type { RespuestaFBIB } from "./types";

function decodificarBase64(base64: string): string {
    const base64Limpio = base64
        .trim()
        .replace(/^"|"$/g, "");

    const bytes = Uint8Array.from(
        atob(base64Limpio),
        (caracter) => caracter.charCodeAt(0)
    );

    return new TextDecoder("utf-8").decode(bytes);
}

export async function peticionFBIB<T>(
    endpoint: string
): Promise<T> {
    const respuesta = await fetch(`${FBIB_API_URL}${endpoint}`);

    if (!respuesta.ok) {
        throw new Error(
            `Error al conectar con la FBIB: ${respuesta.status}`
        );
    }

    const respuestaBase64 = await respuesta.text();
    const json = decodificarBase64(respuestaBase64);

    const resultado = JSON.parse(json) as RespuestaFBIB<T>;

    if (resultado.result !== "OK") {
        throw new Error(
            resultado.message ??
                "La FBIB ha devuelto un error desconocido"
        );
    }

    return resultado.messageData;
}