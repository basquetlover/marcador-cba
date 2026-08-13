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

export interface PartidoCalendarioFBIB {
  idMatch: string;
  idMatchCall: string;
  matchCallUuid: string;

  matchDay: string;
  matchStartedHour: string | null;
  numMatchDay: string;
  dayTime: string;

  state: string;
  isCurrent: string;
  isInitial: string;
  isLive: boolean;
  designated: string;

  idLocalClub: string;
  idLocalTeam: string;
  nameLocalTeam: string;
  nameLocalTeamOrganization: string;
  localClubLogo: string | null;
  localScore: string | null;
  localPoints: string | null;
  localTeamUuid: string;

  idVisitorClub: string;
  idVisitorTeam: string;
  nameVisitorTeam: string;
  nameVisitorTeamOrganization: string;
  visitorClubLogo: string | null;
  visitorScore: string | null;
  visitorPoints: string | null;
  visitorTeamUuid: string;

  idCompetition: string;
  codeCompetition: string;
  nameCompetition: string;

  idCategorySigned: string;
  codeCategory: string;
  nameCategory: string;
  nameCategorySigned: string;

  idGroup: string;
  nameGroup: string;
  numGroup: string;

  idField: string;
  nameField: string;
  adressField: string;
  postalCodeField: string;
  nameTown: string;
  latitudeField: string;
  longitudeField: string;

  idModality: string;
  nameModality: string;
  season: string;

  localScoreP1: string | null;
  localScoreP2: string | null;
  localScoreP3: string | null;
  localScoreP4: string | null;

  visitorScoreP1: string | null;
  visitorScoreP2: string | null;
  visitorScoreP3: string | null;
  visitorScoreP4: string | null;

  resultsVisibles: boolean;
  friendly: string;
  tiedAllowed: string;

  shirtColorLocalTeam: string | null;
  pantsColorLocalTeam: string | null;
  shirtColorVisitorTeam: string | null;
  pantsColorVisitorTeam: string | null;

  [key: string]: unknown;
}

export type CalendarioClubFBIB = PartidoCalendarioFBIB[];

export interface ClubCompletoFBIB extends InformacionClubFBIB {
    escudo: string | null;
}