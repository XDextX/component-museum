import type { SORT_ICON } from '../../lib/events';

export type Row = Record<string, any>;

export interface TableQuery {
    /** Free text, matched case-insensitively against every cell of a row. */
    search: string;
    /** Per column, the values a row may hold (a row passes a column when its value is one of them). */
    columns: [key: string, values: string[]][];
    /** Per column, its sort state; columns left at DEFAULT do not sort. */
    sort: Map<string, keyof typeof SORT_ICON>;
}

/** A cell as the filter options list it (the same `|| ''` rule as the options). */
const cell = (row: Row, key: string) => String(row[key] || '');

/** Numbers compare as numbers, anything else as text with numeric runs in order. */
function compare(a: unknown, b: unknown): number {
    const [x, y] = [Number(a), Number(b)];
    if (a !== '' && b !== '' && a != null && b != null && Number.isFinite(x) && Number.isFinite(y)) return x - y;
    return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
}

/**
 * The rows a table shows for a query: filtered by search and column values, then sorted.
 * @param data every row, not mutated
 * @param query the search text, column filters and sort states
 * @returns the matching rows in display order
 */
export function queryRows(data: Row[], query: TableQuery): Row[] {
    const needle = query.search.trim().toLowerCase();
    const rows = data.filter((row) =>
        (!needle || Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(needle))) &&
        query.columns.every(([key, values]) => values.includes(cell(row, key))),
    );
    const sorts = [...query.sort].filter(([, dir]) => dir !== 'DEFAULT');
    if (!sorts.length) return rows;
    return rows.sort((a, b) => {
        for (const [key, dir] of sorts) {
            const c = compare(a[key], b[key]);
            if (c) return dir === 'UP' ? c : -c;
        }
        return 0;
    });
}
