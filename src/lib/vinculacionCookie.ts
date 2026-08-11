const COOKIE_NAME = "marcador_cba_vinculacion";

export function generarIdVinculacion(): string {
  const valores = new Uint32Array(1);

  crypto.getRandomValues(valores);

  const numero = (valores[0] % 100000)
    .toString()
    .padStart(5, "0");

  return `CBA-${numero}`;
}

function obtenerCaducidad(): Date {
  const caducidad = new Date();

  caducidad.setDate(caducidad.getDate() + 1);
  caducidad.setHours(5, 0, 0, 0);

  return caducidad;
}

export function guardarIdVinculacion(id: string): void {
  if (!/^CBA-\d{5}$/.test(id)) {
    throw new Error("La ID de vinculación no es válida");
  }

  const caducidad = obtenerCaducidad();

  const secure =
    window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(id)}`,
    `expires=${caducidad.toUTCString()}`,
    "path=/",
    "SameSite=Lax",
  ].join("; ") + secure;
}

export function cargarIdVinculacion(): string | null {
  const prefijo = `${COOKIE_NAME}=`;

  const cookie = document.cookie
    .split("; ")
    .find((elemento) => elemento.startsWith(prefijo));

  if (!cookie) {
    return null;
  }

  const id = decodeURIComponent(
    cookie.substring(prefijo.length),
  );

  return /^CBA-\d{5}$/.test(id) ? id : null;
}

export function obtenerOCrearIdVinculacion(): string {
  const idGuardada = cargarIdVinculacion();

  if (idGuardada) {
    return idGuardada;
  }

  const nuevaId = generarIdVinculacion();

  guardarIdVinculacion(nuevaId);

  return nuevaId;
}