export class Imei {
  private constructor(readonly value: string) {}

  static create(raw: string): { ok: true; imei: Imei } | { ok: false; error: string } {
    const cleaned = String(raw ?? '').trim().replace(/\s+/g, '');
    if (!cleaned) return { ok: false, error: 'IMEI requerido.' };
    if (!/^\d{14,16}$/.test(cleaned)) {
      return { ok: false, error: 'IMEI debe tener entre 14 y 16 dígitos.' };
    }
    return { ok: true, imei: new Imei(cleaned) };
  }
}

export class MaterialSap {
  private constructor(readonly value: string) {}

  static create(raw: string): { ok: true; material: MaterialSap } | { ok: false; error: string } {
    const value = String(raw ?? '').trim();
    if (!value) return { ok: false, error: 'Material SAP es obligatorio.' };
    if (value.length > 50) return { ok: false, error: 'Material SAP máximo 50 caracteres.' };
    return { ok: true, material: new MaterialSap(value) };
  }
}

export class NumeroTraslado {
  private constructor(readonly value: string) {}

  static create(raw: string): { ok: true; numero: NumeroTraslado } | { ok: false; error: string } {
    const value = String(raw ?? '').trim();
    if (value.length > 30) return { ok: false, error: 'Número de traslado máximo 30 caracteres.' };
    return { ok: true, numero: new NumeroTraslado(value) };
  }
}

export class FechaAceptacion {
  private constructor(readonly value: string) {}

  static create(raw: string): { ok: true; fecha: FechaAceptacion } | { ok: false; error: string } {
    const value = String(raw ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { ok: false, error: 'Fecha de aceptación inválida.' };
    }
    return { ok: true, fecha: new FechaAceptacion(value) };
  }

  static today(): FechaAceptacion {
    return new FechaAceptacion(new Date().toISOString().slice(0, 10));
  }
}
