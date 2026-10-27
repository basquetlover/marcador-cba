
import {
    createContext,
    useCallback,
    useMemo,
    useState,
} from "react";

import type {
    Dispatch,
    ReactNode,
    SetStateAction,
} from "react";

import type {
    DatosMarcador,
    EquipoMarcador,
    FuenteTiempo,
    LadoEquipo,
} from "./tipos";

import {
    DATOS_INICIALES,
    ID_RELOJ_PRINCIPAL,
} from "./datosIniciales";


/* ============================================
   MARCADOR CBA
   Estado central del marcador
   ============================================ */


// 1. TIPOS DEL CONTEXTO

interface ContextoMarcador {
    datos: DatosMarcador;

    establecerDatos: Dispatch<SetStateAction<DatosMarcador>>;

    actualizarEquipo: (
        lado: LadoEquipo,
        cambios: Partial<EquipoMarcador>,
        partidoId?: string,
    ) => void;

    actualizarPeriodo: (
        periodo: number,
        partidoId?: string,
    ) => void;

    actualizarCategoria: (
        categoriaId: string | null,
        partidoId?: string,
    ) => void;

    actualizarReloj: (
        texto: string,
        relojId?: string,
        fuente?: FuenteTiempo,
    ) => void;
}


// 2. CONTEXTO COMPARTIDO

export const MarcadorContext =
    createContext<ContextoMarcador | null>(null);


// 3. PROPIEDADES

interface MarcadorProviderProps {
    children: ReactNode;
}


// 4. COMPONENTE PRINCIPAL

export default function MarcadorProvider({
    children,
}: MarcadorProviderProps) {

    // 5. ESTADO GENERAL

    const [datos, establecerDatos] =
        useState<DatosMarcador>(DATOS_INICIALES);


    // 6. ACTUALIZAR DATOS DE UN EQUIPO

    const actualizarEquipo = useCallback(
        (
            lado: LadoEquipo,
            cambios: Partial<EquipoMarcador>,
            partidoId?: string,
        ) => {

            establecerDatos((actual) => {

                const id =
                    partidoId ?? actual.partidoPrincipalId;

                const partido = actual.partidos[id];

                if (!partido) {
                    return actual;
                }

                return {
                    ...actual,

                    partidos: {
                        ...actual.partidos,

                        [id]: {
                            ...partido,

                            [lado]: {
                                ...partido[lado],
                                ...cambios,
                            },
                        },
                    },
                };

            });

        },
        [],
    );


    // 7. ACTUALIZAR PERIODO

    const actualizarPeriodo = useCallback(
        (
            periodo: number,
            partidoId?: string,
        ) => {

            if (!Number.isFinite(periodo)) {
                return;
            }

            const periodoNuevo = Math.max(
                1,
                Math.trunc(periodo),
            );

            establecerDatos((actual) => {

                const id =
                    partidoId ?? actual.partidoPrincipalId;

                const partido = actual.partidos[id];

                if (!partido) {
                    return actual;
                }

                if (partido.periodo === periodoNuevo) {
                    return actual;
                }

                return {
                    ...actual,

                    partidos: {
                        ...actual.partidos,

                        [id]: {
                            ...partido,
                            periodo: periodoNuevo,
                        },
                    },
                };

            });

        },
        [],
    );


    // 8. ACTUALIZAR CATEGORÍA

    const actualizarCategoria = useCallback(
        (
            categoriaId: string | null,
            partidoId?: string,
        ) => {

            establecerDatos((actual) => {

                const id =
                    partidoId ?? actual.partidoPrincipalId;

                const partido = actual.partidos[id];

                if (!partido) {
                    return actual;
                }

                if (partido.categoriaId === categoriaId) {
                    return actual;
                }

                return {
                    ...actual,

                    partidos: {
                        ...actual.partidos,

                        [id]: {
                            ...partido,
                            categoriaId,
                        },
                    },
                };

            });

        },
        [],
    );


    // 9. ACTUALIZAR RELOJ

    const actualizarReloj = useCallback(
        (
            texto: string,
            relojId: string = ID_RELOJ_PRINCIPAL,
            fuente?: FuenteTiempo,
        ) => {

            establecerDatos((actual) => {

                const reloj = actual.relojes[relojId];

                if (!reloj) {
                    return actual;
                }

                if (
                    reloj.texto === texto &&
                    (fuente === undefined || reloj.fuente === fuente)
                ) {
                    return actual;
                }

                return {
                    ...actual,

                    relojes: {
                        ...actual.relojes,

                        [relojId]: {
                            ...reloj,

                            texto,

                            fuente: fuente ?? reloj.fuente,

                            actualizadoEn: Date.now(),
                        },
                    },
                };

            });

        },
        [],
    );


    // 10. VALORES COMPARTIDOS

    const contexto = useMemo<ContextoMarcador>(
        () => ({
            datos,

            establecerDatos,

            actualizarEquipo,
            actualizarPeriodo,
            actualizarCategoria,
            actualizarReloj,
        }),
        [
            datos,
            actualizarEquipo,
            actualizarPeriodo,
            actualizarCategoria,
            actualizarReloj,
        ],
    );


    // 11. ÚNICO RETURN

    return (
        <MarcadorContext.Provider value={contexto}>
            {children}
        </MarcadorContext.Provider>
    );
}
