import { FBIB_CONFIG } from "./config";
import { peticionFBIB } from "./cliente";

import type {
    CalendarioClubFBIB,
} from "./types";

export function obtenerCalendarioClubFBIB(
    mes: string | number,
    clubId: number | string = FBIB_CONFIG.clubId
): Promise<CalendarioClubFBIB> {
    if (!clubId) {
        throw new Error(
            "No se ha configurado ningún club en FBIB_CONFIG.clubId"
        );
    }

    const idClubCodificado = encodeURIComponent(clubId);
    const mesCodificado = encodeURIComponent(mes);

    return peticionFBIB<CalendarioClubFBIB>(
        `/Match/getMatchClubMonth/${idClubCodificado}/${mesCodificado}/B`
    );
}

export function obtenerCalendarioConfiguradoFBIB(
    mes: string | number
): Promise<CalendarioClubFBIB> {
    return obtenerCalendarioClubFBIB(
        mes,
        FBIB_CONFIG.clubId
    );
}