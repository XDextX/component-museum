import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queryRows, type TableQuery } from './tableQuery.ts';

// Run with: node --test packages/astro/src/components/Table/tableQuery.test.ts (Node 22.18+ or 23).

const data = [
    { name: 'Bea', role: 'Dev', age: 9 },
    { name: 'Ana', role: 'Ops', age: 30 },
    { name: 'Cy', role: 'Dev', age: 100 },
];
const q = (over: Partial<TableQuery> = {}): TableQuery => ({ search: '', columns: [], sort: new Map(), ...over });
const names = (rows: { name: string }[]) => rows.map((r) => r.name);

test('no query returns every row in order', () => assert.deepEqual(names(queryRows(data, q()) as any), ['Bea', 'Ana', 'Cy']));
test('search matches any cell, ignoring case', () => assert.deepEqual(names(queryRows(data, q({ search: ' OPS ' })) as any), ['Ana']));
test('a column filter keeps rows holding one of its values', () => assert.deepEqual(names(queryRows(data, q({ columns: [['role', ['Dev']]] })) as any), ['Bea', 'Cy']));
test('two filters both apply', () => assert.deepEqual(names(queryRows(data, q({ search: 'bea', columns: [['role', ['Dev']]] })) as any), ['Bea']));
test('sort UP and DOWN, numbers as numbers', () => {
    assert.deepEqual(names(queryRows(data, q({ sort: new Map([['age', 'UP']]) })) as any), ['Bea', 'Ana', 'Cy']);
    assert.deepEqual(names(queryRows(data, q({ sort: new Map([['age', 'DOWN']]) })) as any), ['Cy', 'Ana', 'Bea']);
});
test('DEFAULT does not sort, and the input is not mutated', () => {
    const copy = structuredClone(data);
    assert.deepEqual(names(queryRows(data, q({ sort: new Map([['name', 'DEFAULT']]) })) as any), ['Bea', 'Ana', 'Cy']);
    queryRows(data, q({ sort: new Map([['name', 'UP']]) }));
    assert.deepEqual(data, copy);
});
test('a second sort column breaks ties', () => {
    const rows = queryRows(data, q({ sort: new Map([['role', 'UP'], ['name', 'DOWN']]) }));
    assert.deepEqual(names(rows as any), ['Cy', 'Bea', 'Ana']);
});
