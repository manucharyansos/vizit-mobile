import { normalizeList } from './normalize';

/** Request numeric pages on the same endpoint; never follow a response URL with auth headers. */
export async function collectPages<T extends { id: number }>(fetchPage: (page: number) => Promise<unknown>, aliases: string[] = []): Promise<T[]> {
  const records = new Map<number, T>();
  let lastPage = 1;
  for (let page = 1; page <= lastPage; page++) {
    const payload = await fetchPage(page) as { last_page?: number; meta?: { last_page?: number } };
    const advertised = Number(payload.last_page ?? payload.meta?.last_page ?? 1);
    if (!Number.isInteger(advertised) || advertised < 1 || advertised > 10_000) throw new Error('Invalid pagination');
    lastPage = advertised;
    const rows = normalizeList<T>(payload, aliases);
    if (!rows.length && page < lastPage) throw new Error('Incomplete list');
    for (const row of rows) records.set(row.id, row);
  }
  return [...records.values()];
}
