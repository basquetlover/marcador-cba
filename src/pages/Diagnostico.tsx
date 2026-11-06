import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import usePageTitle from "../lib/usePageTitle";

/*
 * CBA · Diagnóstico RAW MONDO
 * Ruta: /diagnostico
 * Sin MarcadorProvider, sin parser y sin decoder.
 * Ninguna operación de escritura ni setSignals().
 */

const SERIAL = {
    baudRate: 19200,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    flowControl: "none",
} as const;

const MAX_RAW = 5000;
const MAX_EVENTOS = 500;

type Estado =
    | "desconectado"
    | "seleccionando"
    | "abriendo"
    | "escuchando"
    | "cerrando"
    | "error";

interface PuertoSerial {
    readonly readable: ReadableStream<Uint8Array> | null;
    open(opciones: typeof SERIAL): Promise<void>;
    close(): Promise<void>;
    getInfo?: () => {
        usbVendorId?: number;
        usbProductId?: number;
        bluetoothServiceClassId?: string;
    };
}

interface APIWebSerial {
    requestPort(): Promise<PuertoSerial>;
}

interface RegistroRAW {
    id: number;
    recibidoEn: string;
    bytes: number;
    hexadecimal: string;
    decimal: string;
    esperaReadMs: number;
}

interface EventoDiagnostico {
    id: number;
    fecha: string;
    etapa: string;
    mensaje: string;
}

const HEX = (valor: number) => valor.toString(16).toUpperCase().padStart(2, "0");
const FECHA = () => new Date().toISOString();

function mostrarHora(fecha: string | null): string {
    return fecha
        ? new Date(fecha).toLocaleTimeString("es-ES", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              fractionalSecondDigits: 3,
          })
        : "—";
}

