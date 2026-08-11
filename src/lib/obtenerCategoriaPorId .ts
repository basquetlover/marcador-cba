import { CATEGORIAS } from "../const/categorias";

export function obtenerCategoriaPorId(categoriaId: string) {
  const categoria = CATEGORIAS.find(
    (categoria) => categoria.id === categoriaId,
  );

  return categoria ?? null;
}