import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

/**
 * Lista completa del directorio ORIGEN de Orderry — 130 agencias.
 * Fuente: app.orderry.com/settings/book/custom → ORIGEN
 */
const ORIGINS_LIST = [
  'AGENCIAS WAY S.A.',
  'BRIGHTMOBILES',
  'CLIENTE FINAL',
  'CORPORACION SFERA',
  'CRECE MOBIL',
  'E-TECH, S.A',
  'G201-CENTRAL',
  'G203-METRONORTE',
  'G204-MIRAFLORES',
  'G205-LOS PRÓCERES',
  'G206-REFORMA',
  'G207-TIKAL FUTURA',
  'G208-LA TORRE',
  'G209-CAMPANARIO',
  'G210-PRADERA ZONA 10',
  'G211-VISTA HERMOSA',
  'G212-CONDADO PRADERA',
  'G213-ATANASIO TZUL',
  'G214-NARANJO MALL',
  'G215-MIXCO',
  'G216-MONTE VERDE',
  'G217-REFORMITA',
  'G218-SAN CRISTÓBAL',
  'G219-SAN JUAN SACATEPÉQUEZ',
  'G21A-OAKLAND MALL 2',
  'G21E-ROOSEVELT',
  'G21J-PRADERA CHIMALTENANGO',
  'G21Q-PRADERA XELA 2',
  'G21S-RETALHULEU 2',
  'G220-VILLA NUEVA',
  'G221-AMATITLAN',
  'G222-PARQUE LAS AMÉRICAS',
  'G223-PACIFIC CENTER',
  'G225-OAKLAND MALL PLACE',
  'G226-ESKALA',
  'G227-FLORES DEL LAGO',
  'G228-SANTA CLARA',
  'G229-EL FRUTAL',
  'G230-CENTRASUR',
  'G231-PORTALES',
  'G232-PASEO CAYALÁ',
  'G233-CENTRA NORTE',
  'G234-ANTIGUA',
  'G235-LAS PUERTAS SAN LUCAS',
  'G236-CHIMALTENANGO',
  'G237-PANAJACHEL',
  'G238-DEMOCRACIA',
  'G239-PRADERA XELA',
  'G240-QUETZALTENANGO CENTRO',
  'G241-COATEPEQUE',
  'G242-HUEHUETENANGO',
  'G243-MALACATÁN',
  'G244-SAN MARCOS',
  'G245-EDEN UMAN',
  'G246-SAN PEDRO SAN MARCOS',
  'G247-MAZATENANGO PLAZA AMÉRICAS',
  'G248-MAZATENANGO CENTENARIO',
  'G249-SAN ANTONIO SUCHITEPÉQUEZ',
  'G251-TRINIDAD RETALHULEU',
  'G252-ESCUINTLA',
  'G254-PUERTO SAN JOSÉ',
  'G255-SANTA LUCÍA COTZUMALGUAPA',
  'G256-LA GOMERA',
  'G257-BARBERENA',
  'G258-CUILAPA',
  'G259-CHIQUIMULILLA',
  'G260-ASUNCIÓN MITA',
  'G261-JUTIAPA',
  'G262-JALAPA',
  'G263-PRADERA CHIQUIMULA',
  'G264-ESQUIPULAS',
  'G265-GUASTATOYA',
  'G266-SANARATE',
  'G267-GUALÁN',
  'G268-TECULUTÁN',
  'G269-ZACAPA',
  'G26H-PASEO ANTIGUA',
  'G270-COBÁN',
  'G271-PALENCIA',
  'G272-PLAZA MAGDALENA',
  'G273-SALAMÁ',
  'G274-SANTA CRUZ DEL QUICHÉ',
  'G277-MORALES',
  'G278-PRADERA PUERTO BARRIOS',
  'G279-POPTÚN',
  'G27A-INTERPLAZA',
  'G27B-SPARTANS MALL',
  'G27M-PRADERA VISTARES',
  'G27R-LA PERLA',
  'G27S-TOTONICAPÁN',
  'G27T-EL ESTOR',
  'G280-MAYA MALL',
  'G288-METROCENTRO',
  'G289-SANTA ANA',
  'G290-BOSQUES DE SAN NICOLÁS',
  'G291-MEGA 6',
  'GRUPO LC',
  'GRUPO MONGE',
  'HEYWA',
  'INVERSIONES BERTINO',
  'LIFE ONE',
  'MAX DISTELSA',
  'MILENIUM',
  'MOVI IMPORT',
  'MULTIMARCA',
  'N/A',
  'OPERACIONES TÉCNICAS',
  'PUNTO NARANJA',
  'RAMA-MAJICAL',
  'SERVITOTAL',
  'SHALOM',
  'TARJETAZO',
  'TCL - B2B',
  'TDG',
  'XIAOMI CHIMALTENANGO',
  'XIAOMI HUEHUETENGANGO',
  'XIAOMI MIRAFLORES',
  'XIAOMI NARANJO',
  'XIAOMI OAKLAND',
  'XIAOMI PORTALES',
  'XIAOMI PRADERA CHIQUIMULA',
  'XIAOMI PRADERA ESCUINTLA',
  'XIAOMI VISTARES',
  'XIAOMI XELA',
];

export async function GET() {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  if (!apiKey) {
    return NextResponse.json({ origins: ORIGINS_LIST, source: 'static' });
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // ── Intentar endpoints de directorio de Orderry ───────────────────────────
  // Solo se aceptan respuestas que devuelvan nombres con letras (no fechas ni IDs)
  const isValidAgencyName = (s: string) =>
    s.length >= 3 && s.length < 80 && /[A-Za-záéíóúÁÉÍÓÚñÑ]/.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s);

  const endpoints = [
    `${baseUrl}/v2/references`,
    `${baseUrl}/v2/book-entries`,
    `${baseUrl}/v2/directories`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${endpoint}?limit=200&page=1`, { cache: 'no-store', headers });
      if (!res.ok) continue;
      const data = await res.json();

      const items: Record<string, any>[] = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      if (items.length === 0) continue;

      // Filter to ORIGEN category if the field exists
      const origenItems = items.filter((i) =>
        String(i?.category ?? i?.group ?? i?.book ?? '').toUpperCase().includes('ORIGEN'),
      );
      const pool = origenItems.length > 0 ? origenItems : items;

      const names = pool
        .map((i) => String(i?.name ?? i?.title ?? i?.value ?? '').trim())
        .filter(isValidAgencyName)
        .sort((a, b) => a.localeCompare(b, 'es'));

      if (names.length >= 5) {
        return NextResponse.json({ origins: names, source: endpoint });
      }
    } catch {
      continue;
    }
  }

  // ── Fallback estático (lista confirmada del screenshot) ────────────────────
  return NextResponse.json({ origins: ORIGINS_LIST, source: 'static' });
}
