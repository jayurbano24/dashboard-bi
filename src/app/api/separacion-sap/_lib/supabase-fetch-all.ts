/** Supabase/PostgREST devuelve como máximo 1000 filas por request (salvo range explícito). */
export const SUPABASE_MAX_ROWS_PER_PAGE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_MAX_ROWS_PER_PAGE - 1;
    const { data, error } = await Promise.resolve(fetchPage(from, to));
    if (error) throw new Error(error.message);

    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < SUPABASE_MAX_ROWS_PER_PAGE) break;
    from += SUPABASE_MAX_ROWS_PER_PAGE;
  }

  return all;
}
