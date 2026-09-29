'use client';

/** Patrones CODE128 (valores 0–106). Cada dígito es el ancho de barra o espacio. */
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
] as const;

const START_B = 104;
const STOP = 106;
const QUIET = 10;

export function encodeCode128B(value: string): number[] {
  const symbols = [START_B];
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) {
      throw new Error(`CODE128-B no admite el carácter ${char}`);
    }
    symbols.push(code - 32);
  }
  let checksum = symbols[0] ?? START_B;
  for (let index = 1; index < symbols.length; index += 1) {
    checksum += (symbols[index] ?? 0) * index;
  }
  symbols.push(checksum % 103);
  symbols.push(STOP);
  return symbols;
}

export function code128BarRuns(value: string): { x: number; width: number; total: number }[] {
  const runs: { x: number; width: number; total: number }[] = [];
  let cursor = QUIET;
  for (const symbol of encodeCode128B(value)) {
    const pattern = CODE128_PATTERNS[symbol];
    if (!pattern) continue;
    let ink = true;
    for (const digit of pattern) {
      const width = Number(digit);
      if (ink) runs.push({ x: cursor, width, total: 0 });
      cursor += width;
      ink = !ink;
    }
  }
  const total = cursor + QUIET;
  return runs.map((run) => ({ ...run, total }));
}

type BarcodeCode128Props = {
  value: string;
  className?: string;
};

export function BarcodeCode128({ value, className }: BarcodeCode128Props) {
  const runs = code128BarRuns(value);
  const total = runs[0]?.total ?? QUIET * 2;
  return (
    <svg
      viewBox={`0 0 ${total} 48`}
      className={className}
      role="img"
      aria-label={`Código de barras ${value}`}
      shapeRendering="crispEdges"
    >
      <rect width={total} height="48" fill="#ffffff" />
      {runs.map((run) => (
        <rect key={`${run.x}-${run.width}`} x={run.x} y="0" width={run.width} height="48" fill="#000000" />
      ))}
    </svg>
  );
}
