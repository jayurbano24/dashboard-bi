/**
 * Extrae marca y modelo heurísticamente desde el texto del material SAP.
 * Ej: "70081795 ALCATEL 606A" → marca ALCATEL, modelo 606A
 */
export function inferirMarcaModeloDesdeMaterial(
  materialCodigo: string,
  materialTexto: string,
): { marca: string; modelo: string } {
  const texto = (materialTexto || '').trim();
  const codigo = (materialCodigo || '').trim();

  if (!texto) {
    return { marca: 'SAP', modelo: codigo || 'DESCONOCIDO' };
  }

  const sinCodigo = texto.replace(new RegExp(`^${codigo}\\s*`, 'i'), '').trim();
  const partes = sinCodigo.split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return { marca: 'SAP', modelo: codigo };
  }
  if (partes.length === 1) {
    return { marca: partes[0], modelo: partes[0] };
  }

  return { marca: partes[0], modelo: partes.slice(1).join(' ') };
}