function guardarArchivo(nombre: string, texto: string, tipo: string): void {
    const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const PANEL = "rounded-2xl border border-cyan-200/10 bg-[#0D2339] p-5 shadow-lg shadow-black/10";
const BOTON = "rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

export default function Diagnostico() {
    usePageTitle("Diagnóstico RAW · MONDO");

    const [estado, setEstado] = useState<Estado>("desconectado");
    const [mensaje, setMensaje] = useState("Selecciona COM4 en el diálogo de Chrome o Edge.");
    const [, forzarPintado] = useState(0);

    const puertoRef = useRef<PuertoSerial | null>(null);
    const lectorRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const tareaRef = useRef<Promise<void> | null>(null);
    const sesionRef = useRef(0);
    const seleccionandoRef = useRef(false);
    const estadoRef = useRef<Estado>("desconectado");

    const datosRef = useRef({
        inicio: null as string | null,
        puertoAbierto: null as string | null,
        lectorActivo: null as string | null,
        ultimaPeticionRead: null as string | null,
        ultimoRAW: null as string | null,
        fin: null as string | null,
        dispositivo: null as ReturnType<NonNullable<PuertoSerial["getInfo"]>> | null,
        totalBytes: 0,
        totalBloques: 0,
        descartados: 0,
        eventosDescartados: 0,
        lecturas: [] as RegistroRAW[],
        eventos: [] as EventoDiagnostico[],
    });

    const cambiarEstado = useCallback((nuevo: Estado) => {
        estadoRef.current = nuevo;
        setEstado(nuevo);
    }, []);

    const registrar = useCallback((etapa: string, texto: string) => {
        const d = datosRef.current;
        d.eventos.push({ id: d.eventosDescartados + d.eventos.length + 1, fecha: FECHA(), etapa, mensaje: texto });
        if (d.eventos.length > MAX_EVENTOS) {
            d.eventos.shift();
            d.eventosDescartados++;
        }
        console.info(`[${etapa}] ${texto}`);
    }, []);

    // Este temporizador solo refresca la interfaz. Nunca consulta COM4.
    useEffect(() => {
        const id = window.setInterval(() => forzarPintado(n => n + 1), 250);
        return () => {
            window.clearInterval(id);
            ++sesionRef.current;
            const lector = lectorRef.current;
            if (lector) {
                void lector.cancel().catch(() => undefined);
            } else {
                const puerto = puertoRef.current;
                if (puerto) void puerto.close().catch(() => undefined);
            }
        };
    }, []);

    const desconectar = useCallback(async () => {
        ++sesionRef.current;
        cambiarEstado("cerrando");
        registrar("SERIAL", "Cancelando lectura y cerrando puerto");

        try { await lectorRef.current?.cancel(); } catch { /* lector cerrado */ }
        try { await tareaRef.current; } catch { /* registrado por la tarea */ }
        if (puertoRef.current) {
            try { await puertoRef.current.close(); } catch { /* puerto cerrado */ }
        }
        puertoRef.current = null;
        lectorRef.current = null;
        tareaRef.current = null;
        seleccionandoRef.current = false;
        datosRef.current.fin = FECHA();
        cambiarEstado("desconectado");
        setMensaje("Captura detenida. Puedes descargar los datos obtenidos.");
    }, [cambiarEstado, registrar]);

    const conectar = useCallback(async () => {
        if (seleccionandoRef.current || puertoRef.current) return;
        const serial = (navigator as Navigator & { serial?: APIWebSerial }).serial;
        if (!window.isSecureContext || !serial) {
            cambiarEstado("error");
            setMensaje("Web Serial necesita Chrome/Edge en HTTPS o localhost.");
            registrar("ERROR", "Web Serial no disponible en este contexto");
            return;
        }

        seleccionandoRef.current = true;
        const sesion = ++sesionRef.current;
        cambiarEstado("seleccionando");
        registrar("SERIAL", "Solicitando selección del puerto COM4 (Windows)");
        let puerto: PuertoSerial;

        try {
            // La elección debe estar vinculada directamente al clic del usuario.
            puerto = await serial.requestPort();
        } catch (e) {
            seleccionandoRef.current = false;
            if (sesion !== sesionRef.current) return;
            cambiarEstado("desconectado");
            setMensaje(e instanceof Error ? e.message : "Selección cancelada");
            registrar("SERIAL", "Selección cancelada o fallida");
            return;
        }
        if (sesion !== sesionRef.current) {
            seleccionandoRef.current = false;
            return;
        }

        puertoRef.current = puerto;
        cambiarEstado("abriendo");
        registrar("SERIAL", "Intentando abrir puerto seleccionado (verifica COM4)");
        registrar("SERIAL", "19200 baud · 8 data bits · parity none · 1 stop bit · flow control none");

        try {
            await puerto.open(SERIAL);
            if (sesion !== sesionRef.current) {
                await puerto.close();
                if (puertoRef.current === puerto) puertoRef.current = null;
                return;
            }
            datosRef.current.inicio ??= FECHA();
            datosRef.current.puertoAbierto = FECHA();
            try { datosRef.current.dispositivo = puerto.getInfo?.() ?? null; } catch { /* opcional */ }
            registrar("SERIAL", "COM4 abierto (puerto seleccionado por el usuario)");

            if (!puerto.readable) throw new Error("readable === null después de open()");
            const lector = puerto.readable.getReader();
            lectorRef.current = lector;
            datosRef.current.lectorActivo = FECHA();
            registrar("SERIAL", "getReader() correcto. Iniciando reader.read()");
            seleccionandoRef.current = false;
            cambiarEstado("escuchando");
            setMensaje("Puerto abierto y reader.read() activo: esperando cualquier byte RAW.");

            const tarea = async () => {
                try {
                    while (sesion === sesionRef.current) {
                        datosRef.current.ultimaPeticionRead = FECHA();
                        const inicioRead = performance.now();
                        const { value, done } = await lector.read();
                        const finRead = performance.now();
                        if (sesion !== sesionRef.current) break;
                        if (done) {
                            registrar("SERIAL", "reader.read() devolvió done=true");
                            break;
                        }
                        if (!value || value.length === 0) {
                            registrar("SERIAL", "reader.read() devolvió un bloque vacío");
                            continue;
                        }

                        // EL LOG RAW ES LO PRIMERO QUE HACEMOS CON LOS BYTES.
                        // No hay decoder, parser, STX ni filtros.
                        const hexadecimal = Array.from(value, HEX).join(" ");
                        const decimal = Array.from(value).join(" ");
                        const recibidoEn = FECHA();
                        console.log(`[COM4 DATA]\nbytes: ${value.length}\nhex: ${hexadecimal}\ndecimal: ${decimal}`);
                        console.log("[RAW]", hexadecimal);

                        const d = datosRef.current;
                        d.ultimoRAW = recibidoEn;
                        d.totalBloques++;
                        d.totalBytes += value.length;
                        d.lecturas.push({
                            id: d.totalBloques,
                            recibidoEn,
                            bytes: value.length,
                            hexadecimal,
                            decimal,
                            esperaReadMs: finRead - inicioRead,
                        });
                        if (d.lecturas.length > MAX_RAW) {
                            d.lecturas.shift();
                            d.descartados++;
                        }
                    }
                } catch (error) {
                    if (sesion === sesionRef.current) {
                        const errorTexto = error instanceof Error ? error.message : String(error);
                        registrar("ERROR", `reader.read(): ${errorTexto}`);
                        cambiarEstado("error");
                        setMensaje(`Error leyendo COM4: ${errorTexto}`);
                    }
                } finally {
                    try { lector.releaseLock(); } catch { /* liberado */ }
                    if (lectorRef.current === lector) lectorRef.current = null;
                    try { await puerto.close(); } catch { /* puerto ya cerrado */ }
                    if (puertoRef.current === puerto) puertoRef.current = null;
                    if (sesion === sesionRef.current) {
                        datosRef.current.fin = FECHA();
                        if (estadoRef.current !== "error") {
                            cambiarEstado("desconectado");
                            setMensaje("La lectura terminó. Puerto cerrado.");
                        }
                    }
                }
            };
            tareaRef.current = tarea();
        } catch (error) {
            const errorTexto = error instanceof Error ? error.message : String(error);
            if (sesion === sesionRef.current) {
                registrar("ERROR", `open/getReader: ${errorTexto}`);
                cambiarEstado("error");
                setMensaje(errorTexto);
            }
            try { await puerto.close(); } catch { /* cerrado */ }
            if (puertoRef.current === puerto) puertoRef.current = null;
            seleccionandoRef.current = false;
        }
    }, [cambiarEstado, registrar]);

    const limpiar = () => {
        const d = datosRef.current;
        d.lecturas = [];
        d.eventos = [];
        d.totalBytes = 0;
        d.totalBloques = 0;
        d.descartados = 0;
        d.eventosDescartados = 0;
        d.ultimoRAW = null;
        registrar("SERIAL", "Registro RAW reiniciado (sin cerrar el puerto)");
        forzarPintado(n => n + 1);
    };

    const descargar = (formato: "json" | "csv") => {
        const d = datosRef.current;
        const marca = FECHA().replaceAll(":", "-");
        if (formato === "json") {
            guardarArchivo(`mondo-raw-${marca}.json`, JSON.stringify({
                nombre: "CBA MONDO - DIAGNOSTICO RAW",
                generadoEn: FECHA(),
                metodo: "Web Serial API / ReadableStreamDefaultReader.read()",
                puerto: "El nombre COM de Windows no se expone; verificar COM4 en selector",
                configuracion: SERIAL,
                estado,
                mensaje,
                navegador: navigator.userAgent,
                captura: d,
                nota: "Espera read() = tiempo bloqueado hasta la entrega de un bloque; no es latencia de decodificación ni de transmisión física.",
            }, null, 2), "application/json;charset=utf-8");
        } else {
            const celda = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
            const filas = [["id", "recibidoEn", "bytes", "hexadecimal", "decimal", "esperaReadMs"],
                ...d.lecturas.map(r => [String(r.id), r.recibidoEn, String(r.bytes), r.hexadecimal, r.decimal, String(r.esperaReadMs)])];
            guardarArchivo(`mondo-raw-${marca}.csv`, "\uFEFF" + filas.map(f => f.map(celda).join(",")).join("\r\n"), "text/csv;charset=utf-8");
        }
    };

    const d = datosRef.current;
    const esperandoDesde = d.ultimaPeticionRead
        ? Math.max(0, (Date.now() - new Date(d.ultimaPeticionRead).getTime()) / 1000)
        : null;
    const escuchando = estado === "escuchando";

    const etapas = [
        ["1", "Puerto abierto", d.puertoAbierto !== null ? "CONFIRMADO" : "PENDIENTE"],
        ["2", "reader.read() iniciado", d.lectorActivo !== null ? "CONFIRMADO" : "PENDIENTE"],
        ["3", "Bytes RAW recibidos", d.totalBytes > 0 ? "CONFIRMADO" : "SIN EVIDENCIA"],
        ["4", "Parser / buffer", "NO PROBADO"],
        ["5", "STX/ETX", "NO PROBADO"],
        ["6", "Tramas", "NO PROBADO"],
        ["7", "Dirección / dato", "NO PROBADO"],
        ["8", "Decoder", "NO PROBADO"],
        ["9", "Estado global", "NO PROBADO"],
        ["10", "WebSocket", "NO APLICA"],
        ["11", "React / marcador", "NO PROBADO"],
    ];

    return (
        <main className="min-h-screen bg-[#061522] p-4 text-slate-100 sm:p-7">
            <div className="mx-auto max-w-[1680px] space-y-5">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-300/15 pb-5">
                    <div>
                        <div className="mb-2 font-mono text-xs font-semibold tracking-[.2em] text-cyan-300">CB ANDRATX / HARDWARE LAB / WEB SERIAL</div>
                        <h1 className="text-2xl font-black sm:text-3xl">Diagnóstico RAW de COM4</h1>
                        <p className="mt-1 text-sm text-slate-400">Fase 1 · Entrada serie sin filtrado, buffer ni decoder</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link to="/control" className={`${BOTON} border border-white/15 bg-white/5`}>Volver al marcador</Link>
                        <button onClick={() => descargar("csv")} className={`${BOTON} border border-cyan-300/30 text-cyan-200`}>Descargar CSV</button>
                        <button onClick={() => descargar("json")} className={`${BOTON} bg-cyan-300 text-[#082238]`}>Descargar JSON</button>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                    <section className={`${PANEL} xl:col-span-5`}>
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="font-semibold">01 / Puerto y lector</h2>
                            <span className={`font-mono text-xs font-bold ${escuchando ? "text-emerald-300" : estado === "error" ? "text-rose-300" : "text-amber-300"}`}>{estado.toUpperCase()}</span>
                        </div>
                        <div className="mt-3 rounded-lg bg-black/25 p-3 text-sm text-sky-100/80">{mensaje}</div>
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <dt className="text-slate-400">Método</dt><dd className="text-right font-mono">Web Serial</dd>
                            <dt className="text-slate-400">Puerto</dt><dd className="text-right font-mono">Elegir COM4</dd>
                            <dt className="text-slate-400">Configuración</dt><dd className="text-right font-mono">19200 · 8N1</dd>
                            <dt className="text-slate-400">Control de flujo</dt><dd className="text-right font-mono">none</dd>
                            <dt className="text-slate-400">Puerto abierto a las</dt><dd className="text-right font-mono">{mostrarHora(d.puertoAbierto)}</dd>
                            <dt className="text-slate-400">Lector iniciado a las</dt><dd className="text-right font-mono">{mostrarHora(d.lectorActivo)}</dd>
                            <dt className="text-slate-400">Último read()</dt><dd className="text-right font-mono">{mostrarHora(d.ultimaPeticionRead)}</dd>
                            <dt className="text-slate-400">Espera del read() actual</dt><dd className="text-right font-mono">{escuchando && esperandoDesde !== null ? `${esperandoDesde.toFixed(1)} s` : "—"}</dd>
                            <dt className="text-slate-400">Última recepción</dt><dd className="text-right font-mono">{mostrarHora(d.ultimoRAW)}</dd>
                            <dt className="text-slate-400">Dispositivo</dt><dd className="break-all text-right font-mono text-xs">{d.dispositivo ? JSON.stringify(d.dispositivo) : "N/D"}</dd>
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" disabled={estado === "abriendo" || estado === "seleccionando" || estado === "cerrando" || escuchando} onClick={() => void conectar()} className={`${BOTON} bg-emerald-300 text-[#092438]`}>Conectar y escuchar</button>
                            <button type="button" disabled={!escuchando} onClick={() => void desconectar()} className={`${BOTON} bg-rose-400/20 text-rose-200`}>Desconectar</button>
                            <button type="button" onClick={limpiar} className={`${BOTON} border border-white/15 bg-white/5`}>Limpiar captura</button>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-amber-100/70">MondoVideo, Serial Watcher y otras páginas del marcador deben estar cerrados. Web Serial no puede comprobar el nombre COM de Windows: selecciónalo manualmente. No se invoca setSignals() ni se modifican DTR/RTS.</p>
                    </section>

                    <section className={`${PANEL} xl:col-span-7`}>
                        <h2 className="font-semibold">02 / Evidencias de recepción</h2>
                        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {[["PUERTO", d.puertoAbierto ? "ABIERTO" : "—"], ["LECTOR", d.lectorActivo ? "ACTIVO" : "—"], ["BYTES RAW", d.totalBytes.toLocaleString("es-ES")], ["CHUNKS", d.totalBloques.toLocaleString("es-ES")]].map(([titulo, valor]) => (
                                <div key={titulo} className="rounded-xl border border-cyan-100/10 bg-[#092035] p-3">
                                    <p className="text-[11px] uppercase tracking-wider text-slate-400">{titulo}</p>
                                    <p className="mt-2 font-mono text-xl font-bold text-cyan-300">{valor}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 space-y-2 text-sm">
                            <p className="font-semibold">Resultado de la prueba</p>
                            {d.totalBytes > 0 ? (
                                <p className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">Confirmado: el navegador ha recibido bytes RAW. Ya podemos revisar el parser en la siguiente fase.</p>
                            ) : escuchando ? (
                                <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-amber-200">El lector está esperando bytes. No hay evidencia de recepción. Cambia reloj/período y pulsa bocina; si sigue a cero, hay que investigar puerto seleccionado, transmisión, controlador o conexión.</p>
                            ) : (
                                <p className="rounded-lg bg-white/5 p-3 text-slate-300">Todavía no hay una captura activa.</p>
                            )}
                            <p className="text-xs text-slate-400">`reader.read()` es una espera asíncrona: no hay un retraso de lectura programado. La duración hasta que resuelve no equivale a la latencia física.</p>
                        </div>
                    </section>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                    <section className={`${PANEL} min-w-0 xl:col-span-7`}>
                        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">03 / Flujo RAW · HEX y decimal</h2><span className="font-mono text-xs text-slate-400">SIN FILTRAR</span></div>
                        <div className="mt-3 max-h-[410px] space-y-2 overflow-y-auto">
                            {d.lecturas.length === 0 ? <p className="rounded-lg bg-black/20 p-4 text-sm text-slate-400">No ha llegado ningún chunk de COM4.</p> : d.lecturas.slice(-45).reverse().map(r => (
                                <div key={r.id} className="rounded-lg border border-white/5 bg-black/20 p-3">
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-slate-400"><span>#{r.id} · {mostrarHora(r.recibidoEn)} · {r.bytes} bytes</span><span>read() bloqueado {r.esperaReadMs.toFixed(2)} ms</span></div>
                                    <p className="break-all font-mono text-sm leading-relaxed text-emerald-300"><span className="text-slate-500">HEX </span>{r.hexadecimal}</p>
                                    <p className="mt-1 break-all font-mono text-xs text-sky-200"><span className="text-slate-500">DEC </span>{r.decimal}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className={`${PANEL} xl:col-span-5`}>
                        <h2 className="font-semibold">04 / Capas de diagnóstico</h2>
                        <div className="mt-3 space-y-1">
                            {etapas.map(([id, titulo, resultado]) => (
                                <div key={id} className="flex items-center justify-between gap-3 border-b border-white/5 py-2 text-sm"><span className="text-slate-300"><span className="mr-2 font-mono text-slate-500">{id}.</span>{titulo}</span><span className={`shrink-0 font-mono text-[10px] ${resultado === "CONFIRMADO" ? "text-emerald-300" : resultado === "SIN EVIDENCIA" ? "text-amber-300" : "text-slate-500"}`}>{resultado}</span></div>
                            ))}
                        </div>
                    </section>
                </div>

                <section className={PANEL}>
                    <h2 className="font-semibold">05 / Registro de actividad</h2>
                    <div className="mt-3 max-h-[270px] overflow-auto">
                        <table className="w-full min-w-[600px] text-left text-xs"><thead className="sticky top-0 bg-[#19364F] text-cyan-200"><tr><th className="p-2">Hora</th><th className="p-2">Capa</th><th className="p-2">Mensaje</th></tr></thead>
                        <tbody>{d.eventos.slice(-80).reverse().map(e => <tr key={e.id} className="border-t border-white/10"><td className="whitespace-nowrap p-2 font-mono">{mostrarHora(e.fecha)}</td><td className="p-2 text-cyan-200">{e.etapa}</td><td className="p-2">{e.mensaje}</td></tr>)}</tbody></table>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">También se escribe en la consola de Chrome (F12). La captura JSON conserva los chunks RAW retenidos y los eventos, incluso si se reciben cero bytes. Se limita a {MAX_RAW.toLocaleString("es-ES")} chunks en memoria; descartados: {d.descartados}.</p>
                </section>
            </div>
        </main>
    );
}
