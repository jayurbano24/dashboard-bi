import type { BsdEquipo, MaterialSap } from '../../types';

export function extraerMaterialesDesdeBsdG945(bsdEquipos: BsdEquipo[]): MaterialSap[] {
  const mapMateriales = new Map<string, MaterialSap>();
  const equiposG945 = bsdEquipos.filter((item) => String(item.centro).trim().toUpperCase() === 'G945');

  equiposG945.forEach((item) => {
    const cod = String(item.materialCodigo).trim();
    if (!cod) return;

    if (!mapMateriales.has(cod)) {
      const texto = item.materialTexto || `MATERIAL SAP ${cod}`;
      const partes = texto.split(' ');
      mapMateriales.set(cod, {
        codigo: cod,
        texto,
        marca: partes[0] || 'PCD',
        modelo: partes[1] || 'GENÉRICO',
        origen: 'BSD G945',
        almacenes: [item.almacen || 'D000'],
        cantidadEnBsdG945: 1,
        ultimaActualizacion: new Date().toISOString(),
      });
    } else {
      const actual = mapMateriales.get(cod)!;
      actual.cantidadEnBsdG945 += 1;
      if (item.almacen && !actual.almacenes.includes(item.almacen)) {
        actual.almacenes.push(item.almacen);
      }
      if (!actual.texto && item.materialTexto) {
        actual.texto = item.materialTexto;
      }
    }
  });

  return Array.from(mapMateriales.values());
}
