import { FBIB_CONFIG } from "./config";
import { peticionFBIB } from "./cliente";

import type {
  ClubCompletoFBIB,
  ClubFBIB,
  EquipoClubFBIB,
  InformacionClubFBIB,
} from "./types";


export function obtenerClubesFBIB(): Promise<ClubFBIB[]> {
    return peticionFBIB<ClubFBIB[]>(
        "/Clubs/getActiveWeb"
    );
}

export function obtenerClubFBIB(
    clubId: number | string
): Promise<InformacionClubFBIB> {
    const id = encodeURIComponent(clubId);

    return peticionFBIB<InformacionClubFBIB>(
        `/FCBQWeb/fitxaClub/${id}`
    );
}

export function obtenerEscudoClubFBIB(
    clubId: number | string
): Promise<string> {
    const id = encodeURIComponent(clubId);

    return peticionFBIB<string>(
        `/Clubs/getImage/${id}`
    );
}

export async function obtenerClubCompletoFBIB(
    clubId: number | string
): Promise<ClubCompletoFBIB> {
    const [club, escudo] = await Promise.all([
        obtenerClubFBIB(clubId),
        obtenerEscudoClubFBIB(clubId).catch(() => null),
    ]);

    return {
        ...club,
        escudo,
    };
}

export async function obtenerEquiposClubFBIB(
  clubId: number | string = FBIB_CONFIG.clubId
): Promise<EquipoClubFBIB[]> {
  const club = await obtenerClubFBIB(clubId);

  if (!club.categories) {
    return [];
  }

  return Object.values(club.categories).flatMap((categoria) =>
    Object.values(categoria.teams).map((equipo) => ({
      ...equipo,
      categoria: categoria.name,
    }))
  );
}