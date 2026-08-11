export interface RespuestaFBIB<T> {
    result: "OK" | "ERROR";
    message?: string;
    messageData: T;
    errorCode?: string;
}

export interface ClubFBIB {
    id: number;
    name: string;
    town?: string;
    direction?: string;
    postalCode?: string;

    // Puede haber más propiedades en la respuesta.
    [key: string]: unknown;
}

export interface EquipoClubFBIB {
    idSignedTeam: number;
    name: string;

    [key: string]: unknown;
}

export interface CategoriaClubFBIB {
    name: string;
    teams: Record<string, EquipoClubFBIB>;

    [key: string]: unknown;
}

export interface InformacionClubFBIB extends ClubFBIB {
    web?: string;
    mail?: string;
    president?: string;
    telephone?: string;

    contact?: string;
    telephoneCR?: string;
    telephoneMobileCR?: string;

    categories?: Record<string, CategoriaClubFBIB>;
}

export interface ClubCompletoFBIB extends InformacionClubFBIB {
    escudo: string | null;
}