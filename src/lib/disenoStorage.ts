const DISENO_STORAGE_KEY = "marcador_cba_ultimo_diseno";

export function guardarDisenoSeleccionado(disenoId: string): void {
  localStorage.setItem(DISENO_STORAGE_KEY, disenoId);
}

export function cargarDisenoSeleccionado(): string | null {
  return localStorage.getItem(DISENO_STORAGE_KEY);
}